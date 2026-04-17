'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseMediaDevicesOptions {
  active: boolean
  audioInputId?: string
  videoInputId?: string
}

export function useMediaDevices({ active, audioInputId, videoInputId }: UseMediaDevicesOptions) {
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([])
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([])
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState(false)
  const [micLevel, setMicLevel] = useState(0)

  const micCtxRef = useRef<AudioContext | null>(null)
  const micRafRef = useRef<number>(0)

  useEffect(() => {
    if (!active) {
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop())
        setPreviewStream(null)
      }
      setCameraError(false)
      cancelAnimationFrame(micRafRef.current)
      if (micCtxRef.current) {
        micCtxRef.current.close()
        micCtxRef.current = null
      }
      setMicLevel(0)
      return
    }

    let cancelled = false
    let stream: MediaStream | null = null
    let audioCtx: AudioContext | null = null

    async function setup() {
      const audioConstraint = audioInputId
        ? { deviceId: { ideal: audioInputId } }
        : true
      const videoConstraint = videoInputId
        ? { deviceId: { ideal: videoInputId } }
        : true

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraint,
          video: videoConstraint,
        })
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraint,
            video: false,
          })
        } catch {
          // both failed
        }
      }

      if (cancelled) {
        stream?.getTracks().forEach((t) => t.stop())
        return
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      if (!cancelled) {
        setAudioInputs(devices.filter((d) => d.kind === 'audioinput'))
        setAudioOutputs(devices.filter((d) => d.kind === 'audiooutput'))
        setVideoInputs(devices.filter((d) => d.kind === 'videoinput'))
      }

      if (!stream || cancelled) return

      const videoTracks = stream.getVideoTracks()
      if (!cancelled) {
        if (videoTracks.length > 0) {
          setPreviewStream(stream)
          setCameraError(false)
        } else {
          setCameraError(true)
        }
      }

      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack && !cancelled) {
        audioCtx = new AudioContext()
        micCtxRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]))
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.85
        source.connect(analyser)
        const data = new Uint8Array(analyser.frequencyBinCount)

        function tick() {
          if (cancelled) return
          analyser.getByteFrequencyData(data)
          const avg = data.reduce((a, b) => a + b, 0) / data.length
          setMicLevel(Math.min(avg / 100, 1))
          micRafRef.current = requestAnimationFrame(tick)
        }
        tick()
      }
    }

    setup()

    async function handleDeviceChange() {
      const devices = await navigator.mediaDevices.enumerateDevices()
      if (!cancelled) {
        setAudioInputs(devices.filter((d) => d.kind === 'audioinput'))
        setAudioOutputs(devices.filter((d) => d.kind === 'audiooutput'))
        setVideoInputs(devices.filter((d) => d.kind === 'videoinput'))
      }
    }
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
      cancelled = true
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
      cancelAnimationFrame(micRafRef.current)
      if (audioCtx) {
        audioCtx.close()
        micCtxRef.current = null
      }
      if (stream) stream.getTracks().forEach((t) => t.stop())
      setPreviewStream(null)
      setMicLevel(0)
    }
  }, [active, audioInputId, videoInputId])

  return {
    audioInputs,
    audioOutputs,
    videoInputs,
    previewStream,
    cameraError,
    micLevel,
  }
}

export function useSpeakerTest(audioOutputId: string) {
  const [testing, setTesting] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const toggle = useCallback(() => {
    if (testing && audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setTesting(false)
      return
    }
    const audio = new Audio('/ringtone1.mp3')
    audio.volume = 0.5
    if (audioOutputId) {
      audio.setSinkId?.(audioOutputId).catch(() => {})
    }
    audioRef.current = audio
    setTesting(true)
    audio.play().catch(() => setTesting(false))
    audio.addEventListener('ended', () => {
      setTesting(false)
      audioRef.current = null
    })
  }, [audioOutputId, testing])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setTesting(false)
    }
  }, [])

  return { testing, toggle, stop }
}
