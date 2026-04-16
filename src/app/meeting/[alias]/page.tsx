'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useParams } from 'next/navigation'
import { AnimatePresence, motion, useMotionValue } from 'framer-motion'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Rows2,
  PinOff,
  Maximize2,
  Minimize2,
  Settings2,
  BarChart3,
  MonitorUp,
  PictureInPicture2,
  FileText,
} from 'lucide-react'
import { ControlBar } from '@/components/resync/ControlBar'
import { DockPanel, type DockTab, type DockMode } from '@/components/resync/DockPanel'
import { GlassPanel } from '@/components/resync/GlassPanel'
import { BackgroundEngine } from '@/components/resync/BackgroundEngine'
import { SubtitleBar } from '@/components/resync/SubtitleBar'
import { SettingsModal } from '@/components/modals/SettingsModal'
import { CallStatsModal } from '@/components/modals/CallStatsModal'
import { DTMFModal } from '@/components/modals/DTMFModal'
import { usePexip } from '@/contexts/PexipContext'
import { usePip } from '@/contexts/PipContext'
import { useTheme } from '@/hooks/useTheme'
import { useSettings } from '@/hooks/useSettings'
import { useRegistration } from '@/contexts/RegistrationContext'
import { useTranscription } from '@/hooks/useTranscription'
import { useLocalTranscription } from '@/hooks/useLocalTranscription'
import { useElectron, getElectronBridge } from '@/hooks/useElectron'

