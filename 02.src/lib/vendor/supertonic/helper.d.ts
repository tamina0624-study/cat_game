import type { InferenceSession, Tensor } from 'onnxruntime-web';
export class UnicodeProcessor { constructor(indexer: number[]); }
export class Style { constructor(ttl: Tensor, dp: Tensor); }
export class TextToSpeech {
  constructor(config: object, processor: UnicodeProcessor, duration: InferenceSession, encoder: InferenceSession, estimator: InferenceSession, vocoder: InferenceSession);
  sampleRate: number;
  call(text: string, language: string, style: Style, steps: number, speed?: number): Promise<{ wav: number[]; duration: number[] }>;
}
