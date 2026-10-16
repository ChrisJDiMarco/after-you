'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');

const MIME = Object.freeze({
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
});
function allowedFile(name) {
  return name === 'index.html'
    || /^src\/[a-zA-Z0-9_/-]+\.(?:js|css)$/.test(name)
    || /^assets\/[a-zA-Z0-9_/-]+\.(?:svg|png|jpg|webp|woff2|mp3|wav|ogg)$/.test(name)
    || /^node_modules\/three\/build\/three\.(?:module|core)\.js$/.test(name)
    || /^node_modules\/three\/examples\/jsm\/[a-zA-Z0-9_/-]+\.js$/.test(name);
}
function contentSecurityPolicy(html = '') {
  // Only explicitly declared import maps may execute inline; ordinary scripts stay external.
  const hashes = [...html.matchAll(/<script\b[^>]*\btype=["']importmap["'][^>]*>([\s\S]*?)<\/script\s*>/gi)]
    .map((match) => `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`);
  return [
    "default-src 'none'", `script-src 'self' ${hashes.join(' ')}`,
    "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
    "font-src 'self'", "media-src 'self' blob:", "connect-src 'none'",
    "object-src 'none'", "frame-src 'none'", "worker-src 'none'",
    "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'",
  ].join('; ');
}
async function startServer(root = __dirname) {
  const realRoot = await fs.realpath(root);
  let origin;
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    const reject = (status) => { res.writeHead(status); res.end(); };
    if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin)) return reject(403);
    if (req.method !== 'GET' && req.method !== 'HEAD') return reject(405);
    try {
      const rawPath = (req.url || '').split('?')[0];
      const decoded = decodeURIComponent(rawPath);
      if (!decoded.startsWith('/') || decoded.includes('\\') || decoded.includes('\0') || decoded.split('/').includes('..')) return reject(403);
      const name = decoded === '/' ? 'index.html' : decoded.slice(1);
      if (!allowedFile(name)) return reject(404);
      const file = await fs.realpath(path.join(realRoot, name));
      if (!file.startsWith(`${realRoot}${path.sep}`)) return reject(403);
      const body = await fs.readFile(file);
      res.setHeader('Content-Type', MIME[path.extname(name)]);
      res.setHeader('Content-Security-Policy', contentSecurityPolicy(name === 'index.html' ? body.toString('utf8') : ''));
      res.setHeader('Content-Length', body.length);
      res.writeHead(200);
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      reject(error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : error instanceof URIError ? 400 : 500);
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  return { server, origin, close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
}
module.exports = { startServer, allowedFile, contentSecurityPolicy };
