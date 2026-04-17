'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize2,
  MonitorUp,
  FileText,
} from 'lucide-react'
import { getElectronBridge } from '@/hooks/useElectron'
import type { CosmeticTheme } from '@/themes/types'

interface MiniModeViewProps {
  theme: CosmeticTheme
  alias: string
  remoteStream: MediaStream | null
  localStream: MediaStream | null
  presentationStream: MediaStream | null
  isAudioMuted: boolean
  isVideoMuted: boolean
  selfViewVisible: boolean
  transcriptionEnabled: boolean
  setTranscriptionEnabled: (v: boolean) => void
  presentationPopped: boolean
  transcripts: Array<{ id: string; text: string }>
  interimText: string | null
  onToggleMini: () => void
  onMuteAudio: (muted: boolean) => void
  onMuteVideo: (muted: boolean) => void
  onTogglePresentationPopout: () => void
  onLeave: () => void
}

export function MiniModeView({
  theme,
  remoteStream,
  localStream,
  isAudioMuted,
  isVideoMuted,
  selfViewVisible,
  transcriptionEnabled,
  setTranscriptionEnabled,
  presentationStream,
  presentationPopped,
  transcripts,
  interimText,
  onToggleMini,
  onMuteAudio,
  onMuteVideo,
  onTogglePresentationPopout,
  onLeave,
}: MiniModeViewProps) {
  const miniVideoRef = useRef<HTMLVideoElement>(null)
  const miniSelfRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (miniVideoRef.current && remoteStream) {
      miniVideoRef.current.srcObject = remoteStream
    }
    if (miniSelfRef.current && localStream) {
      miniSelfRef.current.srcObject = localStream
    }
  }, [remoteStream, localStream, isVideoMuted])

  const [miniHover, setMiniHover] = useState(false)
  const miniHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [miniTranscript, setMiniTranscript] = useState(false)

  function handleMiniEnter() {
    if (miniHoverTimer.current) clearTimeout(miniHoverTimer.current)
    setMiniHover(true)
  }
  function handleMiniLeave() {
    miniHoverTimer.current = setTimeout(() => setMiniHover(false), 3000)
  }

  async function toggleMiniTranscript() {
    const bridge = getElectronBridge()
    if (!bridge) return
    if (miniTranscript) {
      await bridge.adjustWidth(-320)
      setMiniTranscript(false)
    } else {
      if (!transcriptionEnabled) setTranscriptionEnabled(true)
      await bridge.adjustWidth(320)
      setMiniTranscript(true)
    }
  }

  return (
    <div
      className="relative w-full h-screen flex flex-row font-sans antialiased overflow-hidden"
      style={{ background: theme.bg }}
      onMouseEnter={handleMiniEnter}
      onMouseLeave={handleMiniLeave}
    >
      {/* Video side */}
      <div className="relative w-[320px] shrink-0 h-full">
        <div className="absolute top-0 left-0 right-0 h-8 z-20" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <button
            onClick={onToggleMini}
            className={`absolute top-1.5 ${miniTranscript ? 'left-2' : 'right-2'} w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/10 transition-all duration-300 ${miniHover ? 'opacity-100' : 'opacity-0'}`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title="Exit mini mode"
          >
            <Maximize2 size={11} />
          </button>
        </div>

        {remoteStream ? (
          <video
            ref={miniVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] text-white/25">No video</span>
          </div>
        )}

        {selfViewVisible && localStream && (
          <div className={`absolute bottom-1.5 right-1.5 w-[64px] h-[48px] rounded-lg overflow-hidden border border-white/10 shadow-lg bg-black/60 z-10 transition-all duration-300 ${isVideoMuted ? 'opacity-0 pointer-events-none' : miniHover ? 'opacity-100 bottom-[52px]' : 'opacity-100'}`}>
            <video
              ref={miniSelfRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />
          </div>
        )}

        <div
          className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 py-2 px-3 bg-linear-to-t from-black/80 to-transparent transition-all duration-300 ${miniHover ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => onMuteAudio(!isAudioMuted)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              isAudioMuted
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-white/8 text-white/70 hover:bg-white/12'
            }`}
          >
            {isAudioMuted ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
          <button
            onClick={() => onMuteVideo(!isVideoMuted)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              isVideoMuted
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-white/8 text-white/70 hover:bg-white/12'
            }`}
          >
            {isVideoMuted ? <VideoOff size={15} /> : <Video size={15} />}
          </button>
          <button
            onClick={toggleMiniTranscript}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              miniTranscript
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-white/8 text-white/70 hover:bg-white/12'
            }`}
          >
            <FileText size={15} />
          </button>
          {presentationStream && (
            <button
              onClick={onTogglePresentationPopout}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                presentationPopped
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-white/8 text-white/70 hover:bg-white/12'
              }`}
            >
              <MonitorUp size={15} />
            </button>
          )}
          <button
            onClick={onLeave}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-rose-600 text-white hover:bg-rose-500 transition-colors"
          >
            <PhoneOff size={15} />
          </button>
        </div>
      </div>

      {/* Transcript sidecar */}
      {miniTranscript && (
        <div className="w-[320px] h-full flex flex-col border-l border-white/6 shrink-0">
          <div className="h-8 flex items-end px-3 pb-0.5" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
            <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/30">Live Captions</span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 [scrollbar-width:none]">
            {transcripts.length === 0 && !interimText ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[11px] text-white/25">Listening...</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {transcripts.slice(-5).map((t) => (
                  <p key={t.id} className="text-[12px] leading-relaxed text-white/70">{t.text}</p>
                ))}
                {interimText && (
                  <p className="text-[12px] leading-relaxed text-white/40 italic">{interimText}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
