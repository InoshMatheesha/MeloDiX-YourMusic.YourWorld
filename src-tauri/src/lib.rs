use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};

const DEFAULT_PORT: u16 = 38472;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

struct AppState {
    token: String,
    child: Mutex<Option<std::process::Child>>,
    port: Arc<Mutex<Option<u16>>>,
    // Set by check_for_updates, read by update_action.
    update_info: Mutex<Option<serde_json::Value>>,
    // Set once update_action finishes downloading; read by install_update_now.
    installer_path: Mutex<Option<PathBuf>>,
}

// ---------- paths ----------

fn data_dir() -> PathBuf {
    // Mirror sidecar's shared/platform.js: %LOCALAPPDATA%\Moodex on Windows.
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        if !local.trim().is_empty() {
            return PathBuf::from(local).join("Moodex");
        }
    }
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Moodex")
}

fn config_path() -> PathBuf {
    data_dir().join("config.json")
}

fn read_config() -> serde_json::Value {
    std::fs::read_to_string(config_path())
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_else(|| serde_json::json!({}))
}

fn write_config(cfg: &serde_json::Value) {
    let dir = data_dir();
    let _ = std::fs::create_dir_all(&dir);
    if let Ok(s) = serde_json::to_string_pretty(cfg) {
        let _ = std::fs::write(config_path(), s);
    }
}

fn storage_path() -> PathBuf {
    data_dir().join("storage.json")
}

fn read_storage_value() -> serde_json::Value {
    std::fs::read_to_string(storage_path())
        .ok()
        .and_then(|s| {
            let t = s.trim().to_string();
            if t.is_empty() {
                None
            } else {
                serde_json::from_str::<serde_json::Value>(&t).ok()
            }
        })
        .unwrap_or(serde_json::Value::Null)
}

// ---------- desktop settings (tray, startup, window) ----------

fn desktop_path() -> PathBuf {
    data_dir().join("melodix-desktop.json")
}

fn read_desktop() -> serde_json::Value {
    std::fs::read_to_string(desktop_path())
        .ok()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .filter(|v| v.is_object())
        .unwrap_or_else(|| serde_json::json!({}))
}

fn write_desktop(cfg: &serde_json::Value) {
    let _ = std::fs::create_dir_all(data_dir());
    if let Ok(s) = serde_json::to_string_pretty(cfg) {
        let _ = std::fs::write(desktop_path(), s);
    }
}

/// Close-to-tray and window memory are on by default; the rest start off.
fn desktop_flag(key: &str) -> bool {
    read_desktop()
        .get(key)
        .and_then(|v| v.as_bool())
        .unwrap_or(matches!(key, "trayOnClose" | "rememberWindow"))
}

#[cfg(windows)]
const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
#[cfg(windows)]
const RUN_NAME: &str = "MelodixTauri";

#[cfg(windows)]
fn autostart_enabled() -> bool {
    use winreg::{enums::HKEY_CURRENT_USER, RegKey};
    RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(RUN_KEY)
        .and_then(|k| k.get_value::<String, _>(RUN_NAME))
        .is_ok()
}

#[cfg(windows)]
fn set_autostart(on: bool) -> bool {
    use winreg::{enums::HKEY_CURRENT_USER, RegKey};
    let Ok((key, _)) = RegKey::predef(HKEY_CURRENT_USER).create_subkey(RUN_KEY) else {
        return false;
    };
    if !on {
        let _ = key.delete_value(RUN_NAME);
        return true;
    }
    let Ok(exe) = std::env::current_exe() else {
        return false;
    };
    let cmd = format!("\"{}\" --autostart", strip_verbatim(exe).display());
    key.set_value(RUN_NAME, &cmd).is_ok()
}

#[cfg(not(windows))]
fn autostart_enabled() -> bool {
    false
}

#[cfg(not(windows))]
fn set_autostart(_on: bool) -> bool {
    false
}

