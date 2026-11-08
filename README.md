<p align="center">
  <img src="assets/logo.png" alt="Moodex - desktop music player and audio suite for YouTube Music, SoundCloud, and local files" width="180">
</p>

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/windows8/windows8-original.svg" width="22" height="22" alt="Windows">&nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/apple/apple-original.svg" width="22" height="22" alt="macOS">&nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/linux/linux-original.svg" width="22" height="22" alt="Linux">&nbsp;&nbsp;
  <img src="https://cdn.simpleicons.org/ios/9ca3af" width="22" height="22" alt="iOS">&nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/android/android-original.svg" width="22" height="22" alt="Android">
</p>

<h1 align="center">
  <img src="github/readme/emoj2i.gif" width="48" height="48" align="absmiddle" alt="emoji">&nbsp;Moodex
</h1>

<p align="center">
  <b>A free, open-source desktop music player for YouTube Music, SoundCloud, and local files.</b><br>
  Built with Material Design 3, no tracking, and no account needed.
</p>

<p align="center">
  <a href="https://github.com/inoshmatheesha/moodex/releases">
    <img src="https://img.shields.io/badge/Download-6750A4?style=for-the-badge&logo=download&logoColor=white" height="40" alt="Download">
  </a>
  &nbsp;
  <a href="https://moodex.hs.vc">
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
  <a href="https://github.com/inoshmatheesha/moodex/stargazers"><img src="https://img.shields.io/github/stars/inoshmatheesha/moodex?style=flat-square&labelColor=16191C&color=CAD3F5" alt="Stars"></a>
  <a href="https://github.com/inoshmatheesha/moodex/commits/main"><img src="https://img.shields.io/github/last-commit/inoshmatheesha/moodex?style=flat-square&labelColor=16191C&color=94C9FF" alt="Last Commit"></a>
  <a href="https://github.com/inoshmatheesha/moodex/blob/main/LICENSE"><img src="https://img.shields.io/github/license/inoshmatheesha/moodex?style=flat-square&labelColor=16191C&color=8EEDD8" alt="License"></a>
  <a href="https://ko-fi.com/rootlesszen"><img src="https://img.shields.io/badge/Ko--fi-support-FF5E5B?style=flat-square&logo=kofi&logoColor=white&labelColor=16191C" alt="Support on Ko-fi"></a>
</p>

## What is Moodex?

Moodex is an open-source, telemetry-free desktop music app and player for **Windows, Linux, and macOS**. It unifies playback across **YouTube Music**, **YouTube**, **SoundCloud**, and offline local media into a single high-performance interface without ads, subscriptions, or login constraints. Provides very fancy UI and layout.

Built with **Electron**, **Vanilla JavaScript**, and **WebGL**, Moodex provides responsive UI interactions and hardware-accelerated audio visualization without runtime framework overhead. The project is distributed under the **MIT license** and enforces strict privacy: all configuration, cached streams, and playback history remain strictly on the local machine.

## What's new in v1.1.6

- **Settings tabs no longer get stuck.** After opening About or Tracks, an
  invisible click layer from the new tracklist / progress-style buttons
  covered the whole settings page, so no other tab could be selected.
- **Home plays keep going.** Songs started from Home (trending, quick picks,
  recently played) now start a song radio: the queue fills with different
  songs in the same style and keeps refilling, so Next stays on-vibe.
- **Fewer skipped songs.** When a stream link dies and yt-dlp is blocked by
  YouTube's bot check, the audio proxy now fetches a fresh link from
  YouTube's player API instead of giving up and skipping the track.

## What's new in v1.1.5

- **Progress bar style applies immediately.** Picking a style while music was
  paused did nothing until you pressed play, because the paused playbar stops
  redrawing. It now redraws straight away.
- **App, setup and uninstaller use the new icon.** Builds now use a
  multi-size `assets/icon.ico` (16-256px) generated from `assets/icon.png`.
  If you replace `icon.png`, regenerate the `.ico` too.

