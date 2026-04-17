'use client'

import { useEffect, useState } from 'react'
import { useTranscription } from '@/hooks/useTranscription'
import { useLocalTranscription } from '@/hooks/useLocalTranscription'
import { useElectron } from '@/hooks/useElectron'

interface UseMeetingTranscriptionOptions {
  sipUri: string | null
  connectionState: string
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  setMessageText: (text: string) => void
}

export function useMeetingTranscription({
  sipUri,
  connectionState,
  localStream,
  remoteStream,
  setMessageText,
}: UseMeetingTranscriptionOptions) {
  const { isElectron } = useElectron()
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(false)
  const [captionsVisible, setCaptionsVisible] = useState(true)

  const {
    transcripts: liveTranscripts,
    latestTranscript,
    interimText,
    interimSpeaker,
    isConnected: isTranscriptionConnected,
    connect: connectTranscription,
    disconnect: disconnectTranscription,
  } = useTranscription({
    sipUri,
    autoConnect: false,
  })

  const localTranscription = useLocalTranscription({
    autoConnect: false,
    localStream,
    remoteStream,
  })

  const hasRemoteAgent = !!process.env.NEXT_PUBLIC_TRANSCRIPTION_API_URL
  const useLocal = isElectron && localTranscription.isAvailable

  useEffect(() => {
    if (transcriptionEnabled && connectionState === 'connected') {
      setMessageText('Live transcription is enabled for this meeting')
      if (useLocal) {
        localTranscription.connect()
      } else if (hasRemoteAgent) {
        connectTranscription()
      }
    } else if (!transcriptionEnabled) {
      setMessageText('')
      if (useLocal) {
        localTranscription.disconnect()
      } else if (hasRemoteAgent) {
        disconnectTranscription()
      }
    }
  }, [transcriptionEnabled, connectionState, useLocal, hasRemoteAgent, setMessageText])

  useEffect(() => {
    if (connectionState === 'disconnected') {
      setTranscriptionEnabled(false)
    }
  }, [connectionState])

  const transcripts = useLocal ? localTranscription.transcripts : liveTranscripts
  const activeLatest = useLocal ? localTranscription.latestTranscript : latestTranscript
  const activeInterim = useLocal ? localTranscription.interimText : interimText
  const activeInterimSpeaker = useLocal ? localTranscription.interimSpeaker : interimSpeaker
  const activeConnected = useLocal ? localTranscription.isConnected : isTranscriptionConnected

  return {
    transcriptionEnabled,
    setTranscriptionEnabled,
    captionsVisible,
    setCaptionsVisible,
    transcripts,
    latestTranscript: activeLatest,
    interimText: activeInterim,
    interimSpeaker: activeInterimSpeaker,
    isTranscriptionConnected: activeConnected,
  }
}
