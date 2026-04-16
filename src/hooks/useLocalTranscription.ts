'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { TranscriptEntry } from '@/hooks/useTranscription'
import { getElectronBridge } from '@/hooks/useElectron'

interface UseLocalTranscriptionOptions {
  autoConnect?: boolean
  maxEntries?: number
  /** Your local mic stream. */
  localStream?: MediaStream | null
  /** The remote conference mix (everyone except you). */
  remoteStream?: MediaStream | null
}

export function useLocalTranscription(options: UseLocalTranscriptionOptions = {}) {
  const {
    autoConnect = false,
    maxEntries = 500,
    localStream = null,
    remoteStream = null,
  } = options

  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([])
  const [interimText, setInterimText] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [status, setStatus] = useState<string>('disconnected')
  const [isAvailable, setIsAvailable] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const localSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const remoteSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const cleanupIpcRef = useRef<(() => void) | null>(null)
  const activeRef = useRef(false)

  useEffect(() => {
    const bridge = getElectronBridge()
    if (!bridge?.transcriptionAvailable) return
    bridge.transcriptionAvailable().then((available: boolean) => {
      setIsAvailable(available)
    })
  }, [])

  const connect = useCallback(async () => {
    const bridge = getElectronBridge()
    if (!bridge || activeRef.current) return

    const hasLocal = localStream && localStream.getAudioTracks().length > 0
    const hasRemote = remoteStream && remoteStream.getAudioTracks().length > 0
    if (!hasLocal && !hasRemote) {
      setStatus('no_audio')
      return
    }

    activeRef.current = true
    setStatus('starting')

    const started = await bridge.transcriptionStart()
    if (!started) {
      activeRef.current = false
      setStatus('unavailable')
      return
    }

    cleanupIpcRef.current = bridge.onTranscriptionResult(
      (text: string, speaker?: string) => {
        const entry: TranscriptEntry = {
          id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text,
          timestamp: new Date().toISOString(),
          speaker: speaker === 'local' ? 'You' : 'Meeting',
        }
        setTranscripts((prev) => {
          const next = [...prev, entry]
          return next.length > maxEntries ? next.slice(-maxEntries) : next
        })
        setInterimText(null)
      },
    )

    try {
      const audioCtx = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioCtx

      await audioCtx.audioWorklet.addModule('/pcm-worklet.js')

      // Silent sink keeps the audio graph alive without playing back
      const silentSink = audioCtx.createGain()
      silentSink.gain.value = 0
      silentSink.connect(audioCtx.destination)

      // Single worklet receives the mixed audio from both streams
      const workletNode = new AudioWorkletNode(audioCtx, 'pcm-capture-processor')
      workletNodeRef.current = workletNode

      workletNode.port.onmessage = (e) => {
        if (!activeRef.current) return
        bridge.transcriptionSendAudio(e.data as Float32Array, 'remote')
      }

      // Mix local + remote into the same worklet input via a GainNode mixer
      const mixer = audioCtx.createGain()
      mixer.gain.value = 1
      mixer.connect(workletNode)
      workletNode.connect(silentSink)

      if (hasLocal) {
        const localSource = audioCtx.createMediaStreamSource(localStream)
        localSourceRef.current = localSource
        localSource.connect(mixer)
      }

      if (hasRemote) {
        const remoteSource = audioCtx.createMediaStreamSource(remoteStream)
        remoteSourceRef.current = remoteSource
        remoteSource.connect(mixer)
      }

      setIsConnected(true)
      setStatus('connected')
    } catch {
      setStatus('mic_error')
      activeRef.current = false
      bridge.transcriptionStop()
      if (cleanupIpcRef.current) {
        cleanupIpcRef.current()
        cleanupIpcRef.current = null
      }
    }
  }, [maxEntries, localStream, remoteStream])

  const disconnect = useCallback(async () => {
    activeRef.current = false
    setIsConnected(false)
    setStatus('disconnected')

    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage('stop')
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }
    if (localSourceRef.current) {
      localSourceRef.current.disconnect()
      localSourceRef.current = null
    }
    if (remoteSourceRef.current) {
      remoteSourceRef.current.disconnect()
      remoteSourceRef.current = null
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      await audioContextRef.current.close()
    }
    audioContextRef.current = null

    const bridge = getElectronBridge()
    if (bridge) {
      const finalResults = await bridge.transcriptionStop()
      if (Array.isArray(finalResults)) {
        for (const result of finalResults) {
          const { text, speaker } =
            typeof result === 'string'
              ? { text: result, speaker: 'remote' }
              : (result as { text: string; speaker: string })
          setTranscripts((prev) => [
            ...prev,
            {
              id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              text,
              timestamp: new Date().toISOString(),
              speaker: speaker === 'local' ? 'You' : 'Meeting',
            },
          ])
        }
      }
    }

    if (cleanupIpcRef.current) {
      cleanupIpcRef.current()
      cleanupIpcRef.current = null
    }
  }, [])

  const clearTranscripts = useCallback(() => {
    setTranscripts([])
    setInterimText(null)
  }, [])

  useEffect(() => {
    if (autoConnect && isAvailable) connect()
    return () => {
      if (activeRef.current) disconnect()
    }
  }, [autoConnect, isAvailable, connect, disconnect])

  return {
    transcripts,
    interimText,
    interimSpeaker: undefined as string | undefined,
    latestTranscript: transcripts.length > 0 ? transcripts[transcripts.length - 1] : null,
    isConnected,
    isAvailable,
    status,
    connect,
    disconnect,
    clearTranscripts,
  }
}