## What's new in v1.1.4

- **New About page - "Liner notes".** Moodex is presented as a record: a vinyl
  half out of its sleeve that spins only while music is playing, with the
  current song's cover on its centre label. The About actions (updates,
  shortcuts, diagnostics, logs, Telegram) are a numbered tracklist, and
  "Your pressing" shows your own stats - plays, listening time, liked songs,
  artists and the date of your first play.
- **Progress bar styles.** Settings -> Tracks -> *Progress bar style* offers
  five thin styles - Wave, Line, Neon, Dots and Pulse - each with a live
  preview. All are about 3px instead of the old 9.5px bar.
- **Playlists button works again.** The drawer was being clipped by the
  rounded sidebar panel introduced in 1.1.2.
- **Presets removed from the sidebar** (still in the player bar).
- **Mini player:** the logo no longer sits on top of the lyrics button.

## What's new in v1.1.3

- **Moodex loading animation.** Loading screens now show the Moodex mark
  itself: the waveform bars bounce like an equaliser, the M draws itself in
  the blue gradient, fills in and catches a passing highlight. It replaces the
  morphing-shape loader and spinner rings in search, lists, albums, track
  buffering and the updater. It is CSS-only, so it costs no JavaScript frames.
- **Mini player** shows just the logo in its title bar, without the name.
- **Search removed from the sidebar** - the search bar is always at the top.

## What's new in v1.1.2

### Redesigned sidebar
The sidebar is back to labelled rows, with the Moodex mark and name at the
top. The current page is highlighted by a blue gradient pill, counts (History,
Queue, Liked) sit in white chips on the right, and Settings is pinned to the
bottom under a divider. The sidebar and the content area now share one rounded
panel instead of looking like a strip beside a box. The panel button in the
top corner still collapses it to an icon-only rail.

## What's new in v1.1.1

### Up next plays different songs, not the same song again
Playing a song from search used to queue the whole result list, which for a
search like "Nura Ananthe" meant the official audio, a lyric video, a slowed
version and a reverb re-upload back to back. Picking a search result now starts
a **song radio**: different tracks in the same style, taken from YouTube
Music's per-song mix. Re-uploads, lyric videos and slowed / reverb / sped-up
versions of the song - and of anything already queued - are filtered out, and
the queue refills itself from the playing track as it runs low.

### Results as you type
Search no longer waits for Enter. Results update about 300 ms after you stop
typing; stale requests are cancelled, and the current results stay on screen
(dimmed) while the next ones load, so the list doesn't flash.

### Cleaner sidebar highlight
The selected sidebar item is now an accent-tinted pill behind the icon with a
small marker on the rail edge, replacing the grey tile and square glow that
looked like a stray box behind the Queue icon.

## What's new in v1.1.0

