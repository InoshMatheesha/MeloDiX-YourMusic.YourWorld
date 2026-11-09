<p align="center">
  <img src="assets/logo.png" alt="MeloDiX — Your Music. Your World 🎧" width="180">
</p>

<p align="center">
  <h1 align="center">
  <img src="github/readme/emoj2i.gif" width="60" height="40" align="absmiddle" alt="emoji">&nbsp;Melodix
</h1>
</p>

<p align="center">
  <b>Your Music. Your World.</b><br>
  A free, open-source desktop music player for YouTube Music, SoundCloud, and local files.<br>
  Built with Material Design 3, no tracking, and no account needed.
</p>

<p align="center">
  <a href="https://github.com/InoshMatheesha/MeloDiX-YourMusic.YourWorld/releases/latest">
    <img src="https://img.shields.io/badge/Download-6750A4?style=for-the-badge&logo=download&logoColor=white" height="40" alt="Download">
  </a>
  &nbsp;
  <a href="https://github.com/InoshMatheesha/MeloDiX-YourMusic.YourWorld">
    <img src="https://img.shields.io/badge/Website-1F2328?style=for-the-badge&logo=open-webui&logoColor=white" height="40" alt="Visit Website">
  </a>
</p>

<p align="center">
  <a href="#core-features">Features</a> &nbsp;·&nbsp;
  <a href="#built-in-audio-suite">Audio Suite</a> &nbsp;·&nbsp;
  <a href="#material-design-3-expressive-ui">Interface</a> &nbsp;·&nbsp;
  <a href="#download-and-install">Install</a> &nbsp;·&nbsp;
  <a href="#faq">FAQ</a> &nbsp;·&nbsp;
  <a href="#build-from-source">Build</a>
</p>

<p align="center">
  <a href="https://github.com/InoshMatheesha/MeloDiX-YourMusic.YourWorld/stargazers"><img src="https://img.shields.io/github/stars/InoshMatheesha/MeloDiX-YourMusic.YourWorld?style=flat-square&labelColor=16191C&color=CAD3F5" alt="Stars"></a>
  <a href="https://github.com/InoshMatheesha/MeloDiX-YourMusic.YourWorld/commits/main"><img src="https://img.shields.io/github/last-commit/InoshMatheesha/MeloDiX-YourMusic.YourWorld?style=flat-square&labelColor=16191C&color=94C9FF" alt="Last Commit"></a>
  <a href="https://github.com/InoshMatheesha/MeloDiX-YourMusic.YourWorld/blob/main/LICENSE"><img src="https://img.shields.io/github/license/InoshMatheesha/MeloDiX-YourMusic.YourWorld?style=flat-square&labelColor=16191C&color=8EEDD8" alt="License"></a>
  <a href="https://ko-fi.com/rootlesszen"><img src="https://img.shields.io/badge/Ko--fi-support-FF5E5B?style=flat-square&logo=kofi&logoColor=white&labelColor=16191C" alt="Support on Ko-fi"></a>
</p>

---

## What is Melodix?

Melodix is a desktop music player that brings streaming and local playback into one
place. Search across YouTube Music, YouTube, SoundCloud, Spotify and Yandex Music,
play what you find, build playlists, read synced lyrics, and keep a library of your
own files — all from a single Material Design 3 window.

There is no account, no sign-up, and no telemetry. Your playlists, settings and
downloads stay on your machine.

> **Note on streaming sources.** Melodix searches public catalogues and plays
> publicly available audio streams. It is a player, not a subscription service, and
> it does not bypass paid tiers or DRM. Please respect the terms of service of each
> platform and the rights of the artists you listen to.

---

## Core features

