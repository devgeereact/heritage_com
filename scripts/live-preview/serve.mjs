// Serves the production build of heritage_com (dist/) on a local port and
// forwards the API paths to the live site, the way the cPanel host does it
// (same origin: /auth.php, /store.php, /uploads/...).
//
// Forwarding is transparent. Headers are passed as they arrive, Origin included,
// so the live server's own CORS rule (ALLOW_LOCALHOST_CORS, default off) still
// decides what a localhost page may do. Nothing here changes that rule.
//
// Usage: npm run live:preview   (or: node scripts/live-preview/serve.mjs [port])
// Port defaults to 5112, the project's port. Run `npm run build` first.
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.argv[2] || 5112);
const LIVE = 'heritclothing.com';
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

function proxy(req, res) {
  const headers = { ...req.headers, host: LIVE };
  const up = https.request({ host: LIVE, path: req.url, method: req.method, headers }, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  });
  up.on('error', (e) => { res.writeHead(502); res.end('Live site unreachable: ' + e.message); });
  req.pipe(up);
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);
  if (p.endsWith('.php') || p.startsWith('/uploads/') || p.startsWith('/php-api/')) return proxy(req, res);
  let file = path.join(DIST, p);
  if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    const idx = path.join(file, 'index.html');
    file = fs.existsSync(idx) ? idx : path.join(DIST, 'index.html');
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`Herit Clothing production build on http://127.0.0.1:${PORT}/ (API -> https://${LIVE})`));
