'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { startServer, allowedFile } = require('../server.cjs');

function request(origin, url, headers = {}, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(origin, { path: url, headers, method }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.end();
  });
}
test('server serves only local public assets and isolates its origin', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'after-you-server-'));
  const external = await fs.mkdtemp(path.join(os.tmpdir(), 'after-you-external-'));
  const map = '{"imports":{"three":"/node_modules/three/build/three.module.js"}}';
  await fs.mkdir(path.join(root, 'src'));
  await fs.writeFile(path.join(root, 'index.html'), `<script type="importmap">${map}</script><script src="/src/app.js"></script>`);
  await fs.writeFile(path.join(root, 'src/app.js'), 'export const publicAsset = true;');
  await fs.writeFile(path.join(root, 'package.json'), '{"private":"secret"}');
  await fs.writeFile(path.join(external, 'secret.js'), 'secret');
  await fs.symlink(path.join(external, 'secret.js'), path.join(root, 'src/escape.js'));
  const local = await startServer(root);
  t.after(async () => { await local.close(); await fs.rm(root, { recursive: true, force: true }); await fs.rm(external, { recursive: true, force: true }); });
  assert.equal(local.server.address().address, '127.0.0.1');
  const home = await request(local.origin, '/');
  assert.equal(home.status, 200);
  assert.match(home.headers['content-type'], /^text\/html/);
  const hash = createHash('sha256').update(map).digest('base64');
  assert.ok(home.headers['content-security-policy'].includes(`'sha256-${hash}'`));
  assert.ok(home.headers['content-security-policy'].includes("connect-src 'none'"));
  assert.ok(!home.headers['content-security-policy'].split(';')[1].includes('unsafe-inline'));
  assert.equal(home.headers['x-content-type-options'], 'nosniff');
  const script = await request(local.origin, '/src/app.js?v=1');
  assert.equal(script.status, 200);
  assert.match(script.headers['content-type'], /^text\/javascript/);
  assert.equal((await request(local.origin, '/src/app.js', {}, 'HEAD')).body, '');
  for (const hidden of ['/package.json', '/main.cjs', '/server.cjs', '/node_modules/electron/package.json', '/src/missing.js']) {
    assert.equal((await request(local.origin, hidden)).status, 404, hidden);
  }
  for (const attack of ['/../package.json', '/%2e%2e/package.json', '/src%5capp.js', '/src/escape.js', '/src/%00.js']) {
    assert.equal((await request(local.origin, attack)).status, 403, attack);
  }
  assert.equal((await request(local.origin, '/%ZZ')).status, 400);
  assert.equal((await request(local.origin, '/', { Host: 'attacker.invalid' })).status, 403);
  assert.equal((await request(local.origin, '/', { Origin: 'https://attacker.invalid' })).status, 403);
  assert.equal((await request(local.origin, '/', {}, 'POST')).status, 405);
});
test('Three module allowlist includes dependencies without exposing other packages', () => {
  for (const file of ['node_modules/three/build/three.module.js', 'node_modules/three/build/three.core.js', 'node_modules/three/examples/jsm/controls/OrbitControls.js']) assert.equal(allowedFile(file), true, file);
  for (const file of ['node_modules/three/package.json', 'node_modules/three/src/Three.js', 'node_modules/electron/index.js', 'assets/private.json']) assert.equal(allowedFile(file), false, file);
});
