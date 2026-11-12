/*
 * Melodix web service worker.
 *  - App shell: stale-while-revalidate, so the app opens instantly (and
 *    offline) and picks up a new deployment on the next launch.
 *  - Artwork from /api/image-proxy: cache-first with a size cap.
 *  - /__local/<id>: audio files and media the user added, read from
 *    IndexedDB, with HTTP range support so seeking works.
 *  - Everything else under /api/ goes straight to the network.
 */
'use strict';

const BUILD = '__MOODEX_BUILD__';
const SHELL_CACHE = 'moodex-shell-' + BUILD;
const IMG_CACHE = 'moodex-img-v1';
const IMG_CACHE_MAX = 600;
const SHELL = ['/', '/index.html', '/welcome.html', '/app.js', '/audio.js', '/shapes.js', '/lyrics-rtl.js', '/track-sort.js',
  '/styles.css', '/web.css', '/shim.js', '/assets/hls.min.js', '/assets/moodex.svg', '/assets/home.svg', '/assets/icon.png',
  '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('moodex-shell-') && k !== SHELL_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// --- IndexedDB (same store the page writes in shim.js) ----------------------
function idbGet(key) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('moodex-web', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('files');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('files', 'readonly');
      const req = tx.objectStore('files').get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    };
  });
}

async function serveLocal(request, id) {
  let blob = null;
  try { blob = await idbGet(id); } catch (e) {}
  if (!blob) return new Response('Not found', { status: 404 });
  const type = blob.type || 'audio/mpeg';
  const size = blob.size;
  const range = request.headers.get('range');
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (m && (m[1] !== '' || m[2] !== '')) {
    let start, end;
    if (m[1] === '') { // suffix range: last N bytes
      start = Math.max(0, size - Number(m[2]));
      end = size - 1;
    } else {
      start = Number(m[1]);
      end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
    }
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    return new Response(blob.slice(start, end + 1, type), {
      status: 206,
      headers: {
        'Content-Type': type,
        'Content-Length': String(end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes'
      }
    });
  }
  return new Response(blob, {
    status: 200,
    headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' }
  });
}

// --- Artwork cache -----------------------------------------------------------
async function trimImageCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= IMG_CACHE_MAX) return;
  await Promise.all(keys.slice(0, keys.length - IMG_CACHE_MAX).map((k) => cache.delete(k)));
}

async function serveImage(request) {
  const cache = await caches.open(IMG_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.status === 200) {
    cache.put(request, res.clone()).then(() => trimImageCache(cache)).catch(() => {});
  }
  return res;
}

// --- App shell ---------------------------------------------------------------
async function serveShell(event) {
  const request = event.request;
  const cache = await caches.open(SHELL_CACHE);
  const isNavigation = request.mode === 'navigate';
  const key = isNavigation ? (new URL(request.url).pathname.startsWith('/welcome') ? '/welcome.html' : '/index.html') : request;
  const cached = await cache.match(key, { ignoreSearch: isNavigation });
  const network = fetch(request).then((res) => {
    if (res && res.ok && res.type === 'basic') cache.put(key, res.clone()).catch(() => {});
    return res;
  });
  if (cached) {
    event.waitUntil(network.catch(() => {}));
    return cached;
  }
  try {
    return await network;
  } catch (e) {
    if (isNavigation) {
      const fallback = await cache.match('/index.html');
      if (fallback) return fallback;
    }
    throw e;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/__local/')) {
    event.respondWith(serveLocal(request, decodeURIComponent(url.pathname.slice('/__local/'.length))));
    return;
  }
  if (url.pathname === '/api/image-proxy') {
    event.respondWith(serveImage(request).catch(() => fetch(request)));
    return;
  }
  if (url.pathname.startsWith('/api/')) return; // network only
  if (url.pathname === '/sw.js') return;

  event.respondWith(serveShell(event));
});
