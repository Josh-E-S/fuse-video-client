'use client'

import { createPortal } from 'react-dom'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Rows2,
  PinOff,
} from 'lucide-react'
import type { PipContextValue } from '@/contexts/PipContext'

interface PipModeViewProps {
  pip: PipContextValue
  alias: string
  remoteStream: MediaStream | null
  localStream: MediaStream | null
  isAudioMuted: boolean
  isVideoMuted: boolean
  selfViewVisible: boolean
  pipLayout: 'portrait' | 'halves'
  setPipLayout: (layout: 'portrait' | 'halves') => void
  setRemoteVideoRef: (el: HTMLVideoElement | null) => void
  setLocalVideoRef: (el: HTMLVideoElement | null) => void
  onMuteAudio: (muted: boolean) => void
  onMuteVideo: (muted: boolean) => void
  onLeave: () => void
}

export function PipModeView({
  pip,
  alias,
  remoteStream,
  localStream,
  isAudioMuted,
  isVideoMuted,
  selfViewVisible,
  pipLayout,
  setPipLayout,
  setRemoteVideoRef,
  setLocalVideoRef,
  onMuteAudio,
  onMuteVideo,
  onLeave,
}: PipModeViewProps) {
  if (!pip.isActive || !pip.pipWindow) return null

  const selfViewContent =
    localStream && !isVideoMuted ? (
      <video
        ref={setLocalVideoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
    ) : (
      <div className="w-full h-full bg-black/80 flex flex-col items-center justify-center gap-1 text-white/30">
        <VideoOff size={18} strokeWidth={1.5} />
        <span className="text-[8px] uppercase tracking-widest">Off</span>
      </div>
    )

  const remoteVideoPlaceholder = (
    <div className="w-full h-full flex items-center justify-center bg-black/90">
      <div className="flex flex-col items-center gap-3 text-white/20">
        <VideoOff size={40} strokeWidth={1.5} />
        <span className="text-xs tracking-widest uppercase">Waiting for video...</span>
      </div>
    </div>
  )

  const controls = (
    <div className="relative z-20 px-4 pb-6">
      <div className="flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/8">
        <button
          onClick={() => onMuteAudio(!isAudioMuted)}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200
            ${isAudioMuted ? 'bg-rose-500/15 border border-rose-500/25 text-rose-400' : 'bg-white/10 border border-white/10 text-white/80'}`}
        >
          {isAudioMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button
          onClick={() => onMuteVideo(!isVideoMuted)}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200
            ${isVideoMuted ? 'bg-rose-500/15 border border-rose-500/25 text-rose-400' : 'bg-white/10 border border-white/10 text-white/80'}`}
        >
          {isVideoMuted ? <VideoOff size={16} /> : <Video size={16} />}
        </button>
        <button
          onClick={() => setPipLayout(pipLayout === 'portrait' ? 'halves' : 'portrait')}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200
            ${pipLayout === 'halves' ? 'bg-blue-500/15 border border-blue-500/25 text-blue-400' : 'bg-white/10 border border-white/10 text-white/40'}`}
          title={pipLayout === 'portrait' ? 'Halves view' : 'Portrait view'}
        >
          <Rows2 size={16} />
        </button>
        <div className="w-px h-7 bg-white/10" />
        <button
          onClick={onLeave}
          className="w-11 h-11 rounded-full bg-rose-600 flex items-center justify-center text-white hover:bg-rose-500 transition-colors"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  )

  const topBar = (
    <div className="relative z-20 flex items-center justify-between px-4 pt-4">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/8">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[11px] text-white/70 font-medium truncate max-w-[260px]">
          {alias}
        </span>
      </div>
      <button
        onClick={() => pip.closePip()}
        className="w-8 h-8 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xl border border-white/8 text-white/60 hover:text-white transition-colors"
        title="Return to tab"
      >
        <PinOff size={14} />
      </button>
    </div>
  )

  const meetingContent =
    pipLayout === 'portrait' ? (
      <div className="relative h-screen w-full flex flex-col font-sans overflow-hidden antialiased bg-black">
        <div className="absolute inset-0">
          {remoteStream ? (
            <video ref={setRemoteVideoRef} autoPlay playsInline className="w-full h-full object-cover bg-black" />
          ) : (
            remoteVideoPlaceholder
          )}
        </div>
        {selfViewVisible && (
          <div className="absolute bottom-28 right-4 z-30 w-[110px] h-[148px] rounded-2xl overflow-hidden border border-white/15 shadow-2xl">
            {selfViewContent}
          </div>
        )}
        {topBar}
        <div className="flex-1" />
        {controls}
      </div>
    ) : (
      <div className="relative h-screen w-full flex flex-col font-sans overflow-hidden antialiased bg-black">
        {topBar}
        <div className="flex-1 flex flex-col min-h-0 px-3 pt-2 pb-2 gap-2">
          <div className="flex-1 rounded-2xl overflow-hidden bg-black/30 border border-white/6 min-h-0">
            {remoteStream ? (
              <video ref={setRemoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              remoteVideoPlaceholder
            )}
          </div>
          {selfViewVisible && (
            <div className="flex-1 rounded-2xl overflow-hidden bg-black/30 border border-white/6 min-h-0">
              {selfViewContent}
            </div>
          )}
        </div>
        {controls}
      </div>
    )

  return (
    <>
      {createPortal(meetingContent, pip.pipWindow.document.body)}
      <div className="min-h-screen w-full flex flex-col items-center justify-center font-sans gap-4">
        <div className="text-white/20 text-sm tracking-widest uppercase">
          In Call — Floating Window
        </div>
        <button
          onClick={onLeave}
          className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm"
        >
          Leave Call
        </button>
      </div>
    </>
  )
}
