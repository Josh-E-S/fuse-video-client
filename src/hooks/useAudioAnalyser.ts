'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export function useAudioAnalyser() {
  const [audioData, setAudioData] = useState<number[]>(new Array(20).fill(0))
  const contextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const rafRef = useRef<number | null>(null)

  const stopVisualization = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (contextRef.current && contextRef.current.state !== 'closed') {
      contextRef.current.close().catch(() => {})
      contextRef.current = null
    }
    analyserRef.current = null
    setAudioData(new Array(20).fill(0))
  }, [])

  const startVisualization = useCallback(
    async (stream: MediaStream | null, customAnalyser?: AnalyserNode) => {
      stopVisualization()
      if (!stream) return

      const ctx = new AudioContext()
      contextRef.current = ctx

      const analyser = customAnalyser || ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      analyserRef.current = analyser

      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)
      sourceRef.current = source

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const bins = 20

      function update() {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)

        const binSize = Math.floor(dataArray.length / bins)
        const levels: number[] = []
        for (let i = 0; i < bins; i++) {
          let sum = 0
          for (let j = 0; j < binSize; j++) {
            sum += dataArray[i * binSize + j]
          }
          levels.push(sum / binSize / 255)
        }
        setAudioData(levels)
        rafRef.current = requestAnimationFrame(update)
      }

      rafRef.current = requestAnimationFrame(update)
    },
    [stopVisualization],
  )

  useEffect(() => {
    return () => stopVisualization()
  }, [stopVisualization])

  return { audioData, startVisualization, stopVisualization }
}
