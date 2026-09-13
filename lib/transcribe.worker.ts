import { pipeline } from '@huggingface/transformers';

let transcriber: any;
self.onmessage = async (event: MessageEvent<{ audio: Float32Array }>) => {
  try {
    if (!transcriber) transcriber = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny', { dtype: 'q8' });
    const result = await transcriber(event.data.audio, { language: 'japanese', task: 'transcribe' });
    self.postMessage({ text: result.text as string });
  } catch {
    self.postMessage({ error: '音声認識モデルを準備できませんでした。ネット接続を確認して、もう一度試してね。' });
  }
};
