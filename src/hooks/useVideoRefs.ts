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
      const ref = localVideoRef as React.MutableRefObject<HTMLVideoElement | null>
      // Ignore null calls from elements that aren't the currently-attached one
      // (can happen during layout transitions when old and new trees briefly coexist).
      if (el === null && ref.current && ref.current.isConnected) return
      ref.current = el
      if (el && localStream && el.srcObject !== localStream) {
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
    const el = localVideoRef.current
    if (el && el.isConnected && localStream && el.srcObject !== localStream) {
      el.srcObject = localStream
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
