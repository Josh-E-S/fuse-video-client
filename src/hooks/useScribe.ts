'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { log } from '@/utils/logger'
import { getElectronBridge } from '@/hooks/useElectron'
import type { TranscriptEntry } from '@/hooks/useTranscription'

export type ScribeStatus = 'idle' | 'starting' | 'recording' | 'stopping' | 'error'

const SCRIBE_SAMPLE_RATE = 16000
const WORKLET_URL = '/scribe-resampler.worklet.js'
const SPEAKER_LABEL = 'local'

interface ScribeRefs {
  audioCtx: AudioContext | null
  source: MediaStreamAudioSourceNode | null
  worklet: AudioWorkletNode | null
  micStream: MediaStream | null
  unsubscribe: (() => void) | null
}

export function useScribe(audioInputId?: string) {
  const [status, setStatus] = useState<ScribeStatus>('idle')
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([])
  const [interimText, setInterimText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<Date | null>(null)

  const refs = useRef<ScribeRefs>({
    audioCtx: null,
    source: null,
    worklet: null,
    micStream: null,
    unsubscribe: null,
  })

  const teardown = useCallback(async () => {
    const r = refs.current
    if (r.unsubscribe) {
      r.unsubscribe()
      r.unsubscribe = null
    }
    if (r.worklet) {
      try {
        r.worklet.disconnect()
      } catch {}
      r.worklet = null
    }
    if (r.source) {
      try {
        r.source.disconnect()
      } catch {}
      r.source = null
    }
    if (r.audioCtx) {
      try {
        await r.audioCtx.close()
      } catch {}
      r.audioCtx = null
    }
    if (r.micStream) {
      r.micStream.getTracks().forEach((t) => t.stop())
      r.micStream = null
    }
  }, [])

  const start = useCallback(async () => {
    if (status !== 'idle' && status !== 'error') return

    const bridge = getElectronBridge()
    if (!bridge) {
      setError('Scribe is only available in the desktop app')
      setStatus('error')
      return
    }

    setStatus('starting')
    setError(null)
    setTranscripts([])
    setInterimText(null)

    try {
      const audioConstraint: MediaTrackConstraints = audioInputId
        ? { deviceId: { ideal: audioInputId } }
        : {}
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint })
      refs.current.micStream = micStream

      const audioCtx = new AudioContext({ sampleRate: SCRIBE_SAMPLE_RATE })
      refs.current.audioCtx = audioCtx
      await audioCtx.audioWorklet.addModule(WORKLET_URL)

      const source = audioCtx.createMediaStreamSource(micStream)
      const worklet = new AudioWorkletNode(audioCtx, 'scribe-resampler')
      worklet.port.onmessage = (e) => {
        const samples = e.data as Float32Array
        bridge.transcriptionSendAudio(samples, SPEAKER_LABEL)
      }
      source.connect(worklet)
      refs.current.source = source
      refs.current.worklet = worklet

      const ok = await bridge.transcriptionStart()
      if (!ok) throw new Error('Transcription engine failed to start')

      const unsubscribe = bridge.onTranscriptionResult((text) => {
        if (!text) return
        const entry: TranscriptEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text,
          timestamp: new Date().toISOString(),
        }
        setTranscripts((prev) => [...prev, entry])
        setInterimText(null)
      })
      refs.current.unsubscribe = unsubscribe

      setStartedAt(new Date())
      setStatus('recording')
    } catch (err) {
      log.media.warn('Scribe start failed')
      const message =
        err instanceof Error ? err.message : 'Could not start scribe — check microphone access'
      setError(message)
      setStatus('error')
      await teardown()
    }
  }, [status, audioInputId, teardown])

  const stop = useCallback(async () => {
    if (status !== 'recording' && status !== 'starting') return

    setStatus('stopping')
    const bridge = getElectronBridge()
    try {
      const drained = bridge ? await bridge.transcriptionStop() : []
      if (drained.length > 0) {
        const flushed: TranscriptEntry[] = drained.map((d) => {
          const text = typeof d === 'string' ? d : d.text
          return {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text,
            timestamp: new Date().toISOString(),
          }
        })
        setTranscripts((prev) => [...prev, ...flushed])
      }
    } catch {
      // Engine drain failures shouldn't block teardown.
    }
    await teardown()
    setInterimText(null)
    setStatus('idle')
  }, [status, teardown])

  const clear = useCallback(() => {
    setTranscripts([])
    setInterimText(null)
    setStartedAt(null)
  }, [])

  useEffect(() => {
    return () => {
      const bridge = getElectronBridge()
      bridge?.transcriptionStop().catch(() => {})
      teardown()
    }
  }, [teardown])

  return { status, transcripts, interimText, error, startedAt, start, stop, clear }
}
