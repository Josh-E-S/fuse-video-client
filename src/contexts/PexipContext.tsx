'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { pexRTCConnectionManager, ConnectionConfig } from '@/services/pexrtcConnectionManager'
import { ConnectionState, ChatMessage, Participant } from '@/types/pexrtc'
import { log } from '@/utils/logger'

export type DisconnectReason = 'user' | 'remote' | 'error' | null

interface PexipContextValue {
  connectionState: ConnectionState
  disconnectReason: DisconnectReason
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  presentationStream: MediaStream | null
  isAudioMuted: boolean
  isVideoMuted: boolean
  isPresenting: boolean
  error: string | null
  chatMessages: ChatMessage[]
  participants: Participant[]
  currentMeetingId: string | null
  joinConference: (config: ConnectionConfig) => Promise<void>
  connectWithPin: (pin: string) => void
  disconnect: () => void
  muteAudio: (mute: boolean) => void
  muteVideo: (mute: boolean) => void
  sendChatMessage: (message: string) => void
  setMessageText: (text: string) => void
  sendDTMF: (digits: string) => void
  getMediaStatistics: () => Record<string, unknown> | null
  requestAspectRatio: (ratio: number) => void
  startScreenShare: () => Promise<void>
  stopScreenShare: () => void
  switchMediaDevices: (audioId?: string, videoId?: string) => Promise<void>
}

const PexipContext = createContext<PexipContextValue | null>(null)

