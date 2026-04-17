'use client'

import { useCallback, useEffect, useRef } from 'react'

interface UseVideoRefsOptions {
  remoteStream: MediaStream | null
  localStream: MediaStream | null
  presentationStream: MediaStream | null
  isVideoMuted: boolean
}

export function useVideoRefs({
  remoteStream,
  localStream,
  presentationStream,
  isVideoMuted,
}: UseVideoRefsOptions) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const presentationVideoRef = useRef<HTMLVideoElement>(null)

  const setRemoteVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      ;(remoteVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el
      if (el && remoteStream) {
        el.srcObject = remoteStream
      }
    },
    [remoteStream],
  )

  const setLocalVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      ;(localVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el
      if (el && localStream) {
        el.srcObject = localStream
      }
    },
    [localStream],
  )

  const setPresentationVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      ;(presentationVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el
      if (el && presentationStream) {
        el.srcObject = presentationStream
      }
    },
    [presentationStream],
  )

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  useEffect(() => {
    if (presentationVideoRef.current && presentationStream) {
      presentationVideoRef.current.srcObject = presentationStream
    }
  }, [presentationStream])

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream, isVideoMuted])

  return {
    remoteVideoRef,
    localVideoRef,
    presentationVideoRef,
    setRemoteVideoRef,
    setLocalVideoRef,
    setPresentationVideoRef,
  }
}
