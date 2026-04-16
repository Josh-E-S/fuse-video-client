'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Maximize2, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { getMeetingProvider } from '@/utils/meetingProvider'
import { getMeetingCountdown } from '@/utils/meetingDate'
import { acquireUserMedia } from '@/utils/media'
import { JoinModal } from '@/components/modals/JoinModal'
import { PreflightModal } from '@/components/modals/PreflightModal'
import { SetupWizard, useSetupRequired } from '@/components/modals/SetupWizard'
import { SettingsModal } from '@/components/modals/SettingsModal'
import { IncomingCallModal } from '@/components/modals/IncomingCallModal'
import { GradientBackground } from '@/components/home/GradientBackground'
import { TopBar } from '@/components/home/TopBar'
import { ClockDisplay } from '@/components/home/ClockDisplay'
import { FeaturedMeetingCard } from '@/components/home/FeaturedMeetingCard'
import { AdHocJoin } from '@/components/home/AdHocJoin'
import { ConnectingOverlay } from '@/components/home/ConnectingOverlay'
import { PipMeetingView } from '@/components/home/PipMeetingView'
import { usePexip } from '@/contexts/PexipContext'
import { useSettings } from '@/hooks/useSettings'
import { useMeetings } from '@/hooks/useMeetings'
import { useMeetingNotifications } from '@/hooks/useMeetingNotifications'
import { usePip } from '@/contexts/PipContext'
import { useTheme } from '@/hooks/useTheme'
import { useRegistration } from '@/contexts/RegistrationContext'
import { useRecentCalls } from '@/hooks/useRecentCalls'
import { useElectron } from '@/hooks/useElectron'
import type { CalendarMeeting } from '@/types/meetings'

