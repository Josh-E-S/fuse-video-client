'use client'

// Wires three <video> elements (remote, local, presentation) to their
// MediaStreams. Returns both classic refs and callback ref setters because
// video elements unmount/remount during layout transitions (collapsed →
// expanded → mini): a classic ref alone would lose the srcObject binding
// during the swap. The callback refs run synchronously on mount/unmount so
// we can reattach the stream before the user sees a blank frame.

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

  // Cast to MutableRefObject because TS exposes RefObject.current as readonly
  // when created via useRef<HTMLVideoElement>(null). The cast is purely a
  // type-system workaround; refs are always mutable at runtime.
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
      // During a layout swap the old <video> unmounts (calls back with null)
      // *after* the new one has mounted (already updated ref.current). Without
      // this guard, the late null call clobbers the new element's reference
      // and the local self-view goes blank for a frame. isConnected tells us
      // whether the ref still points to a live DOM node.
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
