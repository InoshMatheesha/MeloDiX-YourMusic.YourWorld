// Vercel entry point for the web build. Every /api/* request is rewritten
// here (see vercel.json) and handed to the same request handler the desktop
// app runs on 127.0.0.1, switched into web mode.

// Both must be set before the server module loads: src/shared/platform.js
// resolves the data directory at require time, and /tmp is the only writable
// path in a Vercel function.
process.env.MOODEX_WEB = '1';
if (!process.env.MOODEX_DATA_DIR) process.env.MOODEX_DATA_DIR = '/tmp/moodex';

const { handleRequest } = require('../src/server/server');

// vercel.json rewrites /api/<path> to /api/index?__p=<path>. Depending on the
// runtime, req.url is either the original URL or the rewritten one, so rebuild
// the original from __p when it is present.
function restoreOriginalUrl(req) {
  const parsed = new URL(req.url || '/', 'http://localhost');
  const p = parsed.searchParams.get('__p');
  if (p === null) return;
  parsed.searchParams.delete('__p');
  const query = parsed.searchParams.toString();
  req.url = '/api/' + p.replace(/^\/+/, '') + (query ? '?' + query : '');
}

module.exports = async (req, res) => {
  try { restoreOriginalUrl(req); } catch (e) {}
  return handleRequest(req, res);
};
