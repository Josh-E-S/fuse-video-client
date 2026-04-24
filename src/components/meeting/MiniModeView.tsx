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
  MonitorPlay,
  Users,
  ScreenShare,
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
  isPresenting: boolean
  selfViewVisible: boolean
  transcriptionEnabled: boolean
  setTranscriptionEnabled: (v: boolean) => void
  presentationPopped: boolean
  transcripts: Array<{ id: string; text: string }>
  interimText: string | null
  onToggleMini: () => void
  onMuteAudio: (muted: boolean) => void
  onMuteVideo: (muted: boolean) => void
  onToggleShare: () => void
  onTogglePresentationPopout: () => void
  onLeave: () => void
}

export function MiniModeView({
  theme,
  remoteStream,
  localStream,
  isAudioMuted,
  isVideoMuted,
  isPresenting,
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
  onToggleShare,
  onTogglePresentationPopout,
  onLeave,
}: MiniModeViewProps) {
  const miniRemoteRef = useRef<HTMLVideoElement>(null)
  const miniContentRef = useRef<HTMLVideoElement>(null)
  const miniSelfRef = useRef<HTMLVideoElement>(null)

  const [miniHover, setMiniHover] = useState(false)
  const miniHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [miniTranscript, setMiniTranscript] = useState(false)
  const [miniView, setMiniView] = useState<'far' | 'content'>('far')

  // When the local user starts sharing, auto-flip to content view so they see what they're presenting.
  // Only on the rising edge — user can still manually flip back to far-end.
  const wasPresentingRef = useRef(isPresenting)
  useEffect(() => {
    if (isPresenting && !wasPresentingRef.current) {
      setMiniView('content')
    }
    wasPresentingRef.current = isPresenting
  }, [isPresenting])

  // showContent is derived — when no presentation, we always show the far end regardless of miniView.
  const showContent = miniView === 'content' && !!presentationStream && !presentationPopped

  useEffect(() => {
    if (miniRemoteRef.current && remoteStream) {
      miniRemoteRef.current.srcObject = remoteStream
    }
    if (miniContentRef.current && presentationStream) {
      miniContentRef.current.srcObject = presentationStream
    }
    if (miniSelfRef.current && localStream) {
      miniSelfRef.current.srcObject = localStream
    }
  }, [remoteStream, localStream, presentationStream, isVideoMuted, showContent])

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
      await bridge.adjustWidth(-640)
      setMiniTranscript(false)
    } else {
      if (!transcriptionEnabled) setTranscriptionEnabled(true)
      await bridge.adjustWidth(640)
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
      <div className="relative w-[640px] shrink-0 h-full">
        <div className="absolute top-0 left-0 right-0 h-10 z-20" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <button
            onClick={onToggleMini}
            className={`absolute top-2 ${miniTranscript ? 'left-2' : 'right-2'} h-7 px-3 rounded-lg flex items-center gap-1.5 bg-black/70 hover:bg-black/90 border border-white/15 text-white text-[12px] font-medium shadow-lg transition-colors`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title="Exit mini mode"
          >
            <Maximize2 size={13} />
            <span>Exit</span>
          </button>
        </div>

        {/* Main video: remote OR presentation depending on miniView */}
        {showContent ? (
          <video
            ref={miniContentRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
        ) : remoteStream ? (
          <video
            ref={miniRemoteRef}
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
          <div className={`absolute bottom-3 right-3 w-[128px] h-[96px] rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black/60 z-10 transition-all duration-300 ${isVideoMuted ? 'opacity-0 pointer-events-none' : miniHover ? 'opacity-100 bottom-[72px]' : 'opacity-100'}`}>
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
          <button
            onClick={onToggleShare}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              isPresenting
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-white/8 text-white/70 hover:bg-white/12'
            }`}
            title={isPresenting ? 'Stop sharing' : 'Share content'}
          >
            <ScreenShare size={15} />
          </button>
          {presentationStream && !presentationPopped && (
            <button
              onClick={() => setMiniView((v) => (v === 'far' ? 'content' : 'far'))}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                miniView === 'content'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-white/8 text-white/70 hover:bg-white/12'
              }`}
              title={miniView === 'content' ? 'Show far end' : 'Show content'}
            >
              {miniView === 'content' ? <Users size={15} /> : <MonitorPlay size={15} />}
            </button>
          )}
          {presentationStream && (
            <button
              onClick={onTogglePresentationPopout}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                presentationPopped
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-white/8 text-white/70 hover:bg-white/12'
              }`}
              title={presentationPopped ? 'Close popout' : 'Pop out content'}
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
        <div className="w-[640px] h-full flex flex-col border-l border-white/6 shrink-0">
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
