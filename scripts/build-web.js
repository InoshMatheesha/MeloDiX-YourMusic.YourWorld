#!/usr/bin/env node
/*
 * Builds the browser version of Melodix into web-dist/.
 *
 * The desktop renderer (src/renderer) is reused as-is. This script copies it,
 * rewrites the places that assume Electron (absolute http://127.0.0.1:<port>
 * links to the bundled server, the narrow-window "mini player" switch), and
 * adds the web layer from web/: the electronAPI shim, mobile CSS, service
 * worker and PWA manifest.
 *
 *   node scripts/build-web.js        -> web-dist/
 *   node scripts/serve-web.js        -> serve it locally with the API
 *
 * On Vercel this is the build command (see vercel.json); the API is served by
 * api/index.js from the same src/server/server.js the desktop app uses.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'web-dist');
const RENDERER = path.join(ROOT, 'src', 'renderer');
const WEB = path.join(ROOT, 'web');
const pkg = require(path.join(ROOT, 'package.json'));

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function copyDir(from, to, filter) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (filter && !filter(src, entry)) continue;
    if (entry.isDirectory()) copyDir(src, dest, filter);
    else fs.copyFileSync(src, dest);
  }
}
function read(p) { return fs.readFileSync(p, 'utf8'); }
function write(p, s) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); }

// Exact-match replacement that fails the build if the source moved on, so a
// refactor in app.js cannot silently drop a web fix.
function replaceExact(src, from, to, label) {
  const count = src.split(from).length - 1;
  if (count === 0) throw new Error(`build-web: pattern not found (${label}): ${from.slice(0, 80)}`);
  return src.split(from).join(to);
}

// Renderer -> server links. Desktop builds them as http://127.0.0.1:<port>;
// on the web the API is same-origin.
function rewriteServerUrls(src, label) {
  let out = src
    // `http://127.0.0.1:${state.serverPort}/api/x`  ->  `${location.origin}/api/x`
    .replace(/http:\/\/127\.0\.0\.1:\$\{[^}]+\}/g, '${location.origin}')
    // 'http://127.0.0.1:' + (state.serverPort || 38472) + '/api/x'  ->  location.origin + '/api/x'
    .replace(/(['"])http:\/\/127\.0\.0\.1:\1\s*\+\s*(?:\([^()]*\)|[\w.$]+)\s*\+/g, 'location.origin +');
  out = out.replace(/(['"`])\.\.\/\.\.\/(assets|vendor)\//g, '$1/$2/');
  const left = out.match(/http:\/\/127\.0\.0\.1:(?:\$\{|['"]\s*\+)/g);
  if (left) throw new Error(`build-web: ${left.length} unrewritten server URL(s) left in ${label}`);
  return out;
}

function patchAppJs(src) {
  src = rewriteServerUrls(src, 'app.js');
  // Desktop switches to the mini player when the window is narrower than
  // 520px. On the web that is simply a phone, which gets the mobile layout.
  src = replaceExact(src,
    'const isMini = window.innerWidth <= 520;',
    'const isMini = !window.__MOODEX_WEB__ && window.innerWidth <= 520;',
    'mini layout');
  // "Already proxied?" check keyed on the desktop server's host.
  src = replaceExact(src,
    "if (raw.indexOf('127.0.0.1:' + port) !== -1) return raw; // already proxied",
    "if (raw.indexOf('/api/image-proxy') !== -1) return raw; // already proxied",
    'image proxy check');
  // Downloads fetch audio through the proxy unless it is already local.
  src = replaceExact(src,
    "const isLoopback = fetchUrl.startsWith('http://127.0.0.1') || fetchUrl.startsWith('http://localhost');",
    "const isLoopback = fetchUrl.startsWith(location.origin) || fetchUrl.startsWith('/') || fetchUrl.startsWith('blob:');",
    'download loopback check');
  return src;
}

const WEB_HEAD = `
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
  <meta name="theme-color" content="#121214">
  <meta name="color-scheme" content="dark light">
  <meta name="description" content="Melodix — free music player for YouTube Music, SoundCloud and your own files. No account, no tracking.">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Melodix">
  <meta name="format-detection" content="telephone=no">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`;

function patchHtml(src, label, isMain) {
  src = replaceExact(src, '<meta name="viewport" content="width=device-width, initial-scale=1.0">', WEB_HEAD.trim(), label + ' viewport');
  // The shim must define window.electronAPI before any renderer script runs,
  // and web.css must come after the app's own stylesheet to override it.
  const inject = (isMain ? '  <link rel="stylesheet" href="/web.css">\n' : '') + '  <script src="/shim.js"></script>\n</head>';
  src = replaceExact(src, '</head>', inject, label + ' head');
  src = src.replace(/(src|href)="\.\.\/\.\.\/(assets|vendor)\//g, '$1="/$2/');
  // Inline scripts (welcome.html) carry server links too.
  src = rewriteServerUrls(src, label);
  return src;
}

function main() {
  const started = Date.now();
  rmrf(OUT);
  fs.mkdirSync(OUT, { recursive: true });

  // Static assets the renderer references.
  copyDir(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), (src) => !/\.ico$/i.test(src));
  copyDir(path.join(ROOT, 'vendor'), path.join(OUT, 'vendor'));
  copyDir(path.join(WEB, 'icons'), path.join(OUT, 'icons'));

  // Renderer scripts and styles.
  for (const f of ['audio.js', 'shapes.js', 'lyrics-rtl.js', 'track-sort.js']) {
    write(path.join(OUT, f), rewriteServerUrls(read(path.join(RENDERER, f)), f));
  }
  write(path.join(OUT, 'app.js'), patchAppJs(read(path.join(RENDERER, 'app.js'))));
  write(path.join(OUT, 'styles.css'), read(path.join(RENDERER, 'styles.css')).replace(/url\((['"]?)\.\.\/\.\.\/(assets|vendor)\//g, 'url($1/$2/'));
  write(path.join(OUT, 'index.html'), patchHtml(read(path.join(RENDERER, 'index.html')), 'index.html', true));
  write(path.join(OUT, 'welcome.html'), patchHtml(read(path.join(RENDERER, 'welcome.html')), 'welcome.html', false));

  // Web layer.
  const buildId = crypto.createHash('sha1')
    .update(['app.js', 'styles.css', 'index.html', 'welcome.html'].map((f) => read(path.join(OUT, f))).join('\n'))
    .update(read(path.join(WEB, 'shim.js')) + read(path.join(WEB, 'web.css')))
    .digest('hex').slice(0, 12);
  write(path.join(OUT, 'shim.js'), read(path.join(WEB, 'shim.js')).replace(/__MOODEX_VERSION__/g, pkg.version));
  write(path.join(OUT, 'sw.js'), read(path.join(WEB, 'sw.js')).replace(/__MOODEX_BUILD__/g, pkg.version + '-' + buildId));
  write(path.join(OUT, 'web.css'), read(path.join(WEB, 'web.css')));
  write(path.join(OUT, 'manifest.webmanifest'), read(path.join(WEB, 'manifest.webmanifest')));

  console.log(`build-web: Melodix ${pkg.version} (${buildId}) -> ${path.relative(ROOT, OUT)} in ${Date.now() - started}ms`);
}

main();