export default function MeetingPage() {
  const router = useRouter()
  const { theme, themeId, setTheme, applyThemeToDocument } = useTheme()
  const { settings, saveSettings } = useSettings()
  const {
    status: regStatus,
    error: regError,
    register: regRegister,
    unregister: regUnregister,
  } = useRegistration()
  const params = useParams()
  const alias = decodeURIComponent(params.alias as string)

  const { isElectron, isExpanded, isMini, toggleExpand, toggleMini } = useElectron()
  const [showSettings, setShowSettings] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const {
    connectionState,
    localStream,
    remoteStream,
    presentationStream,
    isAudioMuted,
    isVideoMuted,
    isPresenting,
    chatMessages,
    participants,
    currentMeetingId,
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
  } = usePexip()
  const pip = usePip()
  const [layout, setLayout] = useState<'focus' | 'gallery' | 'side-by-side'>('focus')
  useEffect(() => {
    if (isMini) {
      setLayout('focus')
    } else if (!isExpanded && layout === 'side-by-side') {
      setLayout('focus')
    }
  }, [isMini, isExpanded, layout])
  const [selfViewVisible, setSelfViewVisible] = useState(true)
  const [pipLayout, setPipLayout] = useState<'portrait' | 'halves'>('portrait')
  const [dockTab, setDockTab] = useState<DockTab | null>(null)
  const [dockMode, setDockMode] = useState<'bottom' | 'side'>('bottom')
  const [message, setMessage] = useState('')
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(false)
  const [captionsVisible, setCaptionsVisible] = useState(true)
  const [showDTMF, setShowDTMF] = useState(false)
  const [presentationPopped, setPresentationPopped] = useState(false)

  const sideDockOpen = dockMode === 'side' && dockTab !== null

  const targetAspectRatio: '16:9' | '9:16' =
    isMini ? '16:9'
    : isExpanded ? '16:9'
    : layout === 'gallery' ? '16:9'
    : sideDockOpen ? '16:9'
    : '9:16'

  const pipX = useMotionValue(0)
  const pipY = useMotionValue(0)

  const pipResetKey = `${layout}-${isMini}-${isExpanded}-${dockTab}-${dockMode}-${targetAspectRatio}`
  const prevPipResetKey = useRef(pipResetKey)
  useEffect(() => {
    if (prevPipResetKey.current !== pipResetKey) {
      pipX.set(0)
      pipY.set(0)
      prevPipResetKey.current = pipResetKey
    }
  }, [pipResetKey, pipX, pipY])

  useEffect(() => {
    if (connectionState !== 'connected') return
    if (pip.isActive) {
      const ratio = pipLayout === 'portrait' ? 9 / 16 : 16 / 9
      requestAspectRatio(ratio)
    } else {
      const ratio = targetAspectRatio === '16:9' ? 16 / 9 : 9 / 16
      requestAspectRatio(ratio)
    }
  }, [targetAspectRatio, pipLayout, pip.isActive, connectionState, requestAspectRatio])

  const popoutWindowRef = useRef<Window | null>(null)
  const mainVideoRef = useRef<HTMLElement | null>(null)

  // Mute reminder -- flash periodically when mic is muted
  const [muteReminderVisible, setMuteReminderVisible] = useState(false)
  useEffect(() => {
    if (!isAudioMuted) {
      setMuteReminderVisible(false)
      return
    }
    // Show immediately when first muted, then cycle
    setMuteReminderVisible(true)
    const hide = setTimeout(() => setMuteReminderVisible(false), 3000)
    const interval = setInterval(() => {
      setMuteReminderVisible(true)
      setTimeout(() => setMuteReminderVisible(false), 3000)
    }, 20000)
    return () => {
      clearTimeout(hide)
      clearInterval(interval)
    }
  }, [isAudioMuted])

  // Live transcription
  const {
    transcripts: liveTranscripts,
    latestTranscript,
    interimText,
    interimSpeaker,
    isConnected: isTranscriptionConnected,
    connect: connectTranscription,
    disconnect: disconnectTranscription,
  } = useTranscription({
    sipUri: currentMeetingId,
    autoConnect: false,
  })

  const localTranscription = useLocalTranscription({
    autoConnect: false,
    localStream,
    remoteStream,
  })

  // Prefer local transcription in Electron when models are available
  const hasRemoteAgent = !!process.env.NEXT_PUBLIC_TRANSCRIPTION_API_URL
  const useLocal = isElectron && localTranscription.isAvailable

  // Connect/disconnect transcription based on toggle + call state
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

  // Merged transcript sources -- whichever mode is active
  const activeTranscripts = useLocal ? localTranscription.transcripts : liveTranscripts
  const activeLatest = useLocal ? localTranscription.latestTranscript : latestTranscript
  const activeInterim = useLocal ? localTranscription.interimText : interimText
  const activeInterimSpeaker = useLocal ? localTranscription.interimSpeaker : interimSpeaker
  const activeTranscriptionConnected = useLocal
    ? localTranscription.isConnected
    : isTranscriptionConnected

  const SIDE_DOCK_WIDTH = 336 // 320px panel + 16px margin

  // Extend/shrink Electron window when side dock opens/closes
  const sideDockOpenRef = useRef(false)
  useEffect(() => {
    const bridge = getElectronBridge()
    if (!bridge) return

    const shouldBeOpen = dockMode === 'side' && dockTab !== null
    if (shouldBeOpen && !sideDockOpenRef.current) {
      sideDockOpenRef.current = true
      bridge.adjustWidth(SIDE_DOCK_WIDTH)
    } else if (!shouldBeOpen && sideDockOpenRef.current) {
      sideDockOpenRef.current = true
      bridge.adjustWidth(-SIDE_DOCK_WIDTH)
      sideDockOpenRef.current = false
    }
  }, [dockMode, dockTab])

  // Shrink window back if component unmounts with side dock open
  useEffect(() => {
    return () => {
      if (sideDockOpenRef.current) {
        const bridge = getElectronBridge()
        bridge?.adjustWidth(-SIDE_DOCK_WIDTH)
      }
    }
  }, [])

  // Reset transcription when call ends
  useEffect(() => {
    if (connectionState === 'disconnected') {
      setTranscriptionEnabled(false)
    }
  }, [connectionState])

  // Callback refs that attach srcObject the moment the video element mounts
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)

  const setRemoteVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      remoteVideoRef.current = el
      if (el && remoteStream) {
        el.srcObject = remoteStream
      }
    },
    [remoteStream],
  )

  const setLocalVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      localVideoRef.current = el
      if (el && localStream) {
        el.srcObject = localStream
      }
    },
    [localStream],
  )

  const presentationVideoRef = useRef<HTMLVideoElement>(null)
  const setPresentationVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      presentationVideoRef.current = el
      if (el && presentationStream) {
        el.srcObject = presentationStream
      }
    },
    [presentationStream],
  )

  useEffect(() => {
    if (connectionState === 'disconnected' || connectionState === 'error') {
      router.push('/')
    }
  }, [connectionState, router])

  // Also re-attach when streams change on already-mounted elements
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

  // Apply theme to PiP window
  useEffect(() => {
    if (pip.isActive && pip.pipWindow) {
      applyThemeToDocument(theme, pip.pipWindow.document)
    }
  }, [pip.isActive, pip.pipWindow, theme, applyThemeToDocument])

  function handleLeave() {
    if (miniTranscript) {
      const bridge = getElectronBridge()
      bridge?.adjustWidth(-320)
      setMiniTranscript(false)
    }
    closePresentationPopout()
    disconnect()
    router.push('/')
  }

  function openPresentationPopout() {
    if (popoutWindowRef.current && !popoutWindowRef.current.closed) {
      popoutWindowRef.current.focus()
      return
    }
    const win = window as Window & { __presentationStream?: MediaStream }
    win.__presentationStream = presentationStream ?? undefined
    const popup = window.open('/presentation-popout', 'presentation', 'popup')
    if (popup) {
      popoutWindowRef.current = popup
      setPresentationPopped(true)
      const check = setInterval(() => {
        if (popup.closed) {
          clearInterval(check)
          popoutWindowRef.current = null
          setPresentationPopped(false)
          delete win.__presentationStream
        }
      }, 500)
    }
  }

  function closePresentationPopout() {
    if (popoutWindowRef.current && !popoutWindowRef.current.closed) {
      popoutWindowRef.current.close()
    }
    popoutWindowRef.current = null
    setPresentationPopped(false)
    const win = window as Window & { __presentationStream?: MediaStream }
    delete win.__presentationStream
  }

  useEffect(() => {
    const win = window as Window & { __presentationStream?: MediaStream }
    if (presentationPopped && presentationStream) {
      win.__presentationStream = presentationStream
    }
    if (!presentationStream && presentationPopped) {
      closePresentationPopout()
    }
  }, [presentationStream, presentationPopped])

  const isBroadcasting = !isAudioMuted && !isVideoMuted
  const isAudioOnly = !isAudioMuted && isVideoMuted

  // Shared self-view content for PiP
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

  // PiP controls bar
  const pipControls = (
    <div className="relative z-20 px-4 pb-6">
      <div className="flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/8">
        <button
          onClick={() => muteAudio(!isAudioMuted)}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200
            ${
              isAudioMuted
                ? 'bg-rose-500/15 border border-rose-500/25 text-rose-400'
                : 'bg-white/10 border border-white/10 text-white/80'
            }`}
        >
          {isAudioMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button
          onClick={() => muteVideo(!isVideoMuted)}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200
            ${
              isVideoMuted
                ? 'bg-rose-500/15 border border-rose-500/25 text-rose-400'
                : 'bg-white/10 border border-white/10 text-white/80'
            }`}
        >
          {isVideoMuted ? <VideoOff size={16} /> : <Video size={16} />}
        </button>
        <button
          onClick={() => setPipLayout(pipLayout === 'portrait' ? 'halves' : 'portrait')}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200
            ${
              pipLayout === 'halves'
                ? 'bg-blue-500/15 border border-blue-500/25 text-blue-400'
                : 'bg-white/10 border border-white/10 text-white/40'
            }`}
          title={pipLayout === 'portrait' ? 'Halves view' : 'Portrait view'}
        >
          <Rows2 size={16} />
        </button>
        <div className="w-px h-7 bg-white/10" />
        <button
          onClick={handleLeave}
          className="w-11 h-11 rounded-full bg-rose-600 flex items-center justify-center text-white hover:bg-rose-500 transition-colors"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  )

  const pipTopBar = (
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

  const pipMeetingContent =
    pipLayout === 'portrait' ? (
      <div className="relative h-screen w-full flex flex-col font-sans overflow-hidden antialiased bg-black">
        <div className="absolute inset-0">
          {remoteStream ? (
            <video
              ref={setRemoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover bg-black"
            />
          ) : (
            remoteVideoPlaceholder
          )}
        </div>
        {/* Self-view pip at bottom-right */}
        {selfViewVisible && (
          <div className="absolute bottom-28 right-4 z-30 w-[110px] h-[148px] rounded-2xl overflow-hidden border border-white/15 shadow-2xl">
            {selfViewContent}
          </div>
        )}
        {pipTopBar}
        <div className="flex-1" />
        {pipControls}
      </div>
    ) : (
      <div className="relative h-screen w-full flex flex-col font-sans overflow-hidden antialiased bg-black">
        {pipTopBar}
        <div className="flex-1 flex flex-col min-h-0 px-3 pt-2 pb-2 gap-2">
          <div className="flex-1 rounded-2xl overflow-hidden bg-black/30 border border-white/6 min-h-0">
            {remoteStream ? (
              <video
                ref={setRemoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
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
        {pipControls}
      </div>
    )

  // When PiP is active, portal meeting content into the floating window
  if (pip.isActive && pip.pipWindow) {
    return (
      <>
        {createPortal(pipMeetingContent, pip.pipWindow.document.body)}
        <div className="min-h-screen w-full flex flex-col items-center justify-center font-sans gap-4">
          <div className="text-white/20 text-sm tracking-widest uppercase">
            In Call — Floating Window
          </div>
          <button
            onClick={handleLeave}
            className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm"
          >
            Leave Call
          </button>
        </div>
      </>
    )
  }

  const miniVideoRef = useRef<HTMLVideoElement>(null)
  const miniSelfRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (miniVideoRef.current && remoteStream && isMini) {
      miniVideoRef.current.srcObject = remoteStream
    }
    if (miniSelfRef.current && localStream && isMini) {
      miniSelfRef.current.srcObject = localStream
    }
  }, [remoteStream, localStream, isMini, isVideoMuted])

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

  if (isElectron && isMini) {
    return (
      <div
        className="relative w-full h-screen flex flex-row font-sans antialiased overflow-hidden"
        style={{ background: theme.bg }}
        onMouseEnter={handleMiniEnter}
        onMouseLeave={handleMiniLeave}
      >
        {/* Video side (left) */}
        <div className="relative w-[320px] shrink-0 h-full">
          {/* Drag region */}
          <div className="absolute top-0 left-0 right-0 h-8 z-20" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
            <button
              onClick={toggleMini}
              className={`absolute top-1.5 ${miniTranscript ? 'left-2' : 'right-2'} w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/10 transition-all duration-300 ${miniHover ? 'opacity-100' : 'opacity-0'}`}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              title="Exit mini mode"
            >
              <Maximize2 size={11} />
            </button>
          </div>

          {/* Remote video */}
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

          {/* Self-view PiP */}
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

          {/* Controls -- overlays bottom, auto-hides */}
          <div
            className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 py-2 px-3 bg-linear-to-t from-black/80 to-transparent transition-all duration-300 ${miniHover ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              onClick={() => muteAudio(!isAudioMuted)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                isAudioMuted
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-white/8 text-white/70 hover:bg-white/12'
              }`}
            >
              {isAudioMuted ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
            <button
              onClick={() => muteVideo(!isVideoMuted)}
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
                onClick={presentationPopped ? closePresentationPopout : openPresentationPopout}
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
              onClick={handleLeave}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-rose-600 text-white hover:bg-rose-500 transition-colors"
            >
              <PhoneOff size={15} />
            </button>
          </div>
        </div>

        {/* Transcript sidecar (right) */}
        {miniTranscript && (
          <div className="w-[320px] h-full flex flex-col border-l border-white/6 shrink-0">
            <div className="h-8 flex items-end px-3 pb-0.5" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
              <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/30">Live Captions</span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 [scrollbar-width:none]">
              {activeTranscripts.length === 0 && !activeInterim ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[11px] text-white/25">Listening...</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {activeTranscripts.slice(-5).map((t: { id: string; text: string }) => (
                    <p key={t.id} className="text-[12px] leading-relaxed text-white/70">{t.text}</p>
                  ))}
                  {activeInterim && (
                    <p className="text-[12px] leading-relaxed text-white/40 italic">{activeInterim}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col antialiased overflow-hidden">
      {isElectron && (
        <div
          className="absolute top-0 left-0 h-12 z-100 [-webkit-app-region:drag]"
          style={{ right: dockMode === 'side' && dockTab ? 336 : 0 }}
        />
      )}
      <BackgroundEngine
        active={isBroadcasting}
        isLate={false}
        isCancelling={false}
        isAudioOnly={!isAudioMuted && isVideoMuted}
        waveRgb={theme.waveRgb}
        accentColor={theme.accentColor}
      />

      <div className="relative z-10 flex h-screen">
      <div className={`flex flex-col flex-1 min-w-0 px-3 pb-2 ${isElectron ? 'pt-12' : 'pt-2'}`}>
        {/* Header -- sits just below the drag region in Electron */}
        <header className="flex items-center justify-between shrink-0 px-1 mb-2">
          <span className="text-[13px] text-white/50 font-medium truncate max-w-[200px] [-webkit-app-region:no-drag]">
            {participants.find((p) => p.display_name !== settings.displayName)?.display_name || alias}
          </span>
          <div className="flex items-center gap-1.5">
            {isElectron && presentationStream && (
              <button
                onClick={presentationPopped ? closePresentationPopout : openPresentationPopout}
                className={`w-8 h-8 rounded-full flex items-center justify-center hover:text-white/85 glass-button [-webkit-app-region:no-drag] ${presentationPopped ? 'text-blue-400' : 'text-white/60'}`}
                title={presentationPopped ? 'Close presentation window' : 'Pop out presentation'}
                aria-label={presentationPopped ? 'Close presentation window' : 'Pop out presentation'}
              >
                <MonitorUp size={14} strokeWidth={1.5} />
              </button>
            )}
            <button
              onClick={() => setShowStats(!showStats)}
              className={`w-8 h-8 rounded-full flex items-center justify-center hover:text-white/85 glass-button [-webkit-app-region:no-drag] ${showStats ? 'text-blue-400' : 'text-white/60'}`}
              title="Call statistics"
              aria-label="Call statistics"
            >
              <BarChart3 size={14} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white/85 glass-button [-webkit-app-region:no-drag]"
              title="Settings"
              aria-label="Settings"
            >
              <Settings2 size={14} strokeWidth={1.5} />
            </button>
            {isElectron && (
              <>
                <button
                  onClick={toggleMini}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white/85 glass-button [-webkit-app-region:no-drag]"
                  title="Mini mode"
                  aria-label="Mini mode"
                >
                  <PictureInPicture2 size={14} strokeWidth={1.5} />
                </button>
                <button
                  onClick={toggleExpand}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white/85 glass-button [-webkit-app-region:no-drag]"
                  title={isExpanded ? 'Compact view' : 'Expanded view'}
                  aria-label={isExpanded ? 'Compact view' : 'Expanded view'}
                >
                  {isExpanded ? (
                    <Minimize2 size={14} strokeWidth={1.5} />
                  ) : (
                    <Maximize2 size={14} strokeWidth={1.5} />
                  )}
                </button>
              </>
            )}
          </div>
        </header>

        {/* Content row: video + subtitle on left, side dock on right */}
        <div className={`flex flex-row flex-1 min-h-0 ${dockTab && dockMode === 'bottom' ? 'flex-[2]' : ''}`}>
        <div className="flex flex-col flex-1 min-w-0">

        {/* Video panels -- shrinks vertically when dock is open */}
        <main
          ref={mainVideoRef}
          className={`relative min-h-0 flex-1 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            layout === 'focus'
              ? 'flex flex-col justify-center'
              : layout === 'gallery'
                ? 'flex flex-col gap-3'
                : 'flex flex-row gap-4'
          }`}
        >
          {/* Content tile — only in expanded gallery/side-by-side when presentation stream is separate */}
          {isExpanded && presentationStream && !presentationPopped && layout !== 'focus' && (
            <GlassPanel
              className={`relative flex items-center justify-center bg-black/50 ${
                layout === 'gallery' ? 'flex-1 min-h-0 w-full' : 'flex-[2] h-full'
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

          {/* Far-side (remote) video */}
          {layout === 'focus' ? (
            <GlassPanel className="relative h-full w-full" hoverEffect={false}>
              {remoteStream ? (
                <video
                  ref={setRemoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
                  Waiting for conference feed...
                </div>
              )}
            </GlassPanel>
          ) : layout === 'gallery' ? (
            isExpanded && presentationStream && !presentationPopped ? (
              <div className="flex-1 flex flex-row gap-3 min-h-0">
                <GlassPanel className="relative flex-1 min-h-0" hoverEffect={false}>
                  {remoteStream ? (
                    <video
                      ref={setRemoteVideoRef}
                      autoPlay
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
                      Waiting for conference feed...
                    </div>
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
                      <div className="absolute inset-0 flex items-center justify-center text-white/30">
                        <VideoOff size={20} strokeWidth={1.5} />
                      </div>
                    )}
                  </GlassPanel>
                )}
              </div>
            ) : (
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
                    <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
                      Waiting for conference feed...
                    </div>
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
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/30">
                        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                          <VideoOff size={32} strokeWidth={1.5} />
                        </div>
                        <span className="text-xs uppercase tracking-widest">Camera off</span>
                      </div>
                    )}
                  </GlassPanel>
                )}
              </>
            )
          ) : (
            isExpanded && presentationStream && !presentationPopped ? (
              <div className="flex-1 flex flex-col gap-3">
                <GlassPanel className="relative flex-1 min-h-0" hoverEffect={false}>
                  {remoteStream ? (
                    <video
                      ref={setRemoteVideoRef}
                      autoPlay
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
                      Waiting for conference feed...
                    </div>
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
                      <div className="absolute inset-0 flex items-center justify-center text-white/30">
                        <VideoOff size={20} strokeWidth={1.5} />
                      </div>
                    )}
                  </GlassPanel>
                )}
              </div>
            ) : (
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
                    <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
                      Waiting for conference feed...
                    </div>
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
                      <div className="absolute inset-0 flex items-center justify-center text-white/30">
                        <VideoOff size={20} strokeWidth={1.5} />
                      </div>
                    )}
                  </GlassPanel>
                )}
              </>
            )
          )}

          {/* Self-view PIP — Focus mode only */}
          {layout === 'focus' && selfViewVisible && (
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
        </main>

        {/* Subtitle Bar */}
        <SubtitleBar
          interimText={activeInterim}
          latestTranscript={activeLatest}
          isTranscriptionConnected={activeTranscriptionConnected}
          captionsVisible={transcriptionEnabled && captionsVisible}
        />

        </div>{/* end video column */}

        {/* Side dock: inline within content row, aligns with video + subtitle */}
        {dockMode === 'side' && (
          <AnimatePresence>
            {dockTab ? (
              <DockPanel
                activeTab={dockTab}
                mode={dockMode}
                onTabChange={setDockTab}
                onClose={() => setDockTab(null)}
                onToggleMode={() => setDockMode('bottom')}
                chatMessages={chatMessages}
                participants={participants}
                message={message}
                onMessageChange={setMessage}
                onSend={() => {
                  if (message.trim()) {
                    sendChatMessage(message.trim())
                    setMessage('')
                  }
                }}
                transcripts={activeTranscripts}
                interimText={activeInterim}
                interimSpeaker={activeInterimSpeaker}
                isTranscriptionConnected={activeTranscriptionConnected}
              />
            ) : (
              <div key="side-prerender" className="hidden">
                <DockPanel
                  activeTab="transcript"
                  mode="side"
                  onTabChange={() => {}}
                  onClose={() => {}}
                  onToggleMode={() => {}}
                  chatMessages={chatMessages}
                  participants={participants}
                  message=""
                  onMessageChange={() => {}}
                  onSend={() => {}}
                  transcripts={activeTranscripts}
                  interimText={activeInterim}
                  interimSpeaker={activeInterimSpeaker}
                  isTranscriptionConnected={activeTranscriptionConnected}
                />
              </div>
            )}
          </AnimatePresence>
        )}

        </div>{/* end content row */}

        {/* Dock Panel: bottom (slide-up) mode */}
        {dockMode === 'bottom' && (
          <AnimatePresence>
            {dockTab ? (
              <DockPanel
                activeTab={dockTab}
                mode={dockMode}
                onTabChange={setDockTab}
                onClose={() => setDockTab(null)}
                onToggleMode={() => setDockMode('side')}
                chatMessages={chatMessages}
                participants={participants}
                message={message}
                onMessageChange={setMessage}
                onSend={() => {
                  if (message.trim()) {
                    sendChatMessage(message.trim())
                    setMessage('')
                  }
                }}
                transcripts={activeTranscripts}
                interimText={activeInterim}
                interimSpeaker={activeInterimSpeaker}
                isTranscriptionConnected={activeTranscriptionConnected}
              />
            ) : (
              <div key="bottom-prerender" className="hidden">
                <DockPanel
                  activeTab="transcript"
                  mode="bottom"
                  onTabChange={() => {}}
                  onClose={() => {}}
                  onToggleMode={() => {}}
                  chatMessages={chatMessages}
                  participants={participants}
                  message=""
                  onMessageChange={() => {}}
                  onSend={() => {}}
                  transcripts={activeTranscripts}
                  interimText={activeInterim}
                  interimSpeaker={activeInterimSpeaker}
                  isTranscriptionConnected={activeTranscriptionConnected}
                />
              </div>
            )}
          </AnimatePresence>
        )}

        <div className="shrink-0 w-full pb-2 pt-1.5">
          <ControlBar
            isMuted={isAudioMuted}
            isVideoOff={isVideoMuted}
            isPipActive={pip.isActive}
            isPipSupported={pip.isSupported}
            isPresenting={isPresenting}
            transcriptionEnabled={transcriptionEnabled}
            captionsVisible={captionsVisible}
            activeDockTab={dockTab}
            dockMode={dockMode}
            layout={layout}
            selfViewVisible={selfViewVisible}
            onToggleSelfView={() => setSelfViewVisible((v) => !v)}
            audioInputId={settings.audioInput}
            videoInputId={settings.videoInput}
            onAudioInputChange={(id) => saveSettings({ audioInput: id })}
            onVideoInputChange={(id) => saveSettings({ videoInput: id })}
            onToggleMic={() => muteAudio(!isAudioMuted)}
            onToggleVideo={() => muteVideo(!isVideoMuted)}
            onTogglePip={() => (pip.isActive ? pip.closePip() : pip.openPip())}
            onToggleLayout={isMini ? undefined : () =>
              setLayout((l) => {
                if (isExpanded) {
                  return l === 'focus' ? 'gallery' : l === 'gallery' ? 'side-by-side' : 'focus'
                }
                return l === 'focus' ? 'gallery' : 'focus'
              })
            }
            onToggleShare={() => (isPresenting ? stopScreenShare() : startScreenShare())}
            onToggleTranscription={() => setTranscriptionEnabled(!transcriptionEnabled)}
            onToggleCaptions={() => {
              if (!transcriptionEnabled) {
                setTranscriptionEnabled(true)
                setCaptionsVisible(true)
              } else {
                setCaptionsVisible(!captionsVisible)
              }
            }}
            onDockTab={(tab: DockTab) => setDockTab((prev) => (prev === tab ? null : tab))}
            onDockClose={() => setDockTab(null)}
            onDockMode={setDockMode}
            onSettings={() => setShowSettings(true)}
            onDTMF={() => setShowDTMF(true)}
            onLeave={handleLeave}
          />
        </div>
      </div>
      </div>

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        themeId={themeId}
        onThemeChange={setTheme}
        registrationStatus={regStatus}
        registrationError={regError}
        onRegister={async (creds, node) => {
          await regRegister(creds, node)
        }}
        onUnregister={async () => {
          await regUnregister()
        }}
      />

      <AnimatePresence>
        {showStats && (
          <CallStatsModal
            open={showStats}
            onClose={() => setShowStats(false)}
            getStats={getMediaStatistics}
          />
        )}
      </AnimatePresence>

      <DTMFModal
        open={showDTMF}
        onClose={() => setShowDTMF(false)}
        onSendDTMF={sendDTMF}
      />
    </div>
  )
}
