import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function loadRoute(name, fetchImpl, key = 'synthetic-test-only') {
  const exports = {};
  const source = readFileSync(new URL(`../app/api/${name}/route.ts`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  runInNewContext(code, {
    exports, require: () => ({ env: { OPENROUTER_API_KEY: key } }),
    Response, AbortSignal, fetch: fetchImpl,
    console: { info() {}, warn() {}, error() {} },
  });
  return exports.POST;
}
const request = (body) => new Request('https://example.test/api', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('both APIs reject missing configuration without contacting upstream', async () => {
  for (const route of ['cat-chat', 'cat-voice']) {
    const post = loadRoute(route, () => { throw Error('unexpected network call'); }, '');
    const response = await post(request({}));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(typeof (await response.json()).error, 'string');
  }
});

test('chat rejects invalid input and accepts the 600-character boundary', async () => {
  let calls = 0;
  const post = loadRoute('cat-chat', async () => {
    calls++;
    return Response.json({ choices: [{ message: { content: 'reply' } }] });
  });
  assert.equal((await post(request({ message: '' }))).status, 400);
  assert.equal((await post(request({ message: 'a'.repeat(601) }))).status, 400);
  assert.equal((await post(request({ message: 'a'.repeat(600) }))).status, 200);
  assert.equal(calls, 1);
});

test('chat retries an empty reply once, filters history, and limits reply length', async () => {
  let calls = 0;
  const post = loadRoute('cat-chat', async (_url, options) => {
    calls++;
    const body = JSON.parse(options.body);
    assert.equal(body.max_tokens, 128);
    assert.equal(body.provider.sort, 'latency');
    assert.equal(body.messages.some((message) => message.role === 'invalid'), false);
    assert.ok(body.messages.length <= 8);
    return Response.json({ choices: [{ message: { content: calls === 1 ? '' : 'x'.repeat(1000) } }] });
  });
  const response = await post(request({
    message: 'hello', history: [...Array.from({ length: 8 }, () => ({ role: 'user', content: 'old' })), { role: 'invalid', content: 'ignore' }],
  }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).reply.length, 900);
  assert.equal(calls, 2);
});

test('chat returns 502 on upstream failure without retrying', async () => {
  let calls = 0;
  const post = loadRoute('cat-chat', async () => { calls++; return Response.json({ error: 'unavailable' }, { status: 503 }); });
  assert.equal((await post(request({ message: 'hello' }))).status, 502);
  assert.equal(calls, 1);
});

test('voice API validates audio and chains transcription and reply', async () => {
  let calls = 0;
  const post = loadRoute('cat-voice', async () => {
    calls++;
    return Response.json({ choices: [{ message: { content: calls === 1 ? 'recognized text' : 'reply' } }] });
  });
  assert.equal((await post(request({ audio: '' }))).status, 400);
  assert.equal((await post(request({ audio: 'a'.repeat(3000001) }))).status, 400);
  const response = await post(request({ audio: 'synthetic-audio-placeholder' }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { transcript: 'recognized text', reply: 'reply' });
  assert.equal(calls, 2);
});
