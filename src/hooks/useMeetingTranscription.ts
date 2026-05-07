'use client'

// Thin orchestrator over useLocalTranscription for the meeting page:
// connect/disconnect on toggle, mirror state into the chat composer hint,
// and auto-disable on disconnect so a fresh call starts clean.

import { useEffect, useState } from 'react'
import { useLocalTranscription } from '@/hooks/useLocalTranscription'
import { useElectron } from '@/hooks/useElectron'

interface UseMeetingTranscriptionOptions {
  connectionState: string
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  setMessageText: (text: string) => void
}

export function useMeetingTranscription({
  connectionState,
  localStream,
  remoteStream,
  setMessageText,
}: UseMeetingTranscriptionOptions) {
  const { isElectron } = useElectron()
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(false)
  const [captionsVisible, setCaptionsVisible] = useState(true)

  const localTranscription = useLocalTranscription({
    autoConnect: false,
    localStream,
    remoteStream,
  })

  const useLocal = isElectron && localTranscription.isAvailable

  useEffect(() => {
    if (transcriptionEnabled && connectionState === 'connected') {
      setMessageText('Live transcription is enabled for this meeting')
      if (useLocal) localTranscription.connect()
    } else if (!transcriptionEnabled) {
      setMessageText('')
      if (useLocal) localTranscription.disconnect()
    }
    // localTranscription is a fresh object each render; we only want to fire
    // on the toggle/connection edges, not on its internal state churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcriptionEnabled, connectionState, useLocal, setMessageText])

  useEffect(() => {
    if (connectionState === 'disconnected') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTranscriptionEnabled(false)
    }
  }, [connectionState])

  return {
    transcriptionEnabled,
    setTranscriptionEnabled,
    captionsVisible,
    setCaptionsVisible,
    transcripts: localTranscription.transcripts,
    latestTranscript: localTranscription.latestTranscript,
    interimText: localTranscription.interimText,
    interimSpeaker: localTranscription.interimSpeaker,
    isTranscriptionConnected: localTranscription.isConnected,
    clearTranscripts: localTranscription.clearTranscripts,
  }
}