/// Remember size, position and maximized state for the next launch.
fn save_geometry(w: &tauri::WebviewWindow) {
    if !desktop_flag("rememberWindow")
        || w.is_minimized().unwrap_or(false)
        || !w.is_visible().unwrap_or(true)
    {
        return;
    }
    let mut cfg = read_desktop();
    let maximized = w.is_maximized().unwrap_or(false);
    cfg["maximized"] = serde_json::Value::Bool(maximized);
    if !maximized {
        if let (Ok(p), Ok(s)) = (w.outer_position(), w.inner_size()) {
            cfg["window"] = serde_json::json!({ "x": p.x, "y": p.y, "w": s.width, "h": s.height });
        }
    }
    write_desktop(&cfg);
}

/// Put the window back where it was, but only onto a monitor that still exists.
fn restore_geometry(w: &tauri::WebviewWindow) -> bool {
    let cfg = read_desktop();
    if !desktop_flag("rememberWindow") {
        return false;
    }
    if let Some(g) = cfg.get("window") {
        let num = |k: &str| g.get(k).and_then(|v| v.as_i64());
        if let (Some(x), Some(y), Some(width), Some(height)) = (num("x"), num("y"), num("w"), num("h")) {
            if width >= 600 && height >= 400 {
                let _ = w.set_size(tauri::PhysicalSize::new(width as u32, height as u32));
                let (x, y) = (x as i32, y as i32);
                let on_screen = w
                    .available_monitors()
                    .map(|ms| {
                        ms.iter().any(|m| {
                            let (p, s) = (m.position(), m.size());
                            x + 60 >= p.x
                                && y + 10 >= p.y
                                && x + 60 < p.x + s.width as i32
                                && y + 10 < p.y + s.height as i32
                        })
                    })
                    .unwrap_or(false);
                if on_screen {
                    let _ = w.set_position(tauri::PhysicalPosition::new(x, y));
                }
            }
        }
    }
    cfg.get("maximized").and_then(|v| v.as_bool()).unwrap_or(false)
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn toggle_main(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        if w.is_visible().unwrap_or(false) && !w.is_minimized().unwrap_or(false) {
            save_geometry(&w);
            let _ = w.hide();
        } else {
            show_main(app);
        }
    }
}

fn kill_sidecar(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<AppState>() {
        if let Some(mut child) = state.child.lock().unwrap().take() {
            let _ = child.kill();
        }
    }
}

fn quit_app(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        save_geometry(&w);
    }
    kill_sidecar(app);
    app.exit(0);
}

fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show Melodix", true, None::<&str>)?;
    let play = MenuItem::with_id(app, "play-pause", "Play / Pause", true, None::<&str>)?;
    let next = MenuItem::with_id(app, "next", "Next", true, None::<&str>)?;
    let prev = MenuItem::with_id(app, "prev", "Previous", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Melodix", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &show,
            &PredefinedMenuItem::separator(app)?,
            &play,
            &next,
            &prev,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;
    let mut tray = TrayIconBuilder::with_id("main")
        .tooltip("Melodix")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main(app),
            "quit" => quit_app(app),
            action => {
                let _ = app.emit("media-control", action.to_string());
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_main(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

/// Turn off WebView2's browser shortcuts (F5 reload, Ctrl+P print, Ctrl+F find, zoom keys).
#[cfg(windows)]
fn disable_browser_keys(win: &tauri::WebviewWindow) {
    let _ = win.with_webview(|wv| unsafe {
        use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Settings3;
        use windows_core::Interface;
        if let Ok(core) = wv.controller().CoreWebView2() {
            if let Ok(settings) = core.Settings() {
                if let Ok(s3) = settings.cast::<ICoreWebView2Settings3>() {
                    let _ = s3.SetAreBrowserAcceleratorKeysEnabled(false);
                }
            }
        }
    });
}

#[cfg(not(windows))]
fn disable_browser_keys(_win: &tauri::WebviewWindow) {}

fn launch_log(msg: &str) {
    let dir = data_dir();
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join("melodix-launch.log");
    use std::io::Write;
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(f, "{msg}");
    }
}

/// Candidate `sidecar/` roots, most-specific first: bundled resources, the
/// folder next to the executable, then the dev tree next to the Cargo manifest.
fn sidecar_roots(app: &tauri::AppHandle) -> Vec<PathBuf> {
    let mut roots = Vec::new();
    if let Ok(res) = app.path().resource_dir() {
        roots.push(res.join("sidecar"));
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            roots.push(dir.join("sidecar"));
        }
    }
    roots.push(
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("sidecar"),
    );
    roots
}

/// Strip a Windows verbatim (`\\?\`) prefix. Node.js cannot resolve its main
/// script or `require()` targets from a verbatim path (it fails with
/// `EISDIR ... lstat 'D:'`), so paths handed to the sidecar must be plain.
fn strip_verbatim(p: PathBuf) -> PathBuf {
    let s = p.to_string_lossy();
    match s.strip_prefix(r"\\?\UNC\") {
        Some(rest) => PathBuf::from(format!(r"\\{rest}")),
        None => match s.strip_prefix(r"\\?\") {
            Some(rest) => PathBuf::from(rest),
            None => p,
        },
    }
}

/// Resolve a path inside the first `sidecar/` root that actually contains it.
fn sidecar_path(app: &tauri::AppHandle, rel: &str) -> PathBuf {
    for root in sidecar_roots(app) {
        let p = root.join(rel);
        if p.exists() {
            return strip_verbatim(p);
        }
    }
    // Fall back to the dev tree path even if missing (so logs show the attempt).
    strip_verbatim(
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("sidecar")
            .join(rel),
    )
}

// ---------- node sidecar ----------

/// Parse the listening port out of a sidecar stdout line such as
/// "devsize internal server running on http://127.0.0.1:38472".
fn parse_port(line: &str) -> Option<u16> {
    let marker = "127.0.0.1:";
    let idx = line.find(marker)? + marker.len();
    let digits: String = line[idx..].chars().take_while(|c| c.is_ascii_digit()).collect();
    digits.parse::<u16>().ok()
}

fn spawn_sidecar(
    app: &tauri::AppHandle,
    token: &str,
    port_slot: Arc<Mutex<Option<u16>>>,
) -> Option<std::process::Child> {
    let node = sidecar_path(app, "runtime/node.exe");
    let server = sidecar_path(app, "server/server.js");
    launch_log(&format!(
        "[melodix] resolving sidecar\n  node   = {:?} (exists={})\n  server = {:?} (exists={})",
        node,
        node.exists(),
        server,
        server.exists()
    ));
    if !node.exists() {
        launch_log(&format!("[melodix] ERROR: node.exe not found at {:?}", node));
    }
    if !server.exists() {
        launch_log(&format!("[melodix] ERROR: server.js not found at {:?}", server));
    }
    let mut cmd = std::process::Command::new(&node);
    cmd.arg(&server);
    cmd.env("MOODEX_TOKEN", token);
    cmd.env("MOODEX_SIDECAR", "1");
    cmd.env("NODE_ENV", "production");
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    match cmd.spawn() {
        Ok(mut child) => {
            launch_log(&format!("[melodix] sidecar started (pid {})", child.id()));
            if let Some(out) = child.stdout.take() {
                let app = app.clone();
                let slot = port_slot;
                std::thread::spawn(move || {
                    let reader = BufReader::new(out);
                    for line in reader.lines().map_while(Result::ok) {
                        if let Some(p) = parse_port(&line) {
                            *slot.lock().unwrap() = Some(p);
                            let _ = app.emit("server-ready", p);
                            launch_log(&format!("[melodix] sidecar listening on port {p}"));
                        }
                    }
                });
            }
            if let Some(err) = child.stderr.take() {
                std::thread::spawn(move || {
                    let reader = BufReader::new(err);
                    for line in reader.lines().map_while(Result::ok) {
                        eprintln!("[melodix:sidecar] {line}");
                    }
                });
            }
            Some(child)
        }
        Err(e) => {
            launch_log(&format!("[melodix] failed to start sidecar: {e}"));
            None
        }
    }
}

// ---------- commands ----------

#[tauri::command]
async fn get_server_port(state: tauri::State<'_, AppState>) -> Result<u16, ()> {
    // Wait up to ~10s for the sidecar to announce its listening port.
    let slot = state.port.clone();
    for _ in 0..100 {
        if let Some(p) = *slot.lock().unwrap() {
            return Ok(p);
        }
        let _ = tauri::async_runtime::spawn_blocking(|| {
            std::thread::sleep(std::time::Duration::from_millis(100))
        })
        .await;
    }
    Ok(DEFAULT_PORT)
}

#[tauri::command]
fn get_server_token(state: tauri::State<AppState>) -> String {
    state.token.clone()
}

#[tauri::command]
fn get_app_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
fn minimize_window(window: tauri::WebviewWindow) {
    if desktop_flag("minimizeToTray") {
        save_geometry(&window);
        let _ = window.hide();
    } else {
        let _ = window.minimize();
    }
}

/// Real WebView2 zoom (CSS zoom on <body> left gaps and let the page scroll).
#[tauri::command]
fn set_zoom(window: tauri::WebviewWindow, factor: f64) {
    if factor.is_finite() && (0.3..=3.0).contains(&factor) {
        let _ = window.set_zoom(factor);
    }
}

#[tauri::command]
fn get_desktop_settings() -> serde_json::Value {
    serde_json::json!({
        "trayOnClose": desktop_flag("trayOnClose"),
        "minimizeToTray": desktop_flag("minimizeToTray"),
        "startMinimized": desktop_flag("startMinimized"),
        "rememberWindow": desktop_flag("rememberWindow"),
        "multiInstance": desktop_flag("multiInstance"),
        "launchAtStartup": autostart_enabled(),
    })
}

#[tauri::command]
fn set_desktop_setting(key: String, value: bool) -> serde_json::Value {
    const KEYS: [&str; 5] = ["trayOnClose", "minimizeToTray", "startMinimized", "rememberWindow", "multiInstance"];
    if key == "launchAtStartup" {
        set_autostart(value);
    } else if KEYS.contains(&key.as_str()) {
        let mut cfg = read_desktop();
        cfg[key.as_str()] = serde_json::Value::Bool(value);
        write_desktop(&cfg);
    }
    get_desktop_settings()
}

#[tauri::command]
fn set_tray_tooltip(app: tauri::AppHandle, text: String) {
    if let Some(tray) = app.tray_by_id("main") {
        let tip = if text.trim().is_empty() { "Melodix".to_string() } else { text };
        let _ = tray.set_tooltip(Some(tip));
    }
}

#[tauri::command]
fn toggle_maximize(window: tauri::WebviewWindow) {
    match window.is_maximized() {
        Ok(true) => {
            let _ = window.unmaximize();
        }
        _ => {
            let _ = window.maximize();
        }
    }
}

#[tauri::command]
fn close_window(window: tauri::WebviewWindow) {
    let _ = window.close();
}

#[tauri::command]
fn start_drag(window: tauri::WebviewWindow) {
    let _ = window.start_dragging();
}

#[tauri::command]
fn restart_app(app: tauri::AppHandle) {
    app.restart();
}

#[tauri::command]
fn open_external(url: String) {
    let _ = open::that(url);
}

#[tauri::command]
fn open_folder(path: String) {
    let p = if path.is_empty() {
        data_dir()
    } else {
        PathBuf::from(path)
    };
    let _ = std::fs::create_dir_all(&p);
    let _ = open::that(p);
}

#[tauri::command]
fn get_default_music_dir() -> String {
    dirs::audio_dir()
        .or_else(dirs::home_dir)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default()
}

#[tauri::command]
fn get_data_dir() -> String {
    data_dir().to_string_lossy().to_string()
}

#[tauri::command]
fn set_data_dir(dir: String) -> String {
    let mut cfg = read_config();
    if dir.trim().is_empty() {
        if let Some(obj) = cfg.as_object_mut() {
            obj.remove("dataDir");
        }
    } else {
        cfg["dataDir"] = serde_json::Value::String(dir.clone());
    }
    write_config(&cfg);
    dir
}

#[tauri::command]
fn get_download_dir() -> String {
    read_config()
        .get("downloadDir")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string()
}

#[tauri::command]
fn set_download_dir(dir: Option<String>, reset: Option<bool>) -> String {
    let mut cfg = read_config();
    if reset.unwrap_or(false) || dir.as_deref().unwrap_or("").trim().is_empty() {
        if let Some(obj) = cfg.as_object_mut() {
            obj.remove("downloadDir");
        }
        write_config(&cfg);
        return String::new();
    }
    let d = dir.unwrap();
    cfg["downloadDir"] = serde_json::Value::String(d.clone());
    write_config(&cfg);
    d
}

fn dir_size(path: &Path) -> u64 {
    let mut total = 0u64;
    if let Ok(entries) = std::fs::read_dir(path) {
        for e in entries.flatten() {
            let p = e.path();
            if p.is_dir() {
                total += dir_size(&p);
            } else if let Ok(m) = e.metadata() {
                total += m.len();
            }
        }
    }
    total
}

#[tauri::command]
fn get_cache_size() -> u64 {
    let base = data_dir();
    let mut total = 0u64;
    for sub in ["tracks", "thumbnails", "lyrics"] {
        total += dir_size(&base.join(sub));
    }
    total
}

#[tauri::command]
fn clear_cache() -> bool {
    let base = data_dir();
    for sub in ["tracks", "thumbnails"] {
        let p = base.join(sub);
        if p.exists() {
            let _ = std::fs::remove_dir_all(&p);
            let _ = std::fs::create_dir_all(&p);
        }
    }
    true
}

#[tauri::command]
fn storage_save(data: serde_json::Value) -> bool {
    if !data.is_object() {
        return false;
    }
    let dir = data_dir();
    let _ = std::fs::create_dir_all(&dir);
    let path = storage_path();
    let tmp = path.with_extension("json.tmp");
    if let Ok(s) = serde_json::to_string_pretty(&data) {
        if std::fs::write(&tmp, s).is_ok() && std::fs::rename(&tmp, &path).is_ok() {
            return true;
        }
    }
    false
}

#[tauri::command]
fn get_diagnostics(app: tauri::AppHandle) -> serde_json::Value {
    serde_json::json!({
        "app": "Melodix",
        "version": app.package_info().version.to_string(),
        "runtime": "tauri",
        "webview": "WebView2",
        "dataDir": data_dir().to_string_lossy().to_string(),
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    })
}

#[tauri::command]
async fn pick_files(audio_only: Option<bool>) -> Vec<String> {
    let mut dlg = rfd::AsyncFileDialog::new();
    if audio_only.unwrap_or(true) {
        dlg = dlg.add_filter(
            "Audio",
            &["mp3", "m4a", "aac", "flac", "wav", "ogg", "opus", "wma", "aiff", "alac"],
        );
    }
    match dlg.pick_files().await {
        Some(files) => files
            .into_iter()
            .map(|f| f.path().to_string_lossy().to_string())
            .collect(),
        None => Vec::new(),
    }
}

#[tauri::command]
async fn pick_folder() -> String {
    match rfd::AsyncFileDialog::new().pick_folder().await {
        Some(d) => d.path().to_string_lossy().to_string(),
        None => String::new(),
    }
}

#[tauri::command]
async fn save_file(default_name: Option<String>, contents: String) -> bool {
    let mut dlg = rfd::AsyncFileDialog::new();
    if let Some(name) = default_name {
        dlg = dlg.set_file_name(name);
    }
    if let Some(handle) = dlg.save_file().await {
        return std::fs::write(handle.path(), contents).is_ok();
    }
    false
}

// ---------- updates ----------

const UPDATE_REPO: &str = "InoshMatheesha/MeloDiX-YourMusic.YourWorld";

// Same rule as the renderer's isNewerVersion: compare dotted numeric parts.
fn version_newer(latest: &str, current: &str) -> bool {
    let parts = |s: &str| -> Vec<u64> {
        s.trim_start_matches(|c: char| c == 'v' || c == 'V')
            .split('.')
            .map(|p| p.parse::<u64>().unwrap_or(0))
            .collect()
    };
    let (a, b) = (parts(latest), parts(current));
    for i in 0..a.len().max(b.len()) {
        let (x, y) = (a.get(i).copied().unwrap_or(0), b.get(i).copied().unwrap_or(0));
        if x != y {
            return x > y;
        }
    }
    false
}

// Windows x64 NSIS installer only; that's the only target this app builds.
fn find_installer_asset(release: &serde_json::Value) -> Option<(String, String)> {
    release.get("assets")?.as_array()?.iter().find_map(|a| {
        let name = a.get("name")?.as_str()?;
        if name.ends_with("-setup.exe") {
            let url = a.get("browser_download_url")?.as_str()?.to_string();
            Some((url, name.to_string()))
        } else {
            None
        }
    })
}

fn fetch_latest_release() -> Result<serde_json::Value, String> {
    let url = format!("https://api.github.com/repos/{UPDATE_REPO}/releases/latest");
    let res = ureq::get(&url)
        .set("User-Agent", "Melodix-Updater")
        .timeout(std::time::Duration::from_secs(12))
        .call()
        .map_err(|e| e.to_string())?;
    res.into_json::<serde_json::Value>().map_err(|e| e.to_string())
}

/// Checks GitHub for a newer release and emits the event the renderer listens for:
/// update-available / update-not-available / update-error. Never returns an error
/// itself so the shim's checkForUpdates() always resolves; the real result travels
/// as an event, same shape the Electron build used.
#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<(), ()> {
    let current = app.package_info().version.to_string();
    let result = tauri::async_runtime::spawn_blocking(fetch_latest_release)
        .await
        .map_err(|e| e.to_string())
        .and_then(|r| r);

    match result {
        Ok(release) => {
            let tag = release.get("tag_name").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let version = tag.trim_start_matches(['v', 'V']).to_string();
            if version_newer(&version, &current) {
                let asset = find_installer_asset(&release);
                let info = serde_json::json!({
                    "version": version,
                    "releaseNotes": release.get("body").and_then(|v| v.as_str()).unwrap_or(""),
                    "publishedAt": release.get("published_at").and_then(|v| v.as_str()).unwrap_or(""),
                    "htmlUrl": release.get("html_url").and_then(|v| v.as_str()).unwrap_or(""),
                    "assetUrl": asset.as_ref().map(|a| a.0.clone()).unwrap_or_default(),
                    "assetName": asset.as_ref().map(|a| a.1.clone()).unwrap_or_default(),
                    "canInstall": asset.is_some(),
                });
                *state.update_info.lock().unwrap() = Some(info.clone());
                let _ = app.emit("update-available", info);
            } else {
                let _ = app.emit("update-not-available", ());
            }
        }
        Err(e) => {
            launch_log(&format!("[melodix] update check failed: {e}"));
            let _ = app.emit("update-error", serde_json::json!({ "message": e }));
        }
    }
    Ok(())
}