export default function HomePage() {
  const router = useRouter()
  const { theme: cosmeticTheme, themeId, setTheme, applyThemeToDocument } = useTheme()
  const { settings, saveSettings } = useSettings()
  const setup = useSetupRequired()
  const {
    status: regStatus,
    error: regError,
    incomingCall,
    register: regRegister,
    unregister: regUnregister,
    answerCall,
    declineCall,
  } = useRegistration()
  const {
    connectionState,
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoMuted,
    error,
    joinConference,
    connectWithPin,
    disconnect,
    muteAudio,
    muteVideo,
    switchMediaDevices,
  } = usePexip()
  const { meetings } = useMeetings({
    otjClientId: settings.otjClientId,
    otjClientSecret: settings.otjClientSecret,
  })

  const handleNotificationJoin = useCallback((meeting: CalendarMeeting) => {
    if (meeting.alias) handleJoin(meeting.alias)
  }, [])

  useMeetingNotifications(meetings, handleNotificationJoin)

  const pip = usePip()
  const { isElectron, isExpanded, isMini, toggleExpand, toggleMini } = useElectron()

  const [showJoin, setShowJoin] = useState(false)
  const [joinProvider, setJoinProvider] = useState<{
    id: string
    icon: string
    label: string
  } | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [preflightAlias, setPreflightAlias] = useState<string | null>(null)
  const [preflightPin, setPreflightPin] = useState<string | undefined>(undefined)
  const [pendingAlias, setPendingAlias] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const { recentCalls, addRecentCall } = useRecentCalls()
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const ringingAudioRef = useRef<HTMLAudioElement | null>(null)
  const isInboundAnswerRef = useRef(false)

  const isVideoOff = isVideoMuted
  const [isJoining, setIsJoining] = useState(false)
  const isBusy = isJoining || connectionState === 'connecting'

  // Camera preview: request/release getUserMedia based on video toggle or device change
  useEffect(() => {
    if (isVideoOff) {
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop())
        setPreviewStream(null)
      }
      return
    }
    if (previewStream) {
      previewStream.getTracks().forEach((t) => t.stop())
    }
    let cancelled = false
    const videoConstraint = settings.videoInput
      ? { deviceId: { ideal: settings.videoInput } }
      : true
    navigator.mediaDevices
      .getUserMedia({ video: videoConstraint, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
        } else {
          setPreviewStream(stream)
        }
      })
      .catch(() => {
        muteVideo(true)
      })
    return () => {
      cancelled = true
    }
  }, [isVideoOff, settings.videoInput])

  useEffect(() => {
    if (connectionState === 'connected' && pendingAlias) {
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop())
        setPreviewStream(null)
      }
      setPreflightAlias(null)
      if (isElectron || !pip.isActive) {
        router.push(`/meeting/${encodeURIComponent(pendingAlias)}`)
      }
    }
  }, [connectionState, pendingAlias, router, previewStream, pip.isActive, isElectron])

  useEffect(() => {
    if ((connectionState === 'pin_required' || connectionState === 'pin_optional') && !showJoin && !isMini) {
      setPreflightAlias(null)
      const prov = getMeetingProvider(pendingAlias)
      setJoinProvider(prov ? { id: prov.id, icon: prov.icon, label: prov.label } : null)
      setShowJoin(true)
    }
  }, [connectionState, showJoin, pendingAlias, isMini])

  const prevAudioRef = useRef(settings.audioInput)
  const prevVideoRef = useRef(settings.videoInput)

  useEffect(() => {
    if (
      connectionState === 'connected' &&
      (prevAudioRef.current !== settings.audioInput || prevVideoRef.current !== settings.videoInput)
    ) {
      switchMediaDevices(settings.audioInput || undefined, settings.videoInput || undefined)
    }
    prevAudioRef.current = settings.audioInput
    prevVideoRef.current = settings.videoInput
  }, [settings.audioInput, settings.videoInput, connectionState, switchMediaDevices])

  useEffect(() => {
    if (timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft((prev) => prev - 1), 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [timeLeft])

  useEffect(() => {
    if (connectionState === 'connecting' && !isInboundAnswerRef.current) {
      const audio = new Audio(`/${settings.ringtone}`)
      audio.loop = true
      audio.volume = 0.5
      audio.play().catch(() => {})
      ringingAudioRef.current = audio
    } else if (ringingAudioRef.current) {
      ringingAudioRef.current.pause()
      ringingAudioRef.current.currentTime = 0
      ringingAudioRef.current = null
    }

    if (connectionState === 'disconnected') {
      isInboundAnswerRef.current = false
      setIsJoining(false)
    }

    return () => {
      if (ringingAudioRef.current) {
        ringingAudioRef.current.pause()
        ringingAudioRef.current = null
      }
    }
  }, [connectionState, settings.ringtone])

  // Inject cosmetic theme into PiP window
  useEffect(() => {
    if (pip.isActive && pip.pipWindow) {
      applyThemeToDocument(cosmeticTheme, pip.pipWindow.document)
    }
  }, [pip.isActive, pip.pipWindow, cosmeticTheme, applyThemeToDocument])

  function handleJoin(alias: string, pin?: string) {
    if (connectionState === 'pin_required' || connectionState === 'pin_optional') {
      connectWithPin(pin ?? '')
      setShowJoin(false)
      return
    }

    const nodeDomain = settings.nodeDomain || localStorage.getItem('fuse_node_domain') || ''
    if (!nodeDomain) {
      setShowJoin(false)
      setShowSettings(true)
      return
    }

    setShowJoin(false)
    setPreflightAlias(alias)
    setPreflightPin(pin)
  }

  async function handlePreflightJoin({ audioOff, videoOff }: { audioOff: boolean; videoOff: boolean }) {
    if (!preflightAlias || isJoining) return

    setIsJoining(true)

    const nodeDomain = settings.nodeDomain || localStorage.getItem('fuse_node_domain') || ''
    const displayName =
      settings.displayName || localStorage.getItem('fuse_display_name') || 'Guest'

    const userMediaStream = await acquireUserMedia({
      audioInput: settings.audioInput || undefined,
      videoInput: settings.videoInput || undefined,
    })

    if (previewStream) {
      previewStream.getTracks().forEach((t) => t.stop())
      setPreviewStream(null)
    }

    const alias = preflightAlias
    setPendingAlias(alias)
    addRecentCall(alias, joinProvider?.id || getMeetingProvider(alias)?.id)
    await joinConference({
      nodeDomain,
      conferenceAlias: alias,
      displayName,
      pin: preflightPin,
      audioOff,
      videoOff,
      userMediaStream,
    })
    setPreflightPin(undefined)
    setIsJoining(false)
  }

  async function handleAnswerIncoming() {
    const call = answerCall()
    if (!call) return

    const targetAlias = call.conferenceAlias

    isInboundAnswerRef.current = true

    const nodeDomain = settings.nodeDomain || localStorage.getItem('fuse_node_domain') || ''
    if (!nodeDomain) return

    const displayName =
      settings.displayName || localStorage.getItem('fuse_display_name') || 'Guest'

    const userMediaStream = await acquireUserMedia({
      audioInput: settings.audioInput || undefined,
      videoInput: settings.videoInput || undefined,
    })

    setPendingAlias(targetAlias)
    await joinConference({
      nodeDomain,
      conferenceAlias: targetAlias,
      displayName,
      registrationToken: call.token,
      audioOff: false,
      videoOff: false,
      audioDeviceId: settings.audioInput || undefined,
      videoDeviceId: settings.videoInput || undefined,
      userMediaStream,
    })
  }

  function handleCalendarJoin() {
    if (featuredMeeting?.alias) {
      if (isMini) {
        handleMiniJoin(featuredMeeting.alias)
        return
      }
      handleJoin(featuredMeeting.alias)
    } else {
      setJoinProvider(null)
      setShowJoin(true)
    }
  }

  async function handleMiniJoin(alias: string) {
    if (isJoining) return
    const nodeDomain = settings.nodeDomain || localStorage.getItem('fuse_node_domain') || ''
    if (!nodeDomain) return
    setIsJoining(true)
    setPreflightAlias(alias)
    const displayName = settings.displayName || localStorage.getItem('fuse_display_name') || 'Guest'
    const userMediaStream = await acquireUserMedia({
      audioInput: settings.audioInput || undefined,
      videoInput: settings.videoInput || undefined,
    })
    setPendingAlias(alias)
    addRecentCall(alias, getMeetingProvider(alias)?.id)
    await joinConference({
      nodeDomain,
      conferenceAlias: alias,
      displayName,
      audioOff: true,
      videoOff: true,
      userMediaStream,
    })
    setIsJoining(false)
  }

  // In-PiP meeting state
  const inPipCall = pip.isActive && connectionState === 'connected' && !!pendingAlias

  function handleLeavePip() {
    disconnect()
    setPendingAlias(null)
  }

  const displayName = settings.displayName || 'Guest'
  const userInitials = displayName.trim()
    ? displayName
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'RS'

  // Determine featured meeting
  const [featuredIdx, setFeaturedIdx] = useState(0)
  const [calendarExpanded, setCalendarExpanded] = useState(false)
  const [recentsExpanded, setRecentsExpanded] = useState(false)
  const [miniIdx, setMiniIdx] = useState(0)
  const [miniPin, setMiniPin] = useState('')
  useEffect(() => { setMiniIdx(0) }, [meetings.length])
  const [userSelected, setUserSelected] = useState(false)
  useEffect(() => {
    setFeaturedIdx(0)
    setUserSelected(false)
  }, [meetings.length])

  // Auto-revert to current meeting after 10s of user browsing
  useEffect(() => {
    if (!userSelected) return
    const timer = setTimeout(() => setUserSelected(false), 10_000)
    return () => clearTimeout(timer)
  }, [userSelected])

  const liveIdx = meetings.findIndex((m) => m.isNow)
  const activeIdx =
    !userSelected && liveIdx >= 0 ? liveIdx : Math.min(featuredIdx, meetings.length - 1)
  const featuredMeeting = meetings[activeIdx] ?? null
  const laterMeetings = meetings.filter((_, i) => i !== activeIdx)
  const featuredCountdown = featuredMeeting ? getMeetingCountdown(featuredMeeting) : null

  function canJoinMeeting(meeting: CalendarMeeting): boolean {
    if (!meeting.alias) return false
    if (meeting.isNow) return true
    const start = new Date(meeting.startTime)
    const diffMs = start.getTime() - Date.now()
    return diffMs <= 15 * 60_000
  }

  const homeContent = (
    <div className="relative min-h-screen w-full flex flex-col font-sans overflow-hidden antialiased">
      <GradientBackground theme={cosmeticTheme} />

      <div className="relative z-10 flex flex-col min-h-screen w-full">
        <TopBar
          displayName={displayName}
          userInitials={userInitials}
          regStatus={regStatus}
          isElectron={isElectron}
          isExpanded={isExpanded}
          isBusy={isBusy}
          pipSupported={pip.isSupported}
          onSettings={() => setShowSettings(true)}
          onToggleExpand={toggleExpand}
          onToggleMini={toggleMini}
          onOpenPip={() => pip.openPip()}
        />

        <div
          className={`flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] w-full max-w-[430px] mx-auto px-6 ${isElectron ? 'pt-20' : 'pt-12'}`}
        >
          <div style={{ height: !isElectron && pip.isActive ? '4vh' : '10vh' }} />

          <ClockDisplay />

          {featuredMeeting && (
            <FeaturedMeetingCard
              meeting={featuredMeeting}
              laterMeetings={laterMeetings}
              countdown={featuredCountdown}
              canJoin={canJoinMeeting(featuredMeeting)}
              isBusy={isBusy}
              cardBg={cosmeticTheme.cardBg}
              expanded={calendarExpanded}
              onExpandChange={(v) => {
                setCalendarExpanded(v)
                if (v) setRecentsExpanded(false)
              }}
              onJoin={handleCalendarJoin}
              onSelectMeeting={(meetingId) => {
                const idx = meetings.findIndex((m) => m.id === meetingId)
                if (idx >= 0) {
                  setFeaturedIdx(idx)
                  setUserSelected(true)
                }
              }}
            />
          )}

          {meetings.length === 0 && (
            <div className="mt-12 text-center">
              <p className="text-sm text-white/20">No upcoming meetings</p>
            </div>
          )}

          {error && <p className="text-rose-400 text-xs text-center mt-4">{error}</p>}

          <AdHocJoin
            isBusy={isBusy}
            cardBg={cosmeticTheme.cardBg}
            recentCalls={recentCalls}
            expanded={recentsExpanded}
            onExpandChange={(v) => {
              setRecentsExpanded(v)
              if (v) setCalendarExpanded(false)
            }}
            onProviderClick={(p) => {
              setJoinProvider({ id: p.id, icon: p.icon, label: p.label })
              setShowJoin(true)
            }}
            onCallClick={() => {
              setJoinProvider(null)
              setShowJoin(true)
            }}
            onRecentCallClick={(alias) => {
              const prov = getMeetingProvider(alias)
              if (prov) {
                setJoinProvider({ id: prov.id, icon: prov.icon, label: prov.label })
              } else {
                setJoinProvider(null)
              }
              handleJoin(alias)
            }}
          />
        </div>

        <div className="pb-6" />
      </div>

      <JoinModal
        open={showJoin}
        onClose={() => {
          setShowJoin(false)
          setJoinProvider(null)
          if (connectionState === 'pin_required' || connectionState === 'pin_optional') {
            disconnect()
            setPendingAlias(null)
          }
        }}
        onJoin={handleJoin}
        loading={isBusy}
        error={error}
        pinRequested={connectionState === 'pin_required'}
        initialAlias={pendingAlias || undefined}
        providerId={joinProvider?.id}
        providerIcon={joinProvider?.icon}
        providerLabel={joinProvider?.label}
      />
      <PreflightModal
        open={!!preflightAlias}
        alias={preflightAlias || ''}
        connecting={connectionState === 'connecting'}
        onClose={() => {
          if (connectionState === 'connecting') {
            disconnect()
            setPendingAlias(null)
          }
          setPreflightAlias(null)
          setPreflightPin(undefined)
        }}
        onJoin={handlePreflightJoin}
      />
      <SetupWizard open={setup.required} onComplete={setup.complete} />
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
        {connectionState === 'connecting' && !showJoin && !preflightAlias && pendingAlias && (
          <ConnectingOverlay
            alias={pendingAlias}
            onCancel={() => {
              disconnect()
              setPendingAlias(null)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {incomingCall && (
          <IncomingCallModal
            callerName={incomingCall.remoteDisplayName}
            conferenceAlias={incomingCall.conferenceAlias}
            ringtone={settings.ringtone}
            onAnswer={handleAnswerIncoming}
            onDecline={declineCall}
          />
        )}
      </AnimatePresence>
    </div>
  )

  // When PiP is active (web only), portal either meeting or home into the floating window
  if (!isElectron && pip.isActive && pip.pipWindow) {
    const pipContent = inPipCall ? (
      <PipMeetingView
        alias={pendingAlias!}
        remoteStream={remoteStream}
        localStream={localStream}
        isAudioMuted={isAudioMuted}
        isVideoMuted={isVideoMuted}
        onToggleAudio={() => muteAudio(!isAudioMuted)}
        onToggleVideo={() => muteVideo(!isVideoMuted)}
        onLeave={handleLeavePip}
      />
    ) : (
      homeContent
    )
    return (
      <>
        {createPortal(pipContent, pip.pipWindow.document.body)}
        <div className="min-h-screen w-full flex flex-col items-center justify-center font-sans gap-4">
          <div className="text-white/20 text-sm tracking-widest uppercase">
            {inPipCall ? 'In Call — Floating Window' : 'Floating Window Active'}
          </div>
          <button
            onClick={inPipCall ? handleLeavePip : pip.closePip}
            className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm"
          >
            {inPipCall ? 'Leave Call' : 'Return to Tab'}
          </button>
        </div>
      </>
    )
  }

  if (isElectron && isMini) {
    return (
      <div className="relative w-full h-screen flex flex-col font-sans antialiased overflow-hidden">
        <GradientBackground theme={cosmeticTheme} />

        <div className="relative z-10 flex flex-col flex-1 min-h-0">
        {/* Drag region */}
        <div className="h-10 shrink-0 flex items-end justify-center pb-0.5" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">
            My Meetings
          </span>
          <button
            onClick={toggleMini}
            className="absolute top-1.5 right-2 w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors z-10"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title="Exit mini mode"
          >
            <Maximize2 size={11} />
          </button>
        </div>

        {/* Connecting / PIN state */}
        {(preflightAlias && connectionState === 'connecting') || (isMini && (connectionState === 'pin_required' || connectionState === 'pin_optional')) ? (
          connectionState === 'pin_required' || connectionState === 'pin_optional' ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 -mt-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
              <Lock size={14} className="text-white/30" />
              <span className="text-[10px] text-white/40">PIN Required</span>
              <form onSubmit={(e) => { e.preventDefault(); if (miniPin.trim()) { connectWithPin(miniPin.trim()); setMiniPin('') } }} className="w-full px-2">
                <input
                  type="password"
                  value={miniPin}
                  onChange={(e) => setMiniPin(e.target.value)}
                  placeholder="Enter PIN"
                  autoFocus
                  className="w-full px-3 py-1.5 rounded-lg bg-white/6 border border-white/10 text-white text-[12px] text-center placeholder-white/20 focus:outline-none focus:border-white/30"
                />
              </form>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { disconnect(); setPendingAlias(null); setPreflightAlias(null); setMiniPin('') }}
                  className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { if (miniPin.trim()) { connectWithPin(miniPin.trim()); setMiniPin('') } }}
                  disabled={!miniPin.trim()}
                  className="px-3 py-1 rounded-md text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors disabled:opacity-30"
                >
                  Join
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 -mt-4">
              <div className="w-6 h-6 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
              <span className="text-[11px] text-white/50 truncate max-w-full">Connecting...</span>
              <button
                onClick={() => {
                  disconnect()
                  setPendingAlias(null)
                  setPreflightAlias(null)
                  setPreflightPin(undefined)
                }}
                className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
              >
                Cancel
              </button>
            </div>
          )
        ) : (
          <>
          <div className="flex-1 flex flex-col items-center justify-center px-2 -mt-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <div className="flex items-center w-full">
            {/* Prev arrow */}
            {miniIdx > 0 ? (
              <button
                onClick={() => setMiniIdx(miniIdx - 1)}
                className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white/35 hover:text-white/70 hover:bg-white/6 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
            ) : (
              <div className="w-8 shrink-0" />
            )}

            {/* Meeting info */}
            {(() => {
              const m = meetings[miniIdx]
              if (!m) return <div className="flex-1 text-center"><span className="text-[11px] text-white/25">No upcoming meetings</span></div>
              const countdown = getMeetingCountdown(m)
              return (
                <div className="flex-1 flex flex-col items-center justify-center gap-1 min-w-0 px-1">
                  <span className="text-[10px] text-white/30 truncate max-w-full">
                    {countdown || (m.isNow ? 'Live now' : '')}
                  </span>
                  <span className="text-[12px] font-medium text-white/80 truncate max-w-full text-center leading-tight">
                    {m.title}
                  </span>
                  {canJoinMeeting(m) && m.alias && (
                    <button
                      onClick={() => {
                        if (isMini) {
                          handleMiniJoin(m.alias!)
                        } else {
                          handleJoin(m.alias!)
                        }
                      }}
                      disabled={isBusy}
                      className="mt-0.5 px-3 py-1 rounded-md text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors disabled:opacity-40"
                    >
                      Join
                    </button>
                  )}
                </div>
              )
            })()}

            {/* Next arrow */}
            {miniIdx < meetings.length - 1 ? (
              <button
                onClick={() => setMiniIdx(miniIdx + 1)}
                className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white/35 hover:text-white/70 hover:bg-white/6 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            ) : (
              <div className="w-8 shrink-0" />
            )}
            </div>
          </div>
          </>
        )}
        </div>
      </div>
    )
  }

  return homeContent
}
