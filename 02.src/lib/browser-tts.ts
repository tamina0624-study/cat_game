import type { TtsEvent } from './browser-tts-protocol';
import { selectedVoice, voiceTuning, normalizeTuning, speechRates, type VoiceId, type VoiceTuning } from './tts-voices';
// oxlint-disable-next-line import/default -- Vite generates the default URL export for ?worker&url.
import workerUrl from './browser-tts.worker?worker&url';

/** Browser-only Japanese speech. No text is sent to a speech service. */
export function createBrowserTts(onStatus: (message: string) => void) {
  let worker: Worker | undefined, context: AudioContext | undefined, nextId = 0, playAt = 0;
  let disposed = false;
  const sources = new Set<AudioBufferSourceNode>();
  const playbackWaiters = new Set<() => void>();
  let playbackGeneration = 0;
  const pending = new Map<number, { resolve: () => void; reject: (error: Error) => void; onAudio?: (event: Extract<TtsEvent, {type:'audio'}>) => void }>();
  function getWorker() {
    if (disposed) throw Error('読み上げは終了しています。');
    if (!worker) {
      worker = new Worker(new URL(workerUrl, window.location.href), { type: 'module' });
      worker.onmessage = (event: MessageEvent<TtsEvent>) => {
        const data = event.data, job = pending.get(data.id);
        if (!job) return;
        if (data.type === 'status') onStatus(data.message);
        else if (data.type === 'audio') {
          try { job.onAudio?.(data); } catch (error) { pending.delete(data.id); job.reject(error instanceof Error ? error : Error(String(error))); }
        } else {
          pending.delete(data.id);
          if (data.type === 'error') job.reject(Error(data.message));
          else job.resolve();
        }
      };
      worker.onerror = () => {
        for (const job of pending.values()) job.reject(Error('音声エンジンが停止しました。もう一度試すか、ページを再読み込みしてください。'));
        pending.clear(); worker?.terminate(); worker = undefined;
      };
    }
    return worker;
  }
  function request(text?: string, onAudio?: (event: Extract<TtsEvent, {type:'audio'}>) => void, voice: VoiceId = selectedVoice(), speed = 1.05) {
    const current = getWorker(), id = ++nextId;
    return new Promise<void>((resolve, reject) => { pending.set(id, { resolve, reject, onAudio }); current.postMessage({ id, text, voice, speed }); });
  }
  function unlock() { context ??= new AudioContext(); return context.resume(); }
  function stop() {
    playbackGeneration++;
    for (const source of sources) { source.onended = null; source.stop(); source.disconnect(); }
    sources.clear(); playAt = 0;
    for (const resolve of playbackWaiters) resolve();
    playbackWaiters.clear();
  }
  async function speak(text: string, voice: VoiceId = selectedVoice(), options: VoiceTuning = voiceTuning(voice)) {
    const tuning = normalizeTuning(options), rates = speechRates(tuning);
    await unlock();
    stop();
    const generation = playbackGeneration;
    let last: AudioBufferSourceNode | undefined;
    let ended: Promise<void> = Promise.resolve();
    const started = performance.now();
    try { await request(text, event => {
      if (disposed || generation !== playbackGeneration) return;
      const audio = context!;
      const buffer = audio.createBuffer(1, event.pcm.length, event.sampleRate);
      buffer.copyToChannel(new Float32Array(event.pcm), 0);
      const source = audio.createBufferSource(); source.buffer = buffer; source.connect(audio.destination);
      source.playbackRate.value = rates.playback;
      if (!last) console.info('browser-tts first audio', { elapsedMs: Math.round(performance.now() - started), synthesisMs: event.synthesisMs });
      last = source; sources.add(source);
      ended = new Promise(resolve => {
        playbackWaiters.add(resolve);
        source.onended = () => { sources.delete(source); source.disconnect(); playbackWaiters.delete(resolve); resolve(); };
      });
      const start = Math.max(audio.currentTime + 0.02, playAt);
      source.start(start); playAt = start + buffer.duration / rates.playback + tuning.pause;
      onStatus('むぎがお話ししています');
    }, voice, rates.synthesis); } catch (error) { stop(); throw error; }
    await ended;
    if (!disposed && generation === playbackGeneration) onStatus('声の準備ができました');
  }
  return {
    unlock, prepare: (voice?: VoiceId) => request(undefined, undefined, voice), speak, stop,
    dispose() {
      disposed = true; stop(); worker?.terminate(); worker = undefined;
      for (const job of pending.values()) job.reject(Error('読み上げを終了しました。'));
      pending.clear(); void context?.close();
    },
  };
}