/// Same check as the check_for_updates command, run from a plain thread at
/// startup. Silent on both outcomes - no update-not-available / update-error
/// events here, so a background miss never pops up a toast of its own.
fn background_check_for_updates(app: &tauri::AppHandle) {
    let current = app.package_info().version.to_string();
    let Ok(release) = fetch_latest_release() else { return };
    let tag = release.get("tag_name").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let version = tag.trim_start_matches(['v', 'V']).to_string();
    if !version_newer(&version, &current) {
        return;
    }
    let asset = find_installer_asset(&release);
    let info = serde_json::json!({
        "version": version,
        "releaseNotes": release.get("body").and_then(|v| v.as_str()).unwrap_or(""),
        "publishedAt": release.get("published_at").and_then(|v| v.as_str()).unwrap_or(""),
        "htmlUrl": release.get("html_url").and_then(|v| v.as_str()).unwrap_or(""),
        "assetUrl": asset.as_ref().map(|a| a.0.clone()).unwrap_or_default(),
        "assetName": asset.as_ref().map(|a| a.1.clone()).unwrap_or_default(),
        "canInstall": asset.is_some(),
    });
    if let Some(state) = app.try_state::<AppState>() {
        *state.update_info.lock().unwrap() = Some(info.clone());
    }
    let _ = app.emit("update-available", info);
}

