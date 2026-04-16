// AudioWorklet processor that captures mic input and posts
// 16kHz mono Float32 PCM chunks to the main thread.
// Runs in a dedicated audio thread -- keep this minimal.

class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._active = true
    this.port.onmessage = (e) => {
      if (e.data === 'stop') this._active = false
    }
  }

  process(inputs) {
    if (!this._active) return false

    const input = inputs[0]
    if (!input || !input[0] || input[0].length === 0) return true

    // Channel 0, mono. Copy the buffer so it survives the audio thread boundary.
    const samples = new Float32Array(input[0])
    this.port.postMessage(samples, [samples.buffer])

    return true
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor)
