/*
 * Melodix web shim.
 *
 * The desktop renderer talks to Electron through window.electronAPI (see
 * src/main/preload.js). In the browser build this file stands in for it, so
 * the renderer can run unchanged: browser equivalents where one exists (file
 * pickers, downloads, account files), harmless no-ops for desktop-only
 * features (tray, Discord, auto-update, window buttons).
 *
 * It must load before app.js. Loaded on both index.html and welcome.html.
 */
(function () {
  'use strict';

  var VERSION = '__MOODEX_VERSION__';
  window.__MOODEX_WEB__ = true;

  // ---------------------------------------------------------------------------
  // Platform classes, so web.css can adapt the layout per device.
  // ---------------------------------------------------------------------------
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  var isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var root = document.documentElement;
  root.classList.add('is-web');
  if (isIOS) root.classList.add('is-ios');
  if (isAndroid) root.classList.add('is-android');
  if (isTouch) root.classList.add('is-touch');
  if (isStandalone) root.classList.add('is-standalone');
  window.__MOODEX_PLATFORM__ = { isIOS: isIOS, isAndroid: isAndroid, isTouch: isTouch, isStandalone: isStandalone };

  // 100vh is wrong on mobile browsers while the URL bar is showing; expose the
  // real visible height for web.css.
  function syncViewportHeight() {
    var h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    root.style.setProperty('--web-vh', h + 'px');
  }
  syncViewportHeight();
  window.addEventListener('resize', syncViewportHeight, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', syncViewportHeight, { passive: true });

  // ---------------------------------------------------------------------------
  // IndexedDB blob store: local audio files and custom media the user adds.
  // The service worker (sw.js) serves them back at /__local/<id> with range
  // support, so they survive reloads and seek like any other track.
  // ---------------------------------------------------------------------------
  var DB_NAME = 'moodex-web';
  var STORE = 'files';
  var dbPromise = null;
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('IndexedDB unavailable'));
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }
  function idbPut(key, value) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function idbClear() {
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
      });
    }).catch(function () {});
  }
  function idbEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
      return navigator.storage.estimate().then(function (e) { return e.usage || 0; }).catch(function () { return 0; });
    }
    return Promise.resolve(0);
  }

  var swReady = null;
  function localUrl(id) {
    return location.origin + '/__local/' + encodeURIComponent(id);
  }

  // ---------------------------------------------------------------------------
  // File pickers
  // ---------------------------------------------------------------------------
  function pickFiles(opts) {
    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file';
      if (opts.accept) input.accept = opts.accept;
      if (opts.multiple) input.multiple = true;
      if (opts.directory) { input.webkitdirectory = true; input.setAttribute('webkitdirectory', ''); }
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      var settled = false;
      function done(files) {
        if (settled) return;
        settled = true;
        try { input.remove(); } catch (e) {}
        resolve(files);
      }
      input.addEventListener('change', function () { done(Array.prototype.slice.call(input.files || [])); });
      input.addEventListener('cancel', function () { done([]); });
      // Older browsers fire no "cancel": treat a focus return with no
      // selection as a cancel, after giving "change" time to arrive.
      window.addEventListener('focus', function onFocus() {
        window.removeEventListener('focus', onFocus);
        setTimeout(function () { if (!input.files || !input.files.length) done([]); }, 1500);
      });
      document.body.appendChild(input);
      input.click();
    });
  }

  var AUDIO_EXT = /\.(mp3|flac|wav|ogg|oga|m4a|aac|opus|webm|weba|wma)$/i;

  function hashString(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  }

  function readDuration(file) {
    return new Promise(function (resolve) {
      var a = document.createElement('audio');
      var url = URL.createObjectURL(file);
      var finish = function (d) { try { URL.revokeObjectURL(url); } catch (e) {} resolve(d); };
      a.preload = 'metadata';
      a.onloadedmetadata = function () { finish(Number.isFinite(a.duration) ? Math.round(a.duration) : 0); };
      a.onerror = function () { finish(0); };
      setTimeout(function () { finish(0); }, 4000);
      a.src = url;
    });
  }

  function parseName(file) {
    var base = (file.name || 'Track').replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
    var m = base.match(/^(?:\d{1,3}[\s.\-]+)?(.+?)\s+-\s+(.+)$/);
    if (m) return { artist: m[1].trim(), title: m[2].trim() };
    return { artist: 'Unknown Artist', title: base.replace(/^\d{1,3}[\s.\-]+/, '') || base };
  }

  function filesToTracks(files) {
    var audio = files.filter(function (f) { return AUDIO_EXT.test(f.name || '') || /^audio\//.test(f.type || ''); });
    return Promise.all(audio.map(function (file) {
      var id = 'local_' + hashString((file.webkitRelativePath || file.name) + '|' + file.size + '|' + file.lastModified);
      var meta = parseName(file);
      return idbPut(id, file).then(function () { return readDuration(file); }).then(function (duration) {
        return {
          id: id,
          title: meta.title,
          artist: meta.artist,
          album: '',
          trackNumber: 0,
          duration: duration,
          path: '',
          url: localUrl(id),
          thumbnail: '',
          cover: '',
          platform: 'local'
        };
      }).catch(function (e) {
        console.warn('[web] could not store local file', file.name, e);
        return null;
      });
    })).then(function (list) { return list.filter(Boolean); });
  }

  function downscaleImage(file, max) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.max(1, Math.round(img.naturalWidth * scale));
        var h = Math.max(1, Math.round(img.naturalHeight * scale));
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        try { resolve(c.toDataURL('image/jpeg', 0.86)); } catch (e) { resolve(null); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  function pickMedia() {
    return pickFiles({ accept: 'image/*,video/mp4,video/webm' }).then(function (files) {
      var f = files[0];
      if (!f) return null;
      // Animated GIFs and videos are kept as files; still images are shrunk to
      // a data URL so they fit in localStorage with the rest of the settings.
      if (/^image\//.test(f.type) && f.type !== 'image/gif') return downscaleImage(f, 1600);
      var id = 'media_' + hashString(f.name + '|' + f.size + '|' + f.lastModified);
      return idbPut(id, f).then(function () { return localUrl(id); }).catch(function () { return null; });
    });
  }

  // ---------------------------------------------------------------------------
  // Saving files
  // ---------------------------------------------------------------------------
  function saveBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
  }

  // .mdacc account files: identical format to the desktop app (AES-256-GCM
  // over raw-deflated JSON, "RFAC" header), so a profile exported on desktop
  // imports on the web and back.
  var ACCOUNT_KEY_SEED = 'moodex-account-key-v1';
  function accountKey() {
    var seed = new TextEncoder().encode(ACCOUNT_KEY_SEED);
    return crypto.subtle.digest('SHA-256', seed).then(function (raw) {
      return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    });
  }
  function streamThrough(bytes, transform) {
    var stream = new Blob([bytes]).stream().pipeThrough(transform);
    return new Response(stream).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  function encryptAccount(obj) {
    var json = new TextEncoder().encode(JSON.stringify(obj || {}));
    return streamThrough(json, new CompressionStream('deflate-raw')).then(function (compressed) {
      var iv = crypto.getRandomValues(new Uint8Array(12));
      return accountKey().then(function (key) {
        return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, compressed);
      }).then(function (sealed) {
        sealed = new Uint8Array(sealed);
        var body = sealed.subarray(0, sealed.length - 16);
        var tag = sealed.subarray(sealed.length - 16);
        var out = new Uint8Array(4 + 12 + 16 + body.length);
        out.set(new TextEncoder().encode('RFAC'), 0);
        out.set(iv, 4);
        out.set(tag, 16);
        out.set(body, 32);
        return out;
      });
    });
  }
  function decryptAccount(buf) {
    var bytes = new Uint8Array(buf);
    if (bytes.length < 32 || new TextDecoder().decode(bytes.subarray(0, 4)) !== 'RFAC') {
      return Promise.reject(new Error('Invalid account file'));
    }
    var iv = bytes.subarray(4, 16);
    var tag = bytes.subarray(16, 32);
    var body = bytes.subarray(32);
    var sealed = new Uint8Array(body.length + 16);
    sealed.set(body, 0);
    sealed.set(tag, body.length);
    return accountKey().then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, sealed);
    }).then(function (compressed) {
      return streamThrough(new Uint8Array(compressed), new DecompressionStream('deflate-raw'));
    }).then(function (json) {
      return JSON.parse(new TextDecoder().decode(json));
    });
  }

  // ---------------------------------------------------------------------------
  // Welcome / onboarding: desktop shows welcome.html in the main window on
  // first run, then loads index.html with the choices. Same here, via a page
  // navigation and sessionStorage.
  // ---------------------------------------------------------------------------
  var WELCOME_DONE = 'moodex_web_welcome_done';
  var WELCOME_RESULT = 'moodex_web_welcome_result';
  var onWelcomePage = /\/welcome(\.html)?$/.test(location.pathname);
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  if (!onWelcomePage && !lsGet(WELCOME_DONE)) {
    // Someone importing an existing desktop profile, or returning with data,
    // has effectively been onboarded already.
    var hasData = false;
    try { hasData = !!(lsGet('devsize_playlists') || lsGet('moodex_theme_mode')); } catch (e) {}
    if (hasData) lsSet(WELCOME_DONE, '1');
    else { location.replace('/welcome.html'); return; }
  }

  // ---------------------------------------------------------------------------
  // The bridge
  // ---------------------------------------------------------------------------
  var noop = function () {};
  var resolved = function (v) { return function () { return Promise.resolve(v); }; };
  var zoom = 1;
  var zoomQuery = window.matchMedia ? window.matchMedia('(max-width: 760px), (pointer: coarse) and (max-width: 1100px)') : null;
  function applyZoom() {
    var use = zoom !== 1 && !(zoomQuery && zoomQuery.matches);
    root.style.zoom = use ? String(zoom) : '';
  }
  if (zoomQuery && zoomQuery.addEventListener) zoomQuery.addEventListener('change', applyZoom);

  window.electronAPI = {
    serverToken: '',
    isWeb: true,
    isWindows: /Windows/i.test(ua),

    // Window chrome: the browser owns it.
    minimizeWindow: noop,
    maximizeWindow: function () {
      if (document.fullscreenElement) document.exitFullscreen().catch(noop);
      else if (root.requestFullscreen) root.requestFullscreen().catch(noop);
    },
    closeWindow: noop,
    onWindowVisibility: function (cb) {
      document.addEventListener('visibilitychange', function () { cb(document.visibilityState === 'visible'); });
    },
    restartApp: function () { location.reload(); },

    getServerPort: function () { return Promise.resolve(Number(location.port) || (location.protocol === 'https:' ? 443 : 80)); },
    setAppProxy: resolved({ success: false }),
    getGpuCompositing: resolved(true),

    // Files
    pickMedia: pickMedia,
    pickLocalFiles: function () {
      return pickFiles({ accept: 'audio/*,.mp3,.flac,.wav,.ogg,.m4a,.aac,.opus,.webm', multiple: true }).then(filesToTracks);
    },
    pickLocalFolder: function () {
      return pickFiles({ directory: true, multiple: true }).then(filesToTracks);
    },
    importAudioFiles: resolved([]),
    rescanLocalMetadata: resolved([]),
    getDefaultMusicDir: resolved(''),

    // Zoom (Settings -> Interface scale). The desktop default is 0.9 to fit
    // a laptop window; on a phone the layout is already sized for the screen
    // and CSS zoom would shift the fixed bars, so it only applies on larger
    // screens.
    setZoomFactor: function (f) {
      zoom = Number(f) || 1;
      applyZoom();
    },
    getZoomFactor: function () { return zoom; },
    clearWebFrameCache: noop,

    // Desktop integrations with no browser counterpart.
    discordRpcUpdate: noop,
    discordRpcClear: noop,
    discordRpcSetEnabled: noop,
    discordRpcGetEnabled: resolved(false),
    discordRpcGetConnected: resolved(false),
    discordRpcReconnect: resolved(false),
    setTrayOnClose: noop,
    getMultiInstance: resolved(false),
    setMultiInstance: noop,
    setMediaKeys: noop,
    mediaKeysActive: noop,
    onMediaCommand: noop,
    onMediaControl: noop,
    toggleMiniWindow: resolved(false),
    setMiniLyrics: resolved(false),
    getLauncherInfo: resolved({ supported: false, installed: false }),
    installLauncher: resolved({ success: false }),
    listThemes: resolved([]),
    importThemes: resolved([]),
    setThemeEnabled: noop,
    disableAllThemes: noop,
    removeTheme: noop,
    listPlugins: resolved([]),
    setPluginEnabled: noop,
    disableAllPlugins: noop,
    openPluginsFolder: noop,
    removePlugin: noop,
    importPlugins: resolved([]),
    googleLogin: resolved({ success: false, error: 'Google sign-in is only available in the desktop app' }),
    googleLogout: resolved({ success: true }),
    googleAuthStatus: resolved({ loggedIn: false }),
    googleImportLibrary: resolved({ success: false, error: 'Only available in the desktop app' }),
    showPlaylistContextMenu: resolved('export'),

    // Storage and cache
    getCacheSize: function () { return idbEstimate(); },
    clearCache: function () {
      var jobs = [idbClear()];
      if (window.caches) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('moodex-img') === 0; }).map(function (k) { return caches.delete(k); })); }));
      return Promise.all(jobs).then(function () { return { success: true }; }).catch(function () { return { success: true }; });
    },
    getDataDir: resolved('Browser storage'),
    pickDataDir: resolved(null),
    setDataDir: resolved({ success: false }),
    getDownloadDir: resolved('Browser downloads folder'),
    pickDownloadDir: resolved(null),
    setDownloadDir: resolved({ success: false }),
    resetDownloadDir: resolved({ success: true }),
    openLogsFolder: noop,
    openDownloadsFolder: noop,
    getDiagnostics: function () {
      return Promise.resolve({ version: VERSION, platform: 'web', userAgent: ua, logs: [] });
    },
    getAudioOutputInfo: resolved({ success: false, devices: [] }),
    getAppCss: resolved(''),
    logError: function (level, message) { try { console[level === 'warn' ? 'warn' : 'error']('[moodex]', message); } catch (e) {} },

    // Updates: the web build is always the latest deployment.
    getAppVersion: resolved(VERSION),
    checkForUpdates: resolved({ available: false, upToDate: true, version: VERSION }),
    updateAction: noop,
    installUpdateNow: noop,
    onUpdateAvailable: noop,
    onUpdateDownloaded: noop,
    onUpdateProgress: noop,
    onUpdateReady: noop,
    onUpdateError: noop,
    onUpdateNotAvailable: noop,

    openExternal: function (u) {
      try { window.open(u, '_blank', 'noopener'); } catch (e) {}
    },

    savePlaylistsJson: function (payload) {
      try {
        saveBlob(new Blob([payload.content || ''], { type: 'application/json' }), payload.defaultName || 'moodex-playlists.json');
        return Promise.resolve({ success: true });
      } catch (e) {
        return Promise.resolve({ success: false, error: e.message });
      }
    },
    accountExport: function (payload) {
      return encryptAccount(payload).then(function (bytes) {
        saveBlob(new Blob([bytes], { type: 'application/octet-stream' }), 'moodex-account.mdacc');
        return { success: true };
      }).catch(function (e) { return { success: false, error: e.message }; });
    },
    accountImport: function () {
      return pickFiles({ accept: '.mdacc' }).then(function (files) {
        if (!files[0]) return { canceled: true };
        return files[0].arrayBuffer().then(decryptAccount).then(function (data) {
          lsSet(WELCOME_DONE, '1');
          return { success: true, data: data };
        });
      }).catch(function (e) { return { success: false, error: e.message }; });
    },

    // Onboarding
    welcomeFinish: function (detail) {
      lsSet(WELCOME_DONE, '1');
      try {
        var result = detail && !detail.skipped ? detail : null;
        if (result) sessionStorage.setItem(WELCOME_RESULT, JSON.stringify(result));
      } catch (e) {}
      location.replace('/');
    },
    onWelcomeResult: function (cb) {
      var raw = null;
      try { raw = sessionStorage.getItem(WELCOME_RESULT); sessionStorage.removeItem(WELCOME_RESULT); } catch (e) {}
      if (!raw) return;
      try { var d = JSON.parse(raw); setTimeout(function () { cb(d); }, 300); } catch (e) {}
    }
  };

  // welcome.html hides its minimize/close buttons when the bridge has no
  // window control, which is the right look for a web page.
  if (onWelcomePage) {
    delete window.electronAPI.minimizeWindow;
    delete window.electronAPI.closeWindow;
  }

  // ---------------------------------------------------------------------------
  // Phone layout: tapping the mini player opens a full-screen Now Playing
  // sheet (web.css, body.web-np-open). The back button / gesture closes it.
  // ---------------------------------------------------------------------------
  var phoneQuery = window.matchMedia ? window.matchMedia('(max-width: 760px)') : null;
  function isPhone() { return !!(phoneQuery && phoneQuery.matches); }
  function setSheet(open, fromHistory) {
    var body = document.body;
    if (!body || body.classList.contains('web-np-open') === open) return;
    body.classList.toggle('web-np-open', open);
    if (open && !fromHistory) {
      try { history.pushState({ moodexSheet: true }, ''); } catch (e) {}
    } else if (!open && !fromHistory && history.state && history.state.moodexSheet) {
      try { history.back(); } catch (e) {}
    }
  }
  window.addEventListener('popstate', function () {
    if (document.body && document.body.classList.contains('web-np-open')) setSheet(false, true);
  });
  if (phoneQuery && phoneQuery.addEventListener) {
    phoneQuery.addEventListener('change', function () { if (!isPhone()) setSheet(false); });
  }
  document.addEventListener('DOMContentLoaded', function () {
    if (!document.querySelector('.playbar-left')) return;
    var close = document.createElement('button');
    close.className = 'web-np-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Close Now Playing');
    close.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    close.addEventListener('click', function () { setSheet(false); });
    document.body.appendChild(close);

    var left = document.querySelector('.playbar-left');
    if (left) {
      left.addEventListener('click', function (e) {
        if (!isPhone() || document.body.classList.contains('web-np-open')) return;
        if (e.target.closest && e.target.closest('button')) return;
        e.preventDefault();
        e.stopPropagation();
        setSheet(true);
      }, true);
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('web-np-open')) setSheet(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Service worker: offline app shell, cached artwork, /__local/ files.
  // ---------------------------------------------------------------------------
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !/[?&]nosw\b/.test(location.search)) {
    swReady = navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function () {
      return navigator.serviceWorker.ready;
    }).catch(function (e) { console.warn('[web] service worker unavailable', e); });
  }

  // Ask the browser not to evict playlists and downloads under storage pressure.
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(noop); } catch (e) {}
})();
