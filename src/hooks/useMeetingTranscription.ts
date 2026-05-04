'use client'

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
  }, [transcriptionEnabled, connectionState, useLocal, setMessageText])

  useEffect(() => {
    if (connectionState === 'disconnected') {
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
