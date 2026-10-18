import assert from 'node:assert/strict';
const base = process.argv[2] ?? 'http://127.0.0.1:3010';
for (const path of ['/', '/review', '/voice-samples', '/?model=seated', '/?model=original', '/models/mugi-tabby-white-v7.glb', '/models/mugi-calico-v3.glb', '/audio/meow.ogg', '/audio/pcm-capture.worklet.js']) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, path);
  assert.ok((await response.arrayBuffer()).byteLength > 0, path);
  console.log('PASS', path, 200);
}
for (const path of ['/api/cat-chat', '/api/cat-voice']) {
  let response;
  let body;
  for (let attempt = 0; attempt < 2; attempt++) {
    response = await fetch(new URL(path, base), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      signal: AbortSignal.timeout(20000),
    });
    body = await response.text();
    if (body.startsWith('{')) break;
  }
  assert.ok([400, 503].includes(response.status), path);
  assert.equal(response.headers.get('cache-control'), 'no-store', path);
  assert.equal(typeof JSON.parse(body).error, 'string', path);
  console.log('PASS', path, response.status);
}
