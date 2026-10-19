/** Presets shipped with the pinned official Supertonic 3 model. */
export const OFFICIAL_VOICES = ['F1', 'F2', 'F3', 'F4', 'F5', 'M1', 'M2', 'M3', 'M4', 'M5'] as const;
export type VoiceId = typeof OFFICIAL_VOICES[number];
export const DEFAULT_VOICE: VoiceId = 'F2';
const STORAGE_KEY = 'mugi.tts.voice';
const CHANGE_EVENT = 'mugi:voice-changed';
export function isVoiceId(value: unknown): value is VoiceId {
  return typeof value === 'string' && OFFICIAL_VOICES.some(voice => voice === value);
}
export function selectedVoice(): VoiceId {
  try { const stored = window.localStorage.getItem(STORAGE_KEY); return isVoiceId(stored) ? stored : DEFAULT_VOICE; }
  catch { return DEFAULT_VOICE; }
}
export function saveVoice(voice: VoiceId): boolean {
  if (!isVoiceId(voice)) return false;
  try { window.localStorage.setItem(STORAGE_KEY, voice); window.dispatchEvent(new Event(CHANGE_EVENT)); return true; }
  catch { return false; }
}
export function speechCacheKey(voice: VoiceId, text: string, speed = 1.05): string { return `${voice}:${speed.toFixed(4)}:${text}`; }
export type VoiceTuning = { speed: number; pitch: number; pause: number };
export const DEFAULT_TUNING: VoiceTuning = { speed: 1, pitch: 0, pause: 0.12 };
export const F2_DEFAULT_TUNING: VoiceTuning = { speed: 0.92, pitch: 3, pause: 0.06 };
export function normalizeTuning(value: unknown, fallback: VoiceTuning = DEFAULT_TUNING): VoiceTuning {
  const data = value && typeof value === 'object' ? value as Partial<VoiceTuning> : {};
  const bound = (n: unknown, min: number, max: number, fallback: number) => typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  return { speed: bound(data.speed, 0.85, 1.2, fallback.speed), pitch: bound(data.pitch, -2, 3, fallback.pitch), pause: bound(data.pause, 0, 0.5, fallback.pause) };
}
export function voiceTuning(voice: VoiceId): VoiceTuning {
  const fallback = voice === 'F2' ? F2_DEFAULT_TUNING : DEFAULT_TUNING;
  try { return normalizeTuning(JSON.parse(window.localStorage.getItem(`mugi.tts.tuning.${voice}`) ?? 'null'), fallback); }
  catch { return { ...fallback }; }
}
export function tuningSnapshot(): string { return JSON.stringify(voiceTuning('F2')); }
export function saveTuning(voice: VoiceId, tuning: VoiceTuning): boolean {
  try {
    window.localStorage.setItem(`mugi.tts.tuning.${voice}`, JSON.stringify(normalizeTuning(tuning)));
    window.dispatchEvent(new Event(CHANGE_EVENT)); return true;
  } catch { return false; }
}
/** Compensate playback pitch with synthesis duration, to keep speech pace close to the chosen speed. */
export function speechRates(tuning: VoiceTuning) {
  const safe = normalizeTuning(tuning), playback = 2 ** (safe.pitch / 12);
  return { playback, synthesis: 1.05 * safe.speed / playback };
}
export function subscribeVoice(listener: () => void): () => void {
  window.addEventListener('storage', listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => { window.removeEventListener('storage', listener); window.removeEventListener(CHANGE_EVENT, listener); };
}
