/* global AudioWorkletProcessor, registerProcessor */
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(4096);
    this.offset = 0;
    this.recording = true;
    this.port.onmessage = (event) => {
      if (event.data === 'flush') {
        this.recording = false;
        this.flush();
        this.port.postMessage({ type: 'flushed' });
      }
    };
  }

  flush() {
    if (!this.offset) return;
    const audio = this.buffer.slice(0, this.offset);
    this.port.postMessage({ type: 'pcm', audio }, [audio.buffer]);
    this.offset = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (this.recording && channel) {
      let index = 0;
      while (index < channel.length) {
        const count = Math.min(channel.length - index, this.buffer.length - this.offset);
        this.buffer.set(channel.subarray(index, index + count), this.offset);
        this.offset += count;
        index += count;
        if (this.offset === this.buffer.length) this.flush();
      }
    }
    return true;
  }
}
registerProcessor('pcm-capture', PcmCaptureProcessor);