fn download_with_progress(app: &tauri::AppHandle, url: &str, dest: &Path) -> Result<(), String> {
    let res = ureq::get(url)
        .set("User-Agent", "Melodix-Updater")
        .timeout(std::time::Duration::from_secs(120))
        .call()
        .map_err(|e| e.to_string())?;
    let total: u64 = res.header("Content-Length").and_then(|v| v.parse().ok()).unwrap_or(0);
    let mut reader = res.into_reader();
    let mut file = std::fs::File::create(dest).map_err(|e| e.to_string())?;
    let mut buf = [0u8; 64 * 1024];
    let mut done: u64 = 0;
    let mut last_pct = u8::MAX;
    loop {
        let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        file.write_all(&buf[..n]).map_err(|e| e.to_string())?;
        done += n as u64;
        if total > 0 {
            let pct = ((done * 100) / total).min(100) as u8;
            if pct != last_pct {
                last_pct = pct;
                let _ = app.emit("update-progress", serde_json::json!({ "percent": pct }));
            }
        }
    }
    Ok(())
}

/// "now": downloads the installer in the background, reporting update-progress,
/// then emits update-ready (installUpdateNow runs it) or update-error.
/// "later": nothing to do - the Home pill already stays up on its own.
#[tauri::command]
async fn update_action(app: tauri::AppHandle, state: tauri::State<'_, AppState>, action: String) -> Result<(), ()> {
    if action != "now" {
        return Ok(());
    }
    let info = state.update_info.lock().unwrap().clone();
    let Some(info) = info else {
        let _ = app.emit("update-error", serde_json::json!({ "message": "no update to install" }));
        return Ok(());
    };
    let asset_url = info.get("assetUrl").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let asset_name = info.get("assetName").and_then(|v| v.as_str()).unwrap_or("melodix-setup.exe").to_string();
    if asset_url.is_empty() {
        let _ = app.emit("update-error", serde_json::json!({ "message": "no installer in this release" }));
        return Ok(());
    }

    let dest = std::env::temp_dir().join(format!("melodix-update-{}", asset_name));
    let app2 = app.clone();
    let dest2 = dest.clone();
    let result = tauri::async_runtime::spawn_blocking(move || download_with_progress(&app2, &asset_url, &dest2))
        .await
        .map_err(|e| e.to_string())
        .and_then(|r| r);

    match result {
        Ok(()) => {
            *state.installer_path.lock().unwrap() = Some(dest);
            let _ = app.emit("update-ready", info);
        }
        Err(e) => {
            launch_log(&format!("[melodix] update download failed: {e}"));
            let _ = std::fs::remove_file(&dest);
            let _ = app.emit("update-error", serde_json::json!({ "message": e }));
        }
    }
    Ok(())
}

