import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(name, globals = {}) {
  const exports = {};
  const source = readFileSync(new URL(`./${name}.ts`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, { exports, require: name => name === './tts-voices' ? load('tts-voices', globals) : ({default:'/tts-worker.js'}), URL, Float32Array, performance, console, Event, ...globals });
  return exports;
}

test('Japanese speech chunks preserve text, remove tags, and bound long sentences', () => {
  const {speechChunks} = load('browser-tts-text');
  assert.equal(speechChunks('こんにちは！また遊ぼうにゃ。').join(''), 'こんにちは！また遊ぼうにゃ。');
  const long = 'あ'.repeat(250) + '。';
  const chunks = speechChunks(long);
  assert.equal(chunks.join(''), long);
  assert.ok(chunks.every(chunk => Array.from(chunk).length <= 100));
  assert.equal(speechChunks('<ja>こんにちは</ja>')[0], 'こんにちは');
  assert.equal(speechChunks('  ').length, 0);
});

function browser() {
  const workers = [], sources = [], statuses = [];
  const storage = new Map();
  class Worker {
    requests = [];
    constructor() { workers.push(this); }
    postMessage(value) { this.requests.push(value); }
    receive(value) { this.onmessage({data:value}); }
    terminate() { this.terminated = true; }
  }
  class AudioContext {
    currentTime = 1;
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createBuffer(_channels,length,rate) { return { duration:length/rate, copyToChannel(){} }; }
    createBufferSource() {
      const source = {playbackRate:{value:1},connect(){},disconnect(){},start(time){this.time=time;},stop(){this.stopped=true;}};
      sources.push(source); return source;
    }
  }
  const {createBrowserTts} = load('browser-tts', {Worker,AudioContext,window:{location:{href:'http://localhost/'},localStorage:{getItem:key=>storage.get(key)??null}}});
  return {tts:createBrowserTts(value=>statuses.push(value)), workers, sources, statuses, storage};
}
const tick = () => new Promise(resolve=>setImmediate(resolve));

test('reuses the worker and schedules sentence audio without overlapping', async () => {
  const {tts,workers,sources} = browser();
  const preparation = tts.prepare();
  workers[0].receive({id:1,type:'done'}); await preparation;
  const speaking = tts.speak('こんにちは。またね。'); await tick();
  assert.equal(workers.length,1);
  for(let i=0;i<2;i++) workers[0].receive({id:2,type:'audio',pcm:new Float32Array(100),sampleRate:100,synthesisMs:10});
  workers[0].receive({id:2,type:'done'});
  assert.ok(sources[1].time >= sources[0].time + 1 / sources[0].playbackRate.value);
  sources.forEach(source=>source.onended()); await speaking;
  tts.dispose(); assert.equal(workers[0].terminated,true);
});

test('dispose rejects pending synthesis and stops all scheduled audio', async () => {
  const {tts,workers,sources} = browser();
  const speaking = tts.speak('こんにちは'); await tick();
  const rejected = assert.rejects(speaking);
  workers[0].receive({id:1,type:'audio',pcm:new Float32Array(100),sampleRate:100,synthesisMs:10});
  tts.dispose(); await rejected;
  assert.ok(sources.every(source=>source.stopped));
});

test('a worker crash clears pending work and permits a fresh worker', async () => {
  const {tts,workers} = browser();
  const first = tts.prepare(); const rejected = assert.rejects(first);
  workers[0].onerror(); await rejected;
  const retry = tts.prepare(); assert.equal(workers.length,2);
  workers[1].receive({id:2,type:'done'}); await retry;
  tts.dispose();
});

test('preview uses its requested voice and conversation uses the saved voice', async () => {
  const {tts,workers,storage} = browser();
  storage.set('mugi.tts.voice','M2');
  const preview = tts.speak('hello','F3'); await tick();
  assert.equal(workers[0].requests[0].voice,'F3');
  workers[0].receive({id:1,type:'done'}); await preview;
  assert.equal(storage.get('mugi.tts.voice'),'M2');
  const conversation = tts.speak('hello'); await tick();
  assert.equal(workers[0].requests[1].voice,'M2');
  workers[0].receive({id:2,type:'done'}); await conversation;
  tts.dispose();
});

test('invalid or unavailable saved voices fall back to F2 and audio cache separates voices', () => {
  const {selectedVoice,speechCacheKey} = load('tts-voices', {window:{localStorage:{getItem:()=> 'invalid'}}});
  assert.equal(selectedVoice(),'F2');
  assert.notEqual(speechCacheKey('F1','hello'),speechCacheKey('M1','hello'));
  const unavailable = load('tts-voices');
  assert.equal(unavailable.selectedVoice(),'F2');
  assert.equal(unavailable.saveVoice('F2'),false);
});

test('custom F2 applies pitch, compensates synthesis speed, and leaves a sentence pause', async () => {
  const {tts,workers,sources,storage} = browser();
  storage.set('mugi.tts.voice','F2');
  storage.set('mugi.tts.tuning.F2', JSON.stringify({speed:0.94,pitch:1.5,pause:0.2}));
  const speaking=tts.speak('hello again');await tick();
  const rate=2**(1.5/12);
  assert.ok(Math.abs(workers[0].requests[0].speed - 1.05*0.94/rate)<1e-9);
  for(let i=0;i<2;i++) workers[0].receive({id:1,type:'audio',pcm:new Float32Array(100),sampleRate:100,synthesisMs:1});
  workers[0].receive({id:1,type:'done'});
  assert.equal(sources[0].playbackRate.value,rate);
  assert.ok(Math.abs(sources[1].time-sources[0].time-1/rate-0.2)<1e-9);
  sources.forEach(s=>s.onended());await speaking;tts.dispose();
});

test('tuning rejects invalid values and separates cached audio by synthesis speed', () => {
  const {normalizeTuning,speechRates,speechCacheKey,voiceTuning}=load('tts-voices');
  const invalid=normalizeTuning({speed:Infinity,pitch:100,pause:-5});
  assert.equal(invalid.speed,1);assert.equal(invalid.pitch,3);assert.equal(invalid.pause,0);
  for(const speed of [0.85,1.2]) for(const pitch of [-2,3]) {
    const rates=speechRates({speed,pitch,pause:0});
    assert.ok(rates.synthesis>=0.6 && rates.synthesis<=1.6);
    assert.ok(Math.abs(rates.synthesis*rates.playback-1.05*speed)<1e-9);
  }
  assert.notEqual(speechCacheKey('F2','hello',1),speechCacheKey('F2','hello',1.2));
  assert.equal(voiceTuning('F2').speed,0.92);
  assert.equal(voiceTuning('F2').pitch,3);
  assert.equal(voiceTuning('F2').pause,0.06);
  assert.equal(voiceTuning('F1').speed,1);
});
