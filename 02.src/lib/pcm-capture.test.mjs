import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

function createCapture() {
  let Processor;
  const messages = [];
  class AudioWorkletProcessor {
    constructor() {
      this.port = { postMessage: (message) => messages.push(message) };
    }
  }
  runInNewContext(
    readFileSync(new URL('../public/audio/pcm-capture.worklet.js', import.meta.url), 'utf8'),
    {
      AudioWorkletProcessor,
      Float32Array,
      Math,
      registerProcessor(name, implementation) {
        assert.equal(name, 'pcm-capture');
        Processor = implementation;
      },
    },
  );
  return { capture: new Processor(), messages };
}

test('preserves PCM samples across block boundaries and flushes the final partial block', () => {
  const { capture, messages } = createCapture();
  const input = Float32Array.from({ length: 5000 }, (_, i) => i / 5000);
  for (let i = 0; i < input.length; i += 128) {
    assert.equal(capture.process([[input.subarray(i, i + 128)]]), true);
  }
  assert.equal(messages.length, 1);
  assert.equal(messages[0].audio.length, 4096);
  capture.port.onmessage({ data: 'flush' });
  assert.deepEqual(messages.map((message) => message.type), ['pcm', 'pcm', 'flushed']);
  const actual = Float32Array.from(
    messages.filter((message) => message.type === 'pcm').flatMap((message) => Array.from(message.audio)),
  );
  assert.deepEqual(actual, input);
  const count = messages.length;
  capture.process([[new Float32Array(128)]]);
  capture.port.onmessage({ data: 'flush' });
  assert.equal(messages.length, count + 1);
  assert.equal(messages.at(-1).type, 'flushed');
});

test('acknowledges empty recording without emitting PCM', () => {
  const { capture, messages } = createCapture();
  capture.process([[]]);
  capture.port.onmessage({ data: 'flush' });
  assert.deepEqual(messages.map((message) => message.type), ['flushed']);
});
