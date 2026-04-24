'use client'

import { type RefObject } from 'react'
import { motion, type MotionValue } from 'framer-motion'
import { VideoOff } from 'lucide-react'
import { GlassPanel } from '@/components/meeting/GlassPanel'

interface VideoLayoutProps {
  layout: 'focus' | 'gallery' | 'side-by-side'
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

function RemoteVideoPlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
      Waiting for conference feed...
    </div>
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
        {remoteStream ? (
          <video
            ref={setRemoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover rounded-2xl"
          />
        ) : (
          <RemoteVideoPlaceholder />
        )}
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
        {remoteStream ? (
          <video
            ref={setRemoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover rounded-2xl"
          />
        ) : (
          <RemoteVideoPlaceholder />
        )}
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
        {remoteStream ? (
          <video
            ref={setRemoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover rounded-2xl"
          />
        ) : (
          <RemoteVideoPlaceholder />
        )}
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
        {remoteStream ? (
          <video
            ref={setRemoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover rounded-2xl"
          />
        ) : (
          <RemoteVideoPlaceholder />
        )}
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