> **Version reset.** Moodex restarts its version numbering at **1.1.0** with this
> release. Because `1.1.0` sorts below the previous `43.x` numbering, existing
> installs **will not** be offered this build by the in-app updater - download it
> from the [releases page](https://github.com/InoshMatheesha/Moodex-Music-Player/releases)
> once instead. Updates from 1.1.0 onward work normally.

### Artwork loads from a local cache

Cover art used to be fetched from the origin CDN on every render, so the same
album re-downloaded each time you scrolled past it. Artwork now goes through the
local server's caching proxy, which keeps a bounded in-memory LRU in front of an
on-disk cache and serves bytes back as immutable with an ETag.

| | before | after |
|---|---|---|
| first load of a cover | ~700 ms | ~700 ms |
| every later load | ~700 ms | **~2 ms** |

Alongside that:

- Requests for the same image are **coalesced**, so a grid of rows showing one
  cover performs a single network fetch instead of one per row.
- Covers for the next couple of screens are **prefetched** at low priority when a
  track list renders, so artwork is already local by the time you scroll to it.
- Every list and grid image is marked `loading="lazy"` and `decoding="async"`, so
  offscreen artwork no longer competes for sockets or blocks the main thread.
- Fixed: the proxy sent `Content-Type: [object Promise]` (an `async` function used
  without `await`), and mislabelled every WebP as JPEG.

### Lower idle CPU and bounded memory

- The loudness-normalisation watcher was a permanent 100 ms interval - ten
  wake-ups a second for the life of the app, even paused and hidden. It is now
  supervised by a 1 Hz check and only runs while audio is actually playing.
- The lyrics-translation cache grew without limit across a session; it is now
  bounded like the other caches.
- The thumbnail cache is capped at 64 MB / 600 entries and evicts
  least-recently-used entries.

### Redesigned search bar

The top bar was built around a 44 px flat pill with no border and no focus
treatment, which read as undersized in a full-screen window. It is now a 52 px
field with a real border, a focus ring, a `Ctrl K` hint that steps out of the way
as you type, and a brand lockup (logo + wordmark) to anchor the window. The
platform switch was rescaled to match.

### Navigation sidebar

The rail is expanded by default and shows text labels, with **Search**,
**Downloads** and **Wrapped** added to the existing destinations:

| | |
|---|---|
| **Search** | jumps to the home view and focuses the search field |
| **Downloads** | everything cached on this device, with total size, refresh and clear-all |
| **Wrapped** | a running picture of your listening: total plays, time listened, unique tracks and artists, and your top 10 tracks and artists |

Use the toggle at the top of the rail to collapse it back to the icon-only
layout; the choice is remembered. Below 1100 px the rail collapses on its own so
it does not eat the content area.

> Wrapped counts plays from the moment you install v1.1.0 - play history alone
> cannot supply it, because that list is capped at 100 entries and de-duplicates
> repeats. Stats stay on your machine and can be cleared from the page.

### Simplified Settings

**Interface** went from 31 controls to 11. The 20 fine-tuning controls moved into
**Advanced**, grouped under *Window & chrome*, *Surface & colour* and *Visualizer
tuning*. Nothing was removed, every control keeps its behaviour, settings search
still finds them wherever they live, and the Interface page links straight to the
Advanced group.

## Features

- High quality streaming with **YouTube Music, YouTube, and SoundCloud** without third-party advertisements or account requirements
- **Offline lossless playback with full local library support** for high resolution formats including FLAC, WAV, MP3, OGG, and M4A.
- **Easy built-in audio editor**, downloading with effects or trimming 10-band & 3-band equalizer, and real-time DSP effects (speed, pitch, reverb, distortion).
- **1-Click multi-platform playlist migration**: Direct import and resolution of public playlists from Spotify, Apple Music, YouTube Music, and SoundCloud
- **Material Design 3 UI**: Dynamic color extraction from album artwork, deep UI theming, responsive layout presets, and an integrated CSS editor
- **Hardware-Accelerated Visuals**: Canvas and WebGL visualizers including real-time frequency analyzers, an interactive squiggly progress scrubber, and synchronized karaoke lyrics.
- **Discord Rich Presence**: Real-time playback status reporting track metadata, artist info, and elapsed time to Discord.
- **Zero Telemetry**: No tracking identifiers, analytics pings, or background data collection.
- **Fullscreen mode** with fancy lyrics animation.
- **Albums** - see all of your favorite artist albums.
- **Customization** - built in theme editor, configure everything, and a CSS editor, with animated backgrounds and interface opacity sliders.
- **Plugins** - built-in plugin feature where you can add a plugin to edit how Moodex works with something or add a new function.
- **Wrapped** - a running summary of your listening: plays, time listened, top tracks and top artists, all computed locally.
- **Downloads view** - browse everything cached for offline playback, see how much space it uses, and clear it in one action.
- **Labelled sidebar** - an expandable navigation rail with text labels that collapses to icons when you want the room.
## Built-in Audio Suite

Moodex includes an integrated audio engineering toolkit accessible directly within the player interface:

### Visual Audio Editor
- **Lossless Audio Trimming**: Define start and end boundaries to trim tracks without transcoding loss.
- **Region Extraction**: Select and isolate specific audio segments to save as standalone files.
- **Non-Destructive Processing**: Edit operations produce independent files while preserving original source media untouched.

### 10-Band Parametric Equalizer
- Dedicated frequency sliders covering 32 Hz through 16 kHz with pre-configured acoustic profiles (Bass Boost, Vocal Clarity, Electronic, Flat, Rock).
- Per-channel gain adjustments with real-time Web Audio API signal processing.

### Real-Time DSP Effects Chain
- **Tempo Control**: Dynamically speed up or slow down playback rate without altering pitch.
- **Pitch Shifting**: Independent semitone pitch adjustment for rehearsal and tuning.
- **Reverb & Spatial Effects**: Algorithmic convolution and room size simulation for spatial enhancement.
- **Distortion / Overdrive**: Adjustable wave-shaping saturation and drive harmonics.

### Offline Library & Download Pipeline
- Download streams from YouTube Music, YouTube, and SoundCloud directly into local disk storage (MP3, FLAC, Opus, WAV).
- Automatic ID3 and metadata tagging, including high-resolution cover art embedding.
- Complete offline availability with full playlist compilation and search indexing.

## Material Design 3 Expressive UI

Moodex implements the Material Design 3 (M3 Expressive) specification:

- **Dynamic Color Extraction**: Generates responsive UI tonal palettes on the fly based on the dominant and secondary hues of active album art.
- **Deep UI Customization**: Configurable banner backdrops, mesh gradients, blur filters, and typography controls.
- **Integrated CSS Editor**: Built-in developer console allowing direct CSS overrides and custom style injection to personalize every aspect of the interface.
- **Optimized Layout Modes**: Compact mini-player layout, expanded desktop view, and fullscreen TV / Karaoke mode with synchronized lyrics rendering.

## Multi-Platform Playlist Migration

Migrate existing music libraries between platforms in a single operation:

- Import public playlist URLs from **Spotify** (including playlists with 100+ tracks via automated pagination).
- Import public playlists and albums from **Apple Music**, **SoundCloud**, and **YouTube / YouTube Music**.
- Platform-aware search resolution: matches imported track metadata against the selected audio provider to construct immediate local playlists.

## Synchronized Lyrics Engine

- Automatic multi-provider lyrics lookup matching artist and title metadata.
- Native support for synchronized LRC files, plain text lyrics, and dynamic online timestamp alignment.
- Inline time-offset adjustments to manually synchronize lyrics with live streams.
- Multi-language translation support directly inside the lyrics panel.

## Download and install

Pre-built binaries are available on the [Releases page](https://github.com/inoshmatheesha/moodex/releases).

Standard releases include all necessary dependencies (bundled yt-dlp and ffmpeg binaries). No secondary runtime configuration is required on Windows or Linux.

### macOS

macOS support is currently experimental and compiled via continuous integration.

1. Download the appropriate image:
   - `Moodex-<version>-mac-arm64.dmg` for Apple Silicon (M1 / M2 / M3 / M4)
   - `Moodex-<version>-mac-x64.dmg` for Intel-based hardware
2. Open the disk image and drag Moodex to your `Applications` directory.
3. Because the binary is unsigned, right-click `Moodex.app` in `Applications`, select **Open**, and confirm the prompt.
4. If macOS flags the bundle as damaged, execute the following command in Terminal:
   ```bash
   xattr -cr /Applications/Moodex.app
   ```
   If a quarantine warning occurs when mounting the `.dmg` itself, run:
   ```bash
   xattr -d -r com.apple.quarantine /path/to/Moodex.dmg
   ```
5. Install the required runtime binaries via Homebrew (Moodex detects Homebrew paths automatically):
   ```bash
   brew install yt-dlp ffmpeg
   ```

macOS application data and local indexes are stored in `~/Library/Application Support/Moodex`.

## Build from source

Requires Node.js 18 or newer and npm.

```bash
git clone https://github.com/inoshmatheesha/moodex.git
cd moodex
npm install
npm start        # run the dev version
npm run dist     # make a production build
```

The exact build output depends on the current project configuration.

## Memory usage

Moodex (single Electron renderer and server process) typically utilizes approximately **180 MB of RAM** during steady-state playback. Actual footprint varies based on active visualizer modes, library size, and OS window compositing.

As of v1.1.0 the caches that back this are explicitly bounded: the thumbnail
cache holds at most 64 MB / 600 entries and evicts least-recently-used entries,
and the lyrics-translation cache is capped rather than growing for the life of
the session. Idle CPU is lower too - the loudness watcher no longer ticks ten
times a second while nothing is playing.

### Memory usage is only classified as a leak when sustained footprint exceeds 600 MB.

## Mobile versions

There is no official Moodex client for Android or iOS. Third-party community forks are documented below:
### https://rootless.shit.vc/fork
Additional mobile implementations may be reviewed in future releases.

## FAQ

**Is Moodex free?**
Yes. Moodex is free software published under the permissive MIT license. There are no subscriptions, paywalls, or premium tiers.

**Does Moodex display advertisements?**
No. Streams from YouTube Music, YouTube, and SoundCloud are resolved directly and play without advertisements.

**Is an account or sign-in required?**
No. Moodex requires no account creation, credentials, or authentication. Telemetry and analytic tracking are strictly omitted.

**Which operating systems are supported?**
Windows 10/11, modern Linux distributions, and macOS (experimental).

**Can Moodex function as an offline local music player?**
Yes. Moodex natively indexes local audio files (including lossless FLAC, WAV, MP3, and OGG), reads standard metadata tags and embedded artwork, and manages playlists without altering underlying disk files.

**Can I use Moodex entirely offline?**
Yes. Downloaded tracks, saved audio segments, and indexed local libraries function without an internet connection.

**How does playlist migration work?**
Paste any public Spotify, Apple Music, YouTube Music, or SoundCloud playlist link. Moodex extracts track titles and artists, batches requests to resolve streams on your active platform, and saves the result as an editable local playlist.

**Does Moodex support synchronized lyrics?**
Yes. Moodex supports online synchronized lyrics, local LRC files, manual timing adjustments, and real-time synchronized karaoke display.

**Does Moodex integrate with Discord?**
Yes. Native Discord Rich Presence displays the currently playing track title, artist, elapsed time, and platform indicator.

**Are there official mobile builds?**
No official mobile releases exist. See [Mobile versions](#mobile-versions) for community-maintained forks.

## Contributing

Pull requests are welcome. Please verify all changes locally, ensure code passes syntax validation (`node --check`), and confirm stability before submitting contributions. Untested pull requests or changes introducing regressions will not be merged.

## Support

You can support ongoing development via [Ko-fi](https://ko-fi.com/rootlesszen). Repository stars on GitHub are also appreciated.

## Disclaimer

Moodex is developed for educational purposes and personal media management. Users are responsible for adhering to the terms of service of third-party platforms and applicable local copyright regulations.

## License

[MIT](LICENSE)

---

<sub>Keywords: free music player, YouTube Music desktop app, SoundCloud desktop player, ad-free music player, Material Design 3, M3 Expressive, visual audio editor, lossless audio trimmer, 10-band equalizer, DSP effects, tempo changer, pitch shift, FLAC player, WAV playback, Spotify playlist import, Apple Music playlist migration, Electron music player, Vanilla JS, WebGL audio visualizer, Discord Rich Presence, open source music player, MIT license, telemetry-free desktop player.</sub>
