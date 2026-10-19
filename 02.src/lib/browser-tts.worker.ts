import * as ort from 'onnxruntime-web/wasm';
import wasmUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url';
import wasmModuleUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url';
import { Style, TextToSpeech, UnicodeProcessor } from './vendor/supertonic/helper.js';
import { speechChunks } from './browser-tts-text';
import type { TtsRequest, TtsEvent } from './browser-tts-protocol';
import { DEFAULT_VOICE, isVoiceId, speechCacheKey, type VoiceId } from './tts-voices';

const REVISION = '3cadd1ee6394adea1bd021217a0e650ede09a323';
const BASE = `https://huggingface.co/Supertone/supertonic-3/resolve/${REVISION}`;
const CACHE = `mugi-supertonic-3-${REVISION}`;
// A dedicated single-threaded worker also works without cross-origin isolation.
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = { wasm: new URL(wasmUrl, self.location.href).href, mjs: new URL(wasmModuleUrl, self.location.href).href };
let engine: Promise<TextToSpeech> | undefined;
const styles = new Map<VoiceId, Style>();
const audioCache = new Map<string, { pcm: Float32Array; sampleRate: number }>();
const emit = (event: TtsEvent) => self.postMessage(event);

async function asset(path: string, report: (message: string) => void): Promise<ArrayBuffer> {
  const url = `${BASE}/${path}`;
  let cache: Cache | undefined;
  try {
    cache = await caches.open(CACHE);
    const saved = await cache.match(url);
    if (saved) { report(`保存済みの声を読み込んでいます：${path.split('/').pop()}`); return saved.arrayBuffer(); }
  } catch { /* Storage may be disabled; inference still works in memory. */ }
  report(`声をダウンロードしています：${path.split('/').pop()}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(300_000) });
  if (!response.ok) throw Error(`音声モデルの取得に失敗しました（${response.status}）。`);
  const total = Number(response.headers.get('content-length'));
  const reader = response.body?.getReader();
  if (!reader) throw Error('音声モデルのデータを読み取れませんでした。');
  const chunks: Uint8Array[] = [];
  let size = 0, lastReport = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    chunks.push(next.value); size += next.value.length;
    if (Date.now() - lastReport > 500) {
      report(`声を準備中：${(size / 1e6).toFixed(0)}${total ? ` / ${(total / 1e6).toFixed(0)}` : ''} MB（初回は合計約400MB）`);
      lastReport = Date.now();
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  if (cache) {
    try { await cache.put(url, new Response(bytes, { headers: { 'Content-Type': 'application/octet-stream' } })); }
    catch { report('保存容量が不足しています。この画面を開いている間は声を保持します。'); }
  }
  return bytes.buffer;
}

async function initialize(report: (message: string) => void) {
  const decode = async (path: string) => JSON.parse(new TextDecoder().decode(await asset(path, report)));
  const config = await decode('onnx/tts.json');
  const indexer: number[] = await decode('onnx/unicode_indexer.json');
  const sessions: ort.InferenceSession[] = [];
  try {
    // Sequential loading keeps peak download/memory use lower on small devices.
    for (const name of ['duration_predictor', 'text_encoder', 'vector_estimator', 'vocoder']) {
      const bytes = await asset(`onnx/${name}.onnx`, report);
      report('端末で声のモデルを準備しています…');
      sessions.push(await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }));
    }
    const tts = new TextToSpeech(config, new UnicodeProcessor(indexer), sessions[0], sessions[1], sessions[2], sessions[3]);
    return tts;
  } catch (error) {
    await Promise.allSettled(sessions.map(session => session.release()));
    throw error;
  }
}

async function voiceStyle(voice: VoiceId, report: (message: string) => void) {
  let style = styles.get(voice);
  if (!style) {
    const data: { style_ttl: { data: number[][][]; dims: number[] }; style_dp: { data: number[][][]; dims: number[] } } = JSON.parse(new TextDecoder().decode(await asset(`voice_styles/${voice}.json`, report)));
    style = new Style(
      new ort.Tensor('float32', Float32Array.from(data.style_ttl.data.flat(2)), data.style_ttl.dims),
      new ort.Tensor('float32', Float32Array.from(data.style_dp.data.flat(2)), data.style_dp.dims),
    );
    styles.set(voice, style);
  }
  return style;
}

// Serialize initialization and synthesis; ONNX sessions are reused for all turns.
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent<TtsRequest>) => {
  const { id, text, voice = DEFAULT_VOICE, speed = 1.05 } = event.data;
  queue = queue.then(async () => {
    const report = (message: string) => emit({ id, type: 'status', message });
    try {
      if (!isVoiceId(voice)) throw Error('選択した声が見つかりません。');
      if (!Number.isFinite(speed) || speed < 0.6 || speed > 1.6) throw Error('話す速さの設定が不正です。');
      engine ??= initialize(report).catch(error => { engine = undefined; throw error; });
      const tts = await engine;
      const style = await voiceStyle(voice, report);
      if (text !== undefined) {
        const chunks = speechChunks(text);
        if (!chunks.length) throw Error('読み上げる文章がありません。');
        for (const chunk of chunks) {
          const started = performance.now();
          const cacheKey = speechCacheKey(voice, chunk, speed);
          let audio = audioCache.get(cacheKey);
          if (!audio) {
            report('むぎの声を作っています…');
            const output = await tts.call(chunk, 'ja', style, 5, speed);
            const pcm = Float32Array.from(output.wav.slice(0, Math.ceil(output.duration[0] * tts.sampleRate)));
            if (!pcm.length || !pcm.every(Number.isFinite)) throw Error('音声の生成に失敗しました。');
            audio = { pcm, sampleRate: tts.sampleRate };
            if (audioCache.size >= 8) audioCache.delete(audioCache.keys().next().value!);
            audioCache.set(cacheKey, audio);
          }
          emit({ id, type: 'audio', ...audio, synthesisMs: Math.round(performance.now() - started) });
        }
      }
      if (text === undefined) report('声の準備ができました');
      emit({ id, type: 'done' });
    } catch (error) {
      emit({ id, type: 'error', message: error instanceof Error ? error.message : '声の準備に失敗しました。' });
    }
  });
};
