'use client'

import { useCallback, useState, type RefObject } from 'react'
import { motion, type MotionValue } from 'framer-motion'
import { VideoOff } from 'lucide-react'
import { GlassPanel } from '@/components/meeting/GlassPanel'
import type { ConnectionState } from '@/types/pexrtc'

interface VideoLayoutProps {
  layout: 'focus' | 'gallery' | 'side-by-side'
  connectionState: ConnectionState
  remoteStream: MediaStream | null
  localStream: MediaStream | null
  presentationStream: MediaStream | null
  presentationPopped: boolean
  isVideoMuted: boolean
  isAudioMuted: boolean
  isExpanded: boolean
  selfViewVisible: boolean
  targetAspectRatio: '16:9' | '9:16'
  pipX: MotionValue<number>
  pipY: MotionValue<number>
  mainVideoRef: RefObject<HTMLElement | null>
  setRemoteVideoRef: (el: HTMLVideoElement | null) => void
  setLocalVideoRef: (el: HTMLVideoElement | null) => void
  setPresentationVideoRef: (el: HTMLVideoElement | null) => void
}

function RemoteStatusOverlay({
  message,
  showSpinner,
}: {
  message: string
  showSpinner: boolean
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/40 pointer-events-none">
      {showSpinner && (
        <div className="w-9 h-9 border-[3px] border-white/10 border-t-white/60 rounded-full animate-spin" />
      )}
      <span className="text-sm">{message}</span>
    </div>
  )
}

function RemoteVideoTile({
  stream,
  connectionState,
  setVideoRef,
  videoClassName,
}: {
  stream: MediaStream | null
  connectionState: ConnectionState
  setVideoRef: (el: HTMLVideoElement | null) => void
  videoClassName: string
}) {
  const [hasFrames, setHasFrames] = useState(false)

  const refCallback = useCallback(
    (el: HTMLVideoElement | null) => {
      setVideoRef(el)
      if (!el) {
        setHasFrames(false)
        return
      }
      setHasFrames(el.videoWidth > 0 && el.videoHeight > 0)
      const onReady = () => {
        if (el.videoWidth > 0 && el.videoHeight > 0) setHasFrames(true)
      }
      const onEmptied = () => setHasFrames(false)
      el.addEventListener('loadedmetadata', onReady)
      el.addEventListener('playing', onReady)
      el.addEventListener('emptied', onEmptied)
      return () => {
        el.removeEventListener('loadedmetadata', onReady)
        el.removeEventListener('playing', onReady)
        el.removeEventListener('emptied', onEmptied)
      }
    },
    [setVideoRef],
  )

  if (!stream) {
    const isConnecting = connectionState === 'connecting'
    const isConnected = connectionState === 'connected'
    const message = isConnecting
      ? 'Connecting to conference…'
      : isConnected
        ? 'Connecting media…'
        : 'Waiting for conference feed…'
    const showSpinner = isConnecting || isConnected
    return <RemoteStatusOverlay message={message} showSpinner={showSpinner} />
  }

  return (
    <>
      <video ref={refCallback} autoPlay playsInline className={videoClassName} />
      {!hasFrames && (
        <RemoteStatusOverlay message="Receiving video…" showSpinner />
      )}
    </>
  )
}

function SelfViewOff({ size = 20 }: { size?: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-white/30">
      <VideoOff size={size} strokeWidth={1.5} />
    </div>
  )
}

function SelfViewOffDetailed() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/30">
      <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <VideoOff size={32} strokeWidth={1.5} />
      </div>
      <span className="text-xs uppercase tracking-widest">Camera off</span>
    </div>
  )
}