/// Runs the downloaded installer silently and relaunches Melodix once it's done,
/// via a detached helper that outlives this process (installer.exe can't
/// overwrite melodix.exe while this process still has it open).
#[tauri::command]
fn install_update_now(app: tauri::AppHandle, state: tauri::State<AppState>) {
    let Some(installer) = state.installer_path.lock().unwrap().clone() else {
        let _ = app.emit("update-error", serde_json::json!({ "message": "update not downloaded yet" }));
        return;
    };
    let Ok(exe) = std::env::current_exe().map(strip_verbatim) else {
        let _ = app.emit("update-error", serde_json::json!({ "message": "could not locate Melodix.exe" }));
        return;
    };
    let pid = std::process::id();
    let script = format!(
        "Wait-Process -Id {pid} -ErrorAction SilentlyContinue; \
         Start-Process -FilePath '{inst}' -ArgumentList '/S' -Wait; \
         Start-Sleep -Milliseconds 400; \
         Start-Process -FilePath '{exe}'",
        inst = installer.to_string_lossy().replace('\'', "''"),
        exe = exe.to_string_lossy().replace('\'', "''"),
    );
    let mut cmd = std::process::Command::new("powershell.exe");
    cmd.args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &script]);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    match cmd.spawn() {
        Ok(_) => quit_app(&app),
        Err(e) => {
            launch_log(&format!("[melodix] relaunch helper failed: {e}"));
            let _ = app.emit("update-error", serde_json::json!({ "message": e.to_string() }));
        }
    }
}

