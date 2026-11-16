/*
 * Melodix — Electron-compatibility shim for Tauri.
 * Recreates window.electronAPI (the Electron preload surface) on top of the
 * Tauri runtime, so the existing renderer runs unmodified. Native features are
 * served by Rust commands; the heavy /api/* backend is served by the bundled
 * Node sidecar on 127.0.0.1:38472.
 */
(function () {
  'use strict';

  var BOOT = window.__MOODEX_BOOT__ || {};
  var TAURI = window.__TAURI__ || {};
  var core = TAURI.core || {};
  var evt = TAURI.event || {};

  function invoke(cmd, args) {
    try {
      if (core && typeof core.invoke === 'function') return core.invoke(cmd, args || {});
    } catch (e) {}
    return Promise.reject(new Error('tauri invoke unavailable: ' + cmd));
  }

  function listen(name, cb) {
    try {
      if (evt && typeof evt.listen === 'function') {
        evt.listen(name, function (e) { try { cb(e && e.payload); } catch (_) {} });
      }
    } catch (e) {}
  }

  var noop = function () {};
  var resolveTo = function (v) { return function () { return Promise.resolve(v); }; };

  var PORT = BOOT.port || 38472;
  var TOKEN = BOOT.token || '';

  var zoom = 1.0;

  var api = {
    // --- identity / bootstrap ---
    serverToken: TOKEN,
    isWindows: BOOT.isWindows !== false,
    getServerPort: function () { return invoke('get_server_port').then(function (p) { PORT = p || PORT; return PORT; }).catch(function () { return PORT; }); },

    // --- window controls ---
    minimizeWindow: function () { invoke('minimize_window'); },
    maximizeWindow: function () { invoke('toggle_maximize'); },
    closeWindow: function () { invoke('close_window'); },
    restartApp: function () { invoke('restart_app'); },

    // --- app info ---
    getAppVersion: function () { return invoke('get_app_version').catch(function () { return BOOT.version || ''; }); },
    getDiagnostics: function () { return invoke('get_diagnostics').catch(resolveTo({})); },
    getGpuCompositing: resolveTo(true),
    setAppProxy: resolveTo(true),

    // --- zoom (native WebView2 zoom, like Electron's webFrame) ---
    setZoomFactor: function (f) { zoom = f || 1.0; invoke('set_zoom', { factor: zoom }).catch(noop); },
    getZoomFactor: function () { return zoom; },
    clearWebFrameCache: noop,

    // --- file / folder pickers ---
    pickMedia: function () { return invoke('pick_files', { audioOnly: true }).catch(resolveTo([])); },
    importAudioFiles: function () { return invoke('pick_files', { audioOnly: true }).catch(resolveTo([])); },
    pickLocalFiles: function () { return invoke('pick_files', { audioOnly: true }).catch(resolveTo([])); },
    pickLocalFolder: function () { return invoke('pick_folder').catch(resolveTo('')); },
    pickScanFolder: function () { return invoke('pick_folder').catch(resolveTo('')); },
    rescanLocalMetadata: resolveTo([]),
    scanLocalFolders: resolveTo({ ok: true, tracks: [] }),
    getDefaultMusicDir: function () { return invoke('get_default_music_dir').catch(resolveTo('')); },

    // --- data / download dirs ---
    getDataDir: function () { return invoke('get_data_dir').catch(resolveTo('')); },
    pickDataDir: function () { return invoke('pick_folder').catch(resolveTo('')); },
    setDataDir: function (dir, move) { return invoke('set_data_dir', { dir: dir || '' }).catch(resolveTo(dir || '')); },
    getDownloadDir: function () { return invoke('get_download_dir').catch(resolveTo('')); },
    pickDownloadDir: function () { return invoke('pick_folder').catch(resolveTo('')); },
    setDownloadDir: function (dir) { return invoke('set_download_dir', { dir: dir || '', reset: false }).catch(resolveTo(dir || '')); },
    resetDownloadDir: function () { return invoke('set_download_dir', { reset: true }).catch(resolveTo('')); },

    // --- cache ---
    getCacheSize: function () { return invoke('get_cache_size').catch(resolveTo(0)); },
    clearCache: function () { return invoke('clear_cache').catch(resolveTo(false)); },

    // --- shell / folders ---
    openExternal: function (u) { invoke('open_external', { url: String(u || '') }); },
    openLogsFolder: function () { invoke('open_folder', { path: '' }); },
    openDownloadsFolder: function () { invoke('open_folder', { path: '' }); },
    openPluginsFolder: function () { invoke('open_folder', { path: '' }); },
    logError: function (level, message, stack) { try { console[level === 'warn' ? 'warn' : 'error']('[renderer]', message, stack || ''); } catch (e) {} },

    // --- persistent storage (sync bootstrap, async save) ---
    storageInitSync: function () { return BOOT.storage || null; },
    storageSaveBatch: function (data) { try { invoke('storage_save', { data: data }); } catch (e) {} },
    storageSaveSync: function (data) { try { invoke('storage_save', { data: data }); } catch (e) {} return true; },

    // --- window visibility event ---
    onWindowVisibility: function (cb) { listen('window-visibility', cb); },

    // --- account import/export ---
    accountExport: function (payload) {
      var contents = '';
      try { contents = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2); } catch (e) {}
      return invoke('save_file', { defaultName: 'melodix-account.json', contents: contents })
        .then(function (ok) { return { ok: !!ok }; }).catch(resolveTo({ ok: false }));
    },
    accountImport: resolveTo(null),
    savePlaylistsJson: resolveTo({ ok: true }),
    showPlaylistContextMenu: resolveTo(null),

    // --- updater: checks GitHub releases, downloads the installer, relaunches ---
    checkForUpdates: function () { return invoke('check_for_updates').then(resolveTo({ ok: true })).catch(resolveTo({ ok: false })); },
    updateAction: function (action) { invoke('update_action', { action: String(action || 'now') }).catch(noop); },
    installUpdateNow: function () { invoke('install_update_now').catch(noop); },
    onUpdateAvailable: function (cb) { listen('update-available', cb); },
    onUpdateDownloaded: noop,
    onUpdateProgress: function (cb) { listen('update-progress', cb); },
    onUpdateReady: function (cb) { listen('update-ready', cb); },
    onUpdateError: function (cb) { listen('update-error', cb); },
    onUpdateNotAvailable: function (cb) { listen('update-not-available', cb); },

    // --- tray / startup / instance / media keys ---
    getDesktopSettings: function () { return invoke('get_desktop_settings').catch(resolveTo(null)); },
    setDesktopSetting: function (key, value) { return invoke('set_desktop_setting', { key: key, value: !!value }).catch(resolveTo(null)); },
    setTrayOnClose: function (on) { invoke('set_desktop_setting', { key: 'trayOnClose', value: !!on }).catch(noop); },
    getMultiInstance: function () { return invoke('get_desktop_settings').then(function (s) { return !!(s && s.multiInstance); }).catch(resolveTo(false)); },
    setMultiInstance: function (on) { invoke('set_desktop_setting', { key: 'multiInstance', value: !!on }).catch(noop); },
    setMediaKeys: noop,
    mediaKeysActive: noop,
    onMediaCommand: noop,
    onMediaControl: function (cb) { listen('media-control', cb); },

    // --- mini player / lyrics window ---
    toggleMiniWindow: resolveTo(false),
    setMiniLyrics: resolveTo(false),

    // --- welcome flow (index loads directly) ---
    welcomeFinish: noop,
    onWelcomeResult: noop,

    // --- launcher ---
    getLauncherInfo: resolveTo({ installed: false, available: false }),
    installLauncher: resolveTo({ ok: false }),

    // --- themes ---
    listThemes: resolveTo([]),
    importThemes: resolveTo([]),
    setThemeEnabled: noop,
    disableAllThemes: noop,
    removeTheme: noop,
    getAppCss: resolveTo(''),

    // --- plugins ---
    listPlugins: resolveTo([]),
    setPluginEnabled: noop,
    disableAllPlugins: noop,
    removePlugin: noop,
    importPlugins: resolveTo([]),

    // --- audio output ---
    getAudioOutputInfo: resolveTo({}),

    // --- discord rich presence (staged); the now-playing info feeds the tray tooltip ---
    discordRpcUpdate: function (p) {
      var text = p && p.title ? (p.title + (p.artist ? ' - ' + p.artist : '')) : '';
      invoke('set_tray_tooltip', { text: text ? ('Melodix: ' + text).slice(0, 120) : '' }).catch(noop);
    },
    discordRpcClear: function () { invoke('set_tray_tooltip', { text: '' }).catch(noop); },
    discordRpcSetEnabled: noop,
    discordRpcGetEnabled: resolveTo(false),
    discordRpcGetConnected: resolveTo(false),
    discordRpcReconnect: resolveTo(false),

    // --- google / youtube music import (staged; no-op for now) ---
    googleLogin: resolveTo({ ok: false }),
    googleLogout: resolveTo({ ok: true }),
    googleAuthStatus: resolveTo({ loggedIn: false }),
    googleImportLibrary: resolveTo({ ok: false, tracks: [] }),
  };

  window.electronAPI = api;

  // The page itself must never scroll; only the panels inside it do (stops the shifted view and white gaps).
  try {
    var lock = document.createElement('style');
    lock.textContent = 'html, body { overflow: clip !important; overscroll-behavior: none; } html { background: #0b0b0f; }';
    document.head.appendChild(lock);
  } catch (e) {}
  function unscroll() {
    var roots = [document.documentElement, document.body];
    for (var i = 0; i < roots.length; i++) {
      var r = roots[i];
      if (r && (r.scrollTop || r.scrollLeft)) { r.scrollTop = 0; r.scrollLeft = 0; }
    }
  }
  window.addEventListener('scroll', unscroll, true);
  window.addEventListener('resize', unscroll);

  // Enable native window dragging on the custom title bar (frameless window).
  function wireDrag() {
    var drag = document.querySelector('.titlebar-drag');
    if (!drag) return;
    drag.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      var t = e.target;
      // Ignore clicks on interactive controls inside the drag strip.
      while (t && t !== drag) {
        if (t.tagName === 'BUTTON' || t.tagName === 'A' || t.tagName === 'INPUT') return;
        t = t.parentElement;
      }
      invoke('start_drag');
    });
    drag.addEventListener('dblclick', function () { invoke('toggle_maximize'); });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireDrag);
  } else {
    wireDrag();
  }
})();