export function PexipProvider({ children }: { children: React.ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [presentationStream, setPresentationStream] = useState<MediaStream | null>(null)
  const [isAudioMuted, setIsAudioMuted] = useState(true)
  const [isVideoMuted, setIsVideoMuted] = useState(true)
  const [isPresenting, setIsPresenting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null)
  const [disconnectReason, setDisconnectReason] = useState<DisconnectReason>(null)
  const pinSubmittedRef = useRef(false)
  const intentionalDisconnectRef = useRef(false)

  function resetCallState() {
    setConnectionState('disconnected')
    setLocalStream(null)
    setRemoteStream(null)
    setPresentationStream(null)
    setIsAudioMuted(true)
    setIsVideoMuted(true)
    setIsPresenting(false)
    setChatMessages([])
    setParticipants([])
    setCurrentMeetingId(null)
  }

  const joinConference = useCallback(async (config: ConnectionConfig) => {
    pinSubmittedRef.current = false
    intentionalDisconnectRef.current = false
    setDisconnectReason(null)
    setConnectionState('connecting')
    setError(null)
    setChatMessages([])
    setParticipants([])
    setCurrentMeetingId(config.conferenceAlias)

    // Sync mute state with what we're telling PexRTC
    if (config.audioOff !== undefined) setIsAudioMuted(config.audioOff)
    if (config.videoOff !== undefined) setIsVideoMuted(config.videoOff)

    try {
      await pexRTCConnectionManager.connect(config, {
        onSetup: (stream, pinStatus) => {
          if (stream) setLocalStream(stream)
          if (pinSubmittedRef.current || config.pin) return
          if (pinStatus === 'required') {
            setConnectionState('pin_required')
          } else if (pinStatus === 'optional') {
            setConnectionState('pin_optional')
          }
        },
        onConnect: (stream) => {
          if (stream) setRemoteStream(stream)
          setConnectionState('connected')
        },
        onDisconnect: () => {
          setDisconnectReason(intentionalDisconnectRef.current ? 'user' : 'remote')
          intentionalDisconnectRef.current = false
          resetCallState()
        },
        onError: (err) => {
          const isPinError = /invalid pin/i.test(err)
          if (isPinError) {
            pinSubmittedRef.current = false
            setError('Invalid PIN. Please try again.')
            setConnectionState('pin_required')
          } else {
            setDisconnectReason('error')
            setError(err)
            setConnectionState('error')
            setLocalStream(null)
            setRemoteStream(null)
            setPresentationStream(null)
          }
        },
        onChatMessage: (msg: ChatMessage) => {
          setChatMessages((prev) => [...prev, { ...msg, timestamp: msg.timestamp ?? Date.now() }])
        },
        onParticipantCreate: (p: Participant) => {
          setParticipants((prev) => [...prev, p])
        },
        onParticipantUpdate: (p: Participant) => {
          setParticipants((prev) => prev.map((x) => (x.uuid === p.uuid ? p : x)))
        },
        onParticipantDelete: (p: Participant) => {
          setParticipants((prev) => prev.filter((x) => x.uuid !== p.uuid))
        },
        onScreenshareConnected: (stream: MediaStream) => {
          setIsPresenting(true)
          setPresentationStream(stream)
        },
        onScreenshareStopped: () => {
          setIsPresenting(false)
          setPresentationStream(null)
        },
        onPresentationConnected: (stream: MediaStream) => {
          setPresentationStream(stream)
        },
        onPresentationDisconnected: () => {
          setPresentationStream(null)
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
      setConnectionState('error')
    }
  }, [])

  const connectWithPin = useCallback((pin: string) => {
    pinSubmittedRef.current = true
    pexRTCConnectionManager.completeConnection(pin)
    setConnectionState('connecting')
  }, [])

  const disconnect = useCallback(() => {
    intentionalDisconnectRef.current = true
    setDisconnectReason('user')
    setLocalStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop())
      return null
    })
    setRemoteStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop())
      return null
    })
    setPresentationStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop())
      return null
    })
    setConnectionState('disconnected')
    setIsAudioMuted(true)
    setIsVideoMuted(true)
    setIsPresenting(false)
    setChatMessages([])
    setParticipants([])
    setCurrentMeetingId(null)
    setError(null)
    pexRTCConnectionManager.disconnect()
  }, [])

  const muteAudio = useCallback((mute: boolean) => {
    try {
      pexRTCConnectionManager.muteAudio(mute)
    } catch (err) {
      log.pexrtc.warn('muteAudio: not connected yet, state is tracked for when we join')
    }
    setIsAudioMuted(mute)
  }, [])

  const muteVideo = useCallback((mute: boolean) => {
    try {
      pexRTCConnectionManager.muteVideo(mute)
    } catch (err) {
      log.pexrtc.warn('muteVideo: not connected yet, state is tracked for when we join')
    }
    setIsVideoMuted(mute)
  }, [])

  const sendChatMessage = useCallback((message: string) => {
    try {
      pexRTCConnectionManager.sendChatMessage(message)
      setChatMessages((prev) => [
        ...prev,
        {
          origin: 'You',
          uuid: 'self',
          type: 'text/plain',
          payload: message,
          timestamp: Date.now(),
        },
      ])
    } catch (err) {
      log.pexrtc.warn('sendChatMessage: not connected')
    }
  }, [])

  const setMessageText = useCallback((text: string) => {
    pexRTCConnectionManager.setMessageText(text)
  }, [])

  const sendDTMF = useCallback((digits: string) => {
    pexRTCConnectionManager.sendDTMF(digits)
  }, [])

  const getMediaStatistics = useCallback(() => {
    return pexRTCConnectionManager.getMediaStatistics()
  }, [])

  const requestAspectRatio = useCallback((ratio: number) => {
    pexRTCConnectionManager.requestAspectRatio(ratio)
  }, [])

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })

      // Auto-stop when user clicks the browser/OS "Stop sharing" button
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        pexRTCConnectionManager.stopScreenShare()
        setIsPresenting(false)
        setPresentationStream(null)
      })

      await pexRTCConnectionManager.startScreenShare(stream)
    } catch (err) {
      log.pexrtc.warn('startScreenShare: user cancelled the picker or not available')
    }
  }, [])

  const stopScreenShare = useCallback(() => {
    try {
      pexRTCConnectionManager.stopScreenShare()
    } catch (err) {
      log.pexrtc.warn('stopScreenShare: not connected')
    }
  }, [])

  const switchMediaDevices = useCallback(async (audioId?: string, videoId?: string) => {
    try {
      await pexRTCConnectionManager.switchMediaDevices(audioId, videoId)
    } catch (err) {
      log.pexrtc.warn('switchMediaDevices: device switch failed, possibly permissions denied')
    }
  }, [])

  return (
    <PexipContext.Provider
      value={{
        connectionState,
        disconnectReason,
        localStream,
        remoteStream,
        presentationStream,
        isAudioMuted,
        isVideoMuted,
        isPresenting,
        error,
        chatMessages,
        participants,
        currentMeetingId,
        joinConference,
        connectWithPin,
        disconnect,
        muteAudio,
        muteVideo,
        sendChatMessage,
        setMessageText,
        sendDTMF,
        getMediaStatistics,
        requestAspectRatio,
        startScreenShare,
        stopScreenShare,
        switchMediaDevices,
      }}
    >
      {children}
    </PexipContext.Provider>
  )
}

export function usePexip() {
  const ctx = useContext(PexipContext)
  if (!ctx) throw new Error('usePexip must be used inside PexipProvider')
  return ctx
}
