#!/usr/bin/env node
/*
 * Serves the web build locally: web-dist/ as static files plus the API, the
 * same way Vercel does. Also works for self-hosting on any Node server.
 *
 *   npm run web:build && npm run web:serve     -> http://localhost:3000
 *   PORT=8080 HOST=0.0.0.0 node scripts/serve-web.js
 */
'use strict';

process.env.MOODEX_WEB = '1';
if (!process.env.MOODEX_DATA_DIR) {
  process.env.MOODEX_DATA_DIR = require('path').join(require('os').tmpdir(), 'moodex-web');
}

const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleRequest } = require('../src/server/server');

const ROOT = path.join(__dirname, '..', 'web-dist');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff2': 'font/woff2'
};

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error('web-dist/ is missing. Run: node scripts/build-web.js');
  process.exit(1);
}

http.createServer((req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  if (pathname.startsWith('/api/')) return handleRequest(req, res);

  let file = path.normalize(path.join(ROOT, pathname));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (pathname === '/' || !path.extname(pathname)) file = path.join(ROOT, pathname.startsWith('/welcome') ? 'welcome.html' : 'index.html');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    const headers = { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size };
    if (path.basename(file) === 'sw.js') headers['Cache-Control'] = 'no-cache';
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  });
}).listen(PORT, HOST, () => {
  console.log(`Melodix web: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