// ---------- bootstrap ----------

fn make_token() -> String {
    use rand::RngCore;
    let mut buf = [0u8; 24];
    rand::thread_rng().fill_bytes(&mut buf);
    buf.iter().map(|b| format!("{:02x}", b)).collect()
}

fn boot_script(token: &str, version: &str) -> String {
    let storage = read_storage_value();
    let boot = serde_json::json!({
        "token": token,
        "port": DEFAULT_PORT,
        "version": version,
        "isWindows": cfg!(windows),
        "storage": storage,
    });
    format!("window.__MOODEX_BOOT__ = {};", boot)
}

pub fn run() {
    let token = make_token();
    let port_slot: Arc<Mutex<Option<u16>>> = Arc::new(Mutex::new(None));

    let mut builder = tauri::Builder::default();
    // A second launch just brings the running window forward (unless multiple instances are allowed).
    if !desktop_flag("multiInstance") {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main(app);
        }));
    }

    builder
        .manage(AppState {
            token: token.clone(),
            child: Mutex::new(None),
            port: port_slot.clone(),
            update_info: Mutex::new(None),
            installer_path: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            get_server_port,
            get_server_token,
            get_app_version,
            minimize_window,
            toggle_maximize,
            close_window,
            start_drag,
            restart_app,
            open_external,
            open_folder,
            get_default_music_dir,
            get_data_dir,
            set_data_dir,
            get_download_dir,
            set_download_dir,
            get_cache_size,
            clear_cache,
            storage_save,
            get_diagnostics,
            pick_files,
            pick_folder,
            save_file,
            set_zoom,
            get_desktop_settings,
            set_desktop_setting,
            set_tray_tooltip,
            check_for_updates,
            update_action,
            install_update_now,
        ])
        .setup(move |app| {
            let handle = app.handle().clone();
            let version = app.package_info().version.to_string();

            // Start the Node sidecar (search / streaming / lyrics backend).
            if let Some(child) = spawn_sidecar(&handle, &token, port_slot.clone()) {
                let state = app.state::<AppState>();
                *state.child.lock().unwrap() = Some(child);
            }

            // Build the main window with the injected bootstrap + Electron shim glue.
            let script = boot_script(&token, &version);
            let win = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::App("src/renderer/index.html".into()),
            )
            .title("Melodix")
            .inner_size(1200.0, 800.0)
            .min_inner_size(900.0, 600.0)
            .decorations(false)
            .background_color(tauri::window::Color(11, 11, 15, 255))
            .visible(false)
            .initialization_script(&script)
            .build()?;

            disable_browser_keys(&win);
            if let Err(e) = build_tray(app) {
                launch_log(&format!("[melodix] tray failed: {e}"));
            }
            // Keep the startup entry pointing at this exe if Melodix was reinstalled elsewhere.
            if autostart_enabled() {
                set_autostart(true);
            }

            // Launched by Windows at sign-in with "Start minimized" on: stay in the tray.
            let autostarted = std::env::args().any(|a| a == "--autostart");
            let start_hidden = autostarted && desktop_flag("startMinimized");
            let maximized = restore_geometry(&win);
            if !start_hidden {
                if maximized {
                    let _ = win.maximize();
                }
                let _ = win.show();
            }

            // Quiet background update check, a few seconds after launch so it
            // never competes with the sidecar for the first paint. Only the
            // Home pill reacts to it; the renderer opens the sheet itself for
            // a manual click. A plain OS thread (not async) so the 5s wait
            // costs nothing and needs no extra runtime.
            {
                let app_for_update = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(5));
                    background_check_for_updates(&app_for_update);
                });
            }

            {
                let w = win.clone();
                win.on_window_event(move |event| match event {
                    // Used by the renderer's pause-on-hide logic.
                    tauri::WindowEvent::Focused(focused) => {
                        let _ = w.emit("window-visibility", *focused);
                    }
                    tauri::WindowEvent::CloseRequested { api, .. } => {
                        save_geometry(&w);
                        if desktop_flag("trayOnClose") {
                            api.prevent_close();
                            let _ = w.hide();
                        }
                    }
                    _ => {}
                });
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Melodix")
        .run(|app_handle, event| {
            if let RunEvent::ExitRequested { .. } | RunEvent::Exit = event {
                kill_sidecar(app_handle);
            }
        });
}