| | |
| :-- | :-- |
| **Multi-source search** | One search bar over YouTube Music, YouTube, SoundCloud, Spotify and Yandex Music. Pick your default engine in Settings. |
| **Local library** | Point Melodix at a music folder and it indexes your own files alongside everything else. Albums, artists and a dedicated **My files** tab. |
| **Playlists** | Create, reorder and delete playlists. Favorites, listening history, and *Jump back in* on the home page. |
| **Import & export** | Import playlists from **Spotify**, **Apple Music**, a plain link, or JSON. Export all playlists to JSON, or your whole profile as a portable `.mdacc` account file. |
| **Synced lyrics** | Online lyric lookup with auto-scroll, word-by-word highlighting, a **custom lyrics editor**, and auto-translation into your language. |
| **TV Karaoke mode** | Full-screen karaoke with word highlighting and an optional visualizer behind the words. |
| **Downloads** | Save tracks as **MP3**, **FLAC** or **M4A**, with a *Trim best part* mode for clips. Choose your own download folder. |
| **Offline library** | Keep downloaded tracks available with no connection at all. |
| **My Wave** | Recommendations built from what you actually listen to, plus a personal **Wrapped** view with top tracks and artists. |
| **Mini player** | A compact, always-handy player — press <kbd>P</kbd>. |
| **Discord Rich Presence** | Show what you are playing on your Discord profile, with an option to include the artist. |
| **Last.fm scrobbling** | Scrobble your listens to Last.fm. |
| **Plugins & themes** | Drop in `.js` plugins and `.css` themes to extend and restyle the app. See [Extending Melodix](#extending-melodix). |
| **Sleep timer** | Fade out and stop after a set time. |
| **Tray & media keys** | Minimize to tray on close, and full media-key support, including a legacy capture mode for Windows. |
| **Blocklist** | Mute artists and tracks you never want to hear again. |
| **In-app updates** | Melodix checks for new releases and can install them for you on Windows and the Linux AppImage. |

---

## Built-in audio suite

Melodix ships a full Web Audio processing chain, so you can shape the sound without
any external tools.

- **10-band equalizer** — 32 Hz to 16 kHz, with savable, renamable custom presets and smooth preset transitions.
- **High Quality mode** — a mastering chain with **Bass Depth**, **Vocal Clarity**, **High-End Air**, saturation and a limiter.
- **Effects** — Reverb, Echo, Distortion, and independent **Speed**, **Tempo** and **Pitch** control.
- **Volume normalization** — even out loudness across tracks, with its own limiter.
- **Crossfade** — smooth transitions between tracks.
- **Volume gain** — push past 100% when a track is mastered quietly.
- **Audio output device** — send playback to a specific output.
- **Live visualizer** — pick from `bars`, `wave`, `orbit`, `vinyl`, `aurora`, `liquid` and `mirror`, with sensitivity, smoothness and opacity controls. A compact wave visualizer can also sit in the bottom bar.

---

## Material Design 3 Expressive UI

The interface is built on Material Design 3 and is unusually deep in what it lets
you change:

- **Theme** — light / dark / system, a custom **accent color**, palette style, hue, brightness and intensity.
- **Dynamic color** — a mesh gradient and ambient light that can take their colors from the current cover art.
- **Banners** — per-track banners with blur, fade, fit, opacity and custom effects; use images or video as background media.
- **Covers** — shaped cover art in Now Playing, karaoke and the bottom bar.
- **Layout** — rearrange the sidebar and home page, switch to a classic sidebar, move the search bar, hide the titlebar, or hide the engine buttons.
- **Typography & scale** — interface font, font scale and overall UI scale.
- **Progress bar** — wavy or plain, with custom knob and background styling.
- **Accessibility** — reduce motion, a **Performance mode** for lower-end machines, a *No-Hand* cursor mode, interface opacity, and full right-to-left layout support.
- **132 interface languages** — the UI auto-translates, including RTL languages such as Arabic, Persian, Hebrew and Urdu.
- **CSS editor** — a built-in editor for live-tweaking the interface.

---

## Screenshots

<!--
  Drop your screenshots into github/readme/ using these exact filenames and they
  will appear here automatically. Delete any row you do not have an image for.
-->

<p align="center">
  <img src="github/readme/home.png" alt="Melodix home page" width="88%">
</p>

<table>
  <tr>
    <td width="50%"><img src="github/readme/now-playing.png" alt="Now Playing"></td>
    <td width="50%"><img src="github/readme/lyrics.png" alt="Synced lyrics"></td>
  </tr>
  <tr>
    <td align="center"><b>Now Playing</b></td>
    <td align="center"><b>Synced lyrics</b></td>
  </tr>
  <tr>
    <td width="50%"><img src="github/readme/karaoke.png" alt="TV Karaoke mode"></td>
    <td width="50%"><img src="github/readme/audio.png" alt="Audio suite and equalizer"></td>
  </tr>
  <tr>
    <td align="center"><b>TV Karaoke</b></td>
    <td align="center"><b>Audio suite</b></td>
  </tr>
  <tr>
    <td width="50%"><img src="github/readme/library.png" alt="Library and playlists"></td>
    <td width="50%"><img src="github/readme/themes.png" alt="Themes and appearance"></td>
  </tr>
  <tr>
    <td align="center"><b>Library</b></td>
    <td align="center"><b>Appearance</b></td>
  </tr>
</table>

---

## Download and install

Grab the latest build from the
**[Releases page](https://github.com/InoshMatheesha/MeloDiX-YourMusic.YourWorld/releases/latest)**.

| Platform | File | Notes |
| :-- | :-- | :-- |
| **Windows** (x64) | `moodex-<version>-win-x64-setup.exe` | One-click installer. Your data is kept if you uninstall. |
| **Windows** (portable) | `moodex-<version>-win-x64-portable.exe` | No install — just run it. |
| **Linux** (x64) | `moodex-<version>-linux-x64.AppImage` | `chmod +x` then run. In-app updates work from the AppImage. |
| **macOS** (Intel / Apple Silicon) | `Moodex-<version>-mac-<arch>.dmg` | Unsigned build — see the FAQ below. |
| **Nix / NixOS** | — | See [NIX.md](NIX.md) for the flake, overlay and dev shell. |

### Required tools

Downloading and converting tracks needs **yt-dlp** and **ffmpeg**. You do not have
to install them by hand:

> **Settings → Required tools → Install**

Melodix downloads both into its own folder and verifies the checksum. If you would
rather manage them yourself, put the binaries on your `PATH` or drop them into the
app's `bin/` folder.

### Where your data lives

| OS | Location |
| :-- | :-- |
| Windows | `%LOCALAPPDATA%\Moodex` |
| macOS | `~/Library/Application Support/Moodex` |
| Linux | `~/.config/devsize` (config) and `~/.cache/devsize` (data) |

Set `MOODEX_DATA_DIR` to move it somewhere else.

---

## Keyboard shortcuts

| Action | Shortcut |
| :-- | :-- |
| Play / Pause | <kbd>Space</kbd> |
| Next / Previous | <kbd>Ctrl</kbd> + <kbd>→</kbd> / <kbd>←</kbd> |
| Seek ±5 s | <kbd>Shift</kbd> + <kbd>→</kbd> / <kbd>←</kbd> |
| Volume ±5% | <kbd>Ctrl</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> |
| Mute / Unmute | <kbd>M</kbd> |
| Shuffle | <kbd>H</kbd> |
| Repeat | <kbd>R</kbd> |
| Lyrics | <kbd>L</kbd> |
| TV Karaoke | <kbd>F</kbd> |
| Mini player | <kbd>P</kbd> |
| Search | <kbd>/</kbd> or <kbd>Ctrl</kbd> + <kbd>K</kbd> |
| Close / Blur | <kbd>Esc</kbd> |

---

## Extending Melodix

### Plugins

Plugins are single `.js` files with a metadata header. Add them through
**Settings → Plugins → Add**, then pick the file.

```js
/**
 * @name Hello plugin
 * @author You
 * @version 1.0.0
 * @description Shows a message when the track changes.
 */
const off = Moodex.on('trackchange', (track) => Moodex.toast('Now playing: ' + track.title));
return { stop() { off(); } };
```

A ready-made example, `better-shuffle.js`, lives in [plugin/](plugin/).

### Themes

Themes are plain CSS files with the same style of header. Add them through
**Settings → Appearance → Themes**.

```css
/*
 * @name Midnight
 * @author You
 * @description A darker take on the default palette.
 */
:root { --md-sys-color-primary: #8EEDD8; }
```

For quick one-off tweaks, use the built-in **CSS editor** instead.

---

## Build from source

You need **Node.js 18+** and **git**.

```bash
git clone https://github.com/InoshMatheesha/MeloDiX-YourMusic.YourWorld.git
cd MeloDiX-YourMusic.YourWorld
npm install
npm start
```

### Other commands

| Command | What it does |
| :-- | :-- |
| `npm start` | Run the app from source. |
| `npm test` | Run the test suite (`node --test`). |
| `npm run dist` | Build installers for your platform into `dist/`. |
| `npm run release` | Bump the patch version and push the tag, which triggers the release workflow. |

### Project layout

```
src/
  main/       Electron main process — window, CLI, plugins, themes, updater, Discord RPC
  renderer/   The UI — app.js, audio.js (Web Audio chain), shapes.js, styles.css
  server/     Local backend — search, streaming, yt-dlp/ffmpeg management
  shared/     Cross-process helpers — paths, logging, audio output
assets/       Icons, logo and the built-in cover shapes
plugin/       Example plugin
test/         Unit tests
```

### CLI

```bash
moodex lyrics   # stream the current track's lyrics to your terminal
```

---

## FAQ

<details>
<summary><b>Do I need an account?</b></summary>

No. There is no sign-up and no login. Spotify and Apple Music are used only to
*import* playlists you already have.
</details>

<details>
<summary><b>Does Melodix track me?</b></summary>

No telemetry, no analytics, no ads. Playlists, settings and downloads are stored
locally. The only network traffic is to the music sources, lyric providers, and the
GitHub releases endpoint for updates — plus Discord and Last.fm if you turn those on.
</details>

<details>
<summary><b>macOS says the app is damaged or from an unidentified developer.</b></summary>

The macOS builds are unsigned, because code-signing requires a paid Apple developer
account. Right-click the app → **Open**, or run:

```bash
xattr -cr /Applications/Moodex.app
```
</details>

<details>
<summary><b>Downloads or playback fail.</b></summary>

Almost always missing or outdated tools. Open **Settings → Required tools** and
reinstall **yt-dlp** and **ffmpeg** — yt-dlp in particular needs regular updates as
sites change. If a specific source is blocked on your network, try the
**In-app proxy** option in Settings.
</details>

<details>
<summary><b>The app feels slow or stutters.</b></summary>

Turn on **Performance mode** and **Reduce motion** in Settings, and lower or disable
the visualizer, mesh gradient and banner effects.
</details>

<details>
<summary><b>How do I move my library to another machine?</b></summary>

**Settings → Export Melodix account (.mdacc)**, then import that file on the other
machine. Playlists alone can be exported as JSON.
</details>

---

## Contributing

Issues and pull requests are welcome.

1. Open an [issue](https://github.com/InoshMatheesha/MeloDiX-YourMusic.YourWorld/issues) first for anything substantial — there are bug report and feature request templates.
2. Fork, branch, and keep changes focused.
3. Run `npm test` before opening a PR, and fill in the pull request template.

---

## License

Released under the [MIT License](LICENSE).

---

## Credits and thanks

Melodix would not exist without the work it is built on.

### 🙏 Thanks to the original creator

Melodix is a customized build of **[Riff](https://github.com/rootscripts/riff)** by
**[rootscripts](https://github.com/rootscripts)**, who released the source code that
made this project possible. The entire foundation of this player — its architecture,
its audio engine and its Material Design 3 interface — comes from that work.

Thank you for making it open source. 💜

> If you like Melodix, please go star the original project:
> **[github.com/rootscripts/riff](https://github.com/rootscripts/riff)**

### Built with

- [Electron](https://www.electronjs.org/) — the desktop shell
- [Tone.js](https://tonejs.github.io/) — audio processing
- [hls.js](https://github.com/video-dev/hls.js) — adaptive streaming
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) and [ffmpeg](https://ffmpeg.org/) — media fetching and conversion
- [electron-builder](https://www.electron.build/) and [electron-updater](https://www.electron.build/auto-update) — packaging and updates
- [discord-rpc](https://github.com/discordjs/RPC) — Rich Presence
- [Material Design 3](https://m3.material.io/) — the design language

---

<p align="center">
  <img src="assets/logo.png" width="64" alt="Melodix"><br>
  <b>Melodix</b> — Your Music. Your World.<br>
  <sub>Made with 💜 by <a href="https://github.com/InoshMatheesha">Inosh Matheesha</a> · based on <a href="https://github.com/rootscripts/riff">Riff</a> by rootscripts</sub>
</p>

<p align="center">
  <a href="https://ko-fi.com/rootlesszen"><img src="https://img.shields.io/badge/Support%20on%20Ko--fi-FF5E5B?style=for-the-badge&logo=kofi&logoColor=white" alt="Ko-fi"></a>
</p>