export function VideoLayout({
  layout,
  connectionState,
  remoteStream,
  localStream,
  presentationStream,
  presentationPopped,
  isVideoMuted,
  isAudioMuted,
  isExpanded,
  selfViewVisible,
  targetAspectRatio,
  pipX,
  pipY,
  mainVideoRef,
  setRemoteVideoRef,
  setLocalVideoRef,
  setPresentationVideoRef,
}: VideoLayoutProps) {
  const isBroadcasting = !isAudioMuted && !isVideoMuted
  const isAudioOnly = !isAudioMuted && isVideoMuted
  const showPresentation = !!presentationStream && !presentationPopped

  // In collapsed mode during a presentation, always use focus layout
  // (content on top, remote full-width with self as draggable PiP overlay).
  // The gallery/side-by-side 3-stack is too cramped in portrait windows.
  const effectiveLayout = showPresentation && !isExpanded ? 'focus' : layout

  return (
    <main
      ref={mainVideoRef}
      className={`relative min-h-0 flex-1 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        effectiveLayout === 'focus'
          ? 'flex flex-col justify-center'
          : effectiveLayout === 'gallery'
            ? 'flex flex-col gap-3'
            : 'flex flex-row gap-4'
      }`}
    >
      {/* Content tile — presentation stream */}
      {showPresentation && (
        <GlassPanel
          className={`relative flex items-center justify-center bg-black/50 ${
            effectiveLayout === 'focus' ? 'flex-1 min-h-0 w-full'
            : effectiveLayout === 'gallery' ? 'flex-1 min-h-0 w-full'
            : 'flex-[2] h-full'
          }`}
          hoverEffect={false}
        >
          <video
            ref={setPresentationVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-contain rounded-2xl"
          />
        </GlassPanel>
      )}

      {effectiveLayout === 'focus' ? (
        <FocusLayout
          connectionState={connectionState}
          remoteStream={remoteStream}
          localStream={localStream}
          isVideoMuted={isVideoMuted}
          selfViewVisible={selfViewVisible}
          targetAspectRatio={targetAspectRatio}
          showPresentation={showPresentation}
          pipX={pipX}
          pipY={pipY}
          mainVideoRef={mainVideoRef}
          setRemoteVideoRef={setRemoteVideoRef}
          setLocalVideoRef={setLocalVideoRef}
        />
      ) : effectiveLayout === 'gallery' ? (
        <GalleryLayout
          connectionState={connectionState}
          remoteStream={remoteStream}
          localStream={localStream}
          isVideoMuted={isVideoMuted}
          isBroadcasting={isBroadcasting}
          isAudioOnly={isAudioOnly}
          isExpanded={isExpanded}
          selfViewVisible={selfViewVisible}
          showPresentation={showPresentation}
          setRemoteVideoRef={setRemoteVideoRef}
          setLocalVideoRef={setLocalVideoRef}
        />
      ) : (
        <SideBySideLayout
          connectionState={connectionState}
          remoteStream={remoteStream}
          localStream={localStream}
          isVideoMuted={isVideoMuted}
          isBroadcasting={isBroadcasting}
          isAudioOnly={isAudioOnly}
          isExpanded={isExpanded}
          selfViewVisible={selfViewVisible}
          showPresentation={showPresentation}
          setRemoteVideoRef={setRemoteVideoRef}
          setLocalVideoRef={setLocalVideoRef}
        />
      )}
    </main>
  )
}

function FocusLayout({
  connectionState,
  remoteStream,
  localStream,
  isVideoMuted,
  selfViewVisible,
  targetAspectRatio,
  showPresentation,
  pipX,
  pipY,
  mainVideoRef,
  setRemoteVideoRef,
  setLocalVideoRef,
}: {
  connectionState: ConnectionState
  remoteStream: MediaStream | null
  localStream: MediaStream | null
  isVideoMuted: boolean
  selfViewVisible: boolean
  targetAspectRatio: '16:9' | '9:16'
  showPresentation: boolean
  pipX: MotionValue<number>
  pipY: MotionValue<number>
  mainVideoRef: RefObject<HTMLElement | null>
  setRemoteVideoRef: (el: HTMLVideoElement | null) => void
  setLocalVideoRef: (el: HTMLVideoElement | null) => void
}) {
  return (
    <div className={`relative ${showPresentation ? 'flex-1 min-h-0' : 'h-full'} w-full`}>
      <GlassPanel className="relative h-full w-full" hoverEffect={false}>
        <RemoteVideoTile
          stream={remoteStream}
          connectionState={connectionState}
          setVideoRef={setRemoteVideoRef}
          videoClassName="w-full h-full object-cover rounded-2xl"
        />
      </GlassPanel>
      {selfViewVisible && (
        <motion.div
          drag
          dragConstraints={mainVideoRef}
          dragElastic={0.1}
          dragMomentum={false}
          style={{
            x: pipX,
            y: pipY,
            ...(targetAspectRatio === '16:9'
              ? { width: 200, height: 112 }
              : { width: 112, height: 200 }),
          }}
          whileDrag={{ scale: 1.05, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
          className="absolute bottom-4 right-4 rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-20 bg-black/80 cursor-grab active:cursor-grabbing"
        >
          {localStream && !isVideoMuted ? (
            <video
              ref={setLocalVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover pointer-events-none"
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <VideoOff size={20} strokeWidth={1.5} className="text-white/30" />
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

function TwoTileRow({
  connectionState,
  remoteStream,
  localStream,
  isVideoMuted,
  isBroadcasting,
  isAudioOnly,
  selfViewVisible,
  setRemoteVideoRef,
  setLocalVideoRef,
  direction,
}: {
  connectionState: ConnectionState
  remoteStream: MediaStream | null
  localStream: MediaStream | null
  isVideoMuted: boolean
  isBroadcasting: boolean
  isAudioOnly: boolean
  selfViewVisible: boolean
  setRemoteVideoRef: (el: HTMLVideoElement | null) => void
  setLocalVideoRef: (el: HTMLVideoElement | null) => void
  direction: 'row' | 'col'
}) {
  return (
    <div className={`flex-1 flex ${direction === 'row' ? 'flex-row' : 'flex-col'} gap-3 min-h-0`}>
      <GlassPanel className="relative flex-1 min-h-0" hoverEffect={false}>
        <RemoteVideoTile
          stream={remoteStream}
          connectionState={connectionState}
          setVideoRef={setRemoteVideoRef}
          videoClassName="absolute inset-0 w-full h-full object-cover rounded-2xl"
        />
      </GlassPanel>
      {selfViewVisible && (
        <GlassPanel className="relative flex-1 min-h-0" isActive={isBroadcasting} isAudioOnly={isAudioOnly} hoverEffect={false}>
          {localStream && !isVideoMuted ? (
            <video
              ref={setLocalVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover rounded-2xl"
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            <SelfViewOff />
          )}
        </GlassPanel>
      )}
    </div>
  )
}

function GalleryLayout({
  connectionState,
  remoteStream,
  localStream,
  isVideoMuted,
  isBroadcasting,
  isAudioOnly,
  isExpanded,
  selfViewVisible,
  showPresentation,
  setRemoteVideoRef,
  setLocalVideoRef,
}: {
  connectionState: ConnectionState
  remoteStream: MediaStream | null
  localStream: MediaStream | null
  isVideoMuted: boolean
  isBroadcasting: boolean
  isAudioOnly: boolean
  isExpanded: boolean
  selfViewVisible: boolean
  showPresentation: boolean
  setRemoteVideoRef: (el: HTMLVideoElement | null) => void
  setLocalVideoRef: (el: HTMLVideoElement | null) => void
}) {
  if (isExpanded && showPresentation) {
    return (
      <TwoTileRow
        connectionState={connectionState}
        remoteStream={remoteStream}
        localStream={localStream}
        isVideoMuted={isVideoMuted}
        isBroadcasting={isBroadcasting}
        isAudioOnly={isAudioOnly}
        selfViewVisible={selfViewVisible}
        setRemoteVideoRef={setRemoteVideoRef}
        setLocalVideoRef={setLocalVideoRef}
        direction="row"
      />
    )
  }

  return (
    <>
      <GlassPanel className="relative flex-1 min-h-0 w-full" hoverEffect={false}>
        <RemoteVideoTile
          stream={remoteStream}
          connectionState={connectionState}
          setVideoRef={setRemoteVideoRef}
          videoClassName="absolute inset-0 w-full h-full object-cover rounded-2xl"
        />
      </GlassPanel>
      {selfViewVisible && (
        <GlassPanel
          className="relative flex-1 min-h-0 w-full"
          isActive={isBroadcasting}
          isAudioOnly={isAudioOnly}
          hoverEffect={false}
        >
          {localStream && !isVideoMuted ? (
            <video
              ref={setLocalVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover rounded-2xl"
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            <SelfViewOffDetailed />
          )}
        </GlassPanel>
      )}
    </>
  )
}

function SideBySideLayout({
  connectionState,
  remoteStream,
  localStream,
  isVideoMuted,
  isBroadcasting,
  isAudioOnly,
  isExpanded,
  selfViewVisible,
  showPresentation,
  setRemoteVideoRef,
  setLocalVideoRef,
}: {
  connectionState: ConnectionState
  remoteStream: MediaStream | null
  localStream: MediaStream | null
  isVideoMuted: boolean
  isBroadcasting: boolean
  isAudioOnly: boolean
  isExpanded: boolean
  selfViewVisible: boolean
  showPresentation: boolean
  setRemoteVideoRef: (el: HTMLVideoElement | null) => void
  setLocalVideoRef: (el: HTMLVideoElement | null) => void
}) {
  if (isExpanded && showPresentation) {
    return (
      <TwoTileRow
        connectionState={connectionState}
        remoteStream={remoteStream}
        localStream={localStream}
        isVideoMuted={isVideoMuted}
        isBroadcasting={isBroadcasting}
        isAudioOnly={isAudioOnly}
        selfViewVisible={selfViewVisible}
        setRemoteVideoRef={setRemoteVideoRef}
        setLocalVideoRef={setLocalVideoRef}
        direction="col"
      />
    )
  }

  return (
    <>
      <GlassPanel className="relative flex-1 h-full" hoverEffect={false}>
        <RemoteVideoTile
          stream={remoteStream}
          connectionState={connectionState}
          setVideoRef={setRemoteVideoRef}
          videoClassName="absolute inset-0 w-full h-full object-cover rounded-2xl"
        />
      </GlassPanel>
      {selfViewVisible && (
        <GlassPanel
          className="relative flex-1 h-full"
          isActive={isBroadcasting}
          isAudioOnly={isAudioOnly}
          hoverEffect={false}
        >
          {localStream && !isVideoMuted ? (
            <video
              ref={setLocalVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover rounded-2xl"
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            <SelfViewOff />
          )}
        </GlassPanel>
      )}
    </>
  )
}
