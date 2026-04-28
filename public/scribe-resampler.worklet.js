class ScribeResampler extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]
    if (!input || input.length === 0) return true

    const channels = input
    const frameCount = channels[0].length
    const mono = new Float32Array(frameCount)

    if (channels.length === 1) {
      mono.set(channels[0])
    } else {
      const left = channels[0]
      const right = channels[1]
      for (let i = 0; i < frameCount; i++) {
        mono[i] = (left[i] + right[i]) * 0.5
      }
    }

    this.port.postMessage(mono, [mono.buffer])
    return true
  }
}

registerProcessor('scribe-resampler', ScribeResampler)
