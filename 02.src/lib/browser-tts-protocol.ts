import type { VoiceId } from './tts-voices';
export type TtsRequest = { id: number; text?: string; voice?: VoiceId; speed?: number };
export type TtsEvent =
  | { id: number; type: 'status'; message: string }
  | { id: number; type: 'audio'; pcm: Float32Array; sampleRate: number; synthesisMs: number }
  | { id: number; type: 'done' }
  | { id: number; type: 'error'; message: string };
