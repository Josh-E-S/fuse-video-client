'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AnimatePresence, useMotionValue } from 'framer-motion'
import { toast } from 'sonner'
import { ControlBar } from '@/components/meeting/ControlBar'
import { DockPanel, type DockTab } from '@/components/meeting/DockPanel'
import { BackgroundEngine } from '@/components/meeting/BackgroundEngine'
import { SubtitleBar } from '@/components/meeting/SubtitleBar'
import { MeetingHeader } from '@/components/meeting/MeetingHeader'
import { VideoLayout } from '@/components/meeting/VideoLayout'
import { MiniModeView } from '@/components/meeting/MiniModeView'
import { PipModeView } from '@/components/meeting/PipModeView'
import { SettingsModal } from '@/components/modals/SettingsModal'
import { CallStatsModal } from '@/components/modals/CallStatsModal'
import { DTMFModal } from '@/components/modals/DTMFModal'
import { usePexip } from '@/contexts/PexipContext'
import { usePip } from '@/contexts/PipContext'
import { useTheme } from '@/hooks/useTheme'
import { useSettings } from '@/hooks/useSettings'
import { useRegistration } from '@/contexts/RegistrationContext'
import { useElectron, getElectronBridge } from '@/hooks/useElectron'
import { useVideoRefs } from '@/hooks/useVideoRefs'
import { usePresentationPopout } from '@/hooks/usePresentationPopout'
import { useMeetingTranscription } from '@/hooks/useMeetingTranscription'

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
    disconnectReason,
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
    switchMediaDevices,
  } = usePexip()

  const pip = usePip()
  const [layout, setLayout] = useState<'focus' | 'gallery' | 'side-by-side'>('focus')
  const [selfViewVisible, setSelfViewVisible] = useState(true)
  const [pipLayout, setPipLayout] = useState<'portrait' | 'halves'>('portrait')
  const [dockTab, setDockTab] = useState<DockTab | null>(null)
  const [dockMode, setDockMode] = useState<'bottom' | 'side'>('bottom')
  const [message, setMessage] = useState('')
  const [showDTMF, setShowDTMF] = useState(false)

  const sideDockOpen = dockMode === 'side' && dockTab !== null

  // Derive effective layout from window mode constraints
  const effectiveLayout: 'focus' | 'gallery' | 'side-by-side' =
    isMini ? 'focus'
    : (!isExpanded && layout === 'side-by-side') ? 'focus'
    : layout

  // Aspect ratio negotiation
  const targetAspectRatio: '16:9' | '9:16' =
    isMini ? '16:9'
    : isExpanded ? '16:9'
    : effectiveLayout === 'gallery' ? '16:9'
    : sideDockOpen ? '16:9'
    : '9:16'

  const pipX = useMotionValue(0)
  const pipY = useMotionValue(0)

  const pipResetKey = `${effectiveLayout}-${isMini}-${isExpanded}-${dockTab}-${dockMode}-${targetAspectRatio}`
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

  // Switch media devices when settings change during a call
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

  const mainVideoRef = useRef<HTMLElement | null>(null)

  // Extracted hooks
  const videoRefs = useVideoRefs({
    remoteStream,
    localStream,
    presentationStream,
    isVideoMuted,
  })

  const popout = usePresentationPopout({ presentationStream })

  const transcription = useMeetingTranscription({
    sipUri: currentMeetingId,
    connectionState,
    localStream,
    remoteStream,
    setMessageText,
  })

  // Snap Electron window to the canonical size whenever side-dock state changes.
  // Main process owns the matrix; we just tell it the new side-dock state.
  useEffect(() => {
    const bridge = getElectronBridge()
    if (!bridge) return
    const shouldBeOpen = dockMode === 'side' && dockTab !== null
    bridge.resizeToState({ sideDockOpen: shouldBeOpen })
  }, [dockMode, dockTab])

  // On unmount, ensure the window returns to a no-side-dock size.
  useEffect(() => {
    return () => {
      const bridge = getElectronBridge()
      bridge?.resizeToState({ sideDockOpen: false })
    }
  }, [])

  // Navigate home when disconnected — notify user if unexpected
  useEffect(() => {
    if (connectionState === 'disconnected' || connectionState === 'error') {
      if (disconnectReason === 'remote') {
        toast.error('Call disconnected', { description: 'The connection was lost unexpectedly.' })
      } else if (disconnectReason === 'error') {
        toast.error('Call failed', { description: 'An error occurred during the call.' })
      }
      router.push('/')
    }
  }, [connectionState, disconnectReason, router])

  // Apply theme to PiP window
  useEffect(() => {
    if (pip.isActive && pip.pipWindow) {
      applyThemeToDocument(theme, pip.pipWindow.document)
    }
  }, [pip.isActive, pip.pipWindow, theme, applyThemeToDocument])

  function handleLeave() {
    popout.closePresentationPopout()
    disconnect()
    router.push('/')
  }

  const handleTogglePresentationPopout = popout.presentationPopped
    ? popout.closePresentationPopout
    : popout.openPresentationPopout

  // Dock panel shared props
  const dockPanelProps = {
    chatMessages,
    participants,
    message,
    onMessageChange: setMessage,
    onSend: () => {
      if (message.trim()) {
        sendChatMessage(message.trim())
        setMessage('')
      }
    },
    transcripts: transcription.transcripts,
    interimText: transcription.interimText,
    interimSpeaker: transcription.interimSpeaker,
    isTranscriptionConnected: transcription.isTranscriptionConnected,
  }

  // PiP mode
  if (pip.isActive && pip.pipWindow) {
    return (
      <PipModeView
        pip={pip}
        alias={alias}
        remoteStream={remoteStream}
        localStream={localStream}
        isAudioMuted={isAudioMuted}
        isVideoMuted={isVideoMuted}
        selfViewVisible={selfViewVisible}
        pipLayout={pipLayout}
        setPipLayout={setPipLayout}
        setRemoteVideoRef={videoRefs.setRemoteVideoRef}
        setLocalVideoRef={videoRefs.setLocalVideoRef}
        onMuteAudio={muteAudio}
        onMuteVideo={muteVideo}
        onLeave={handleLeave}
      />
    )
  }

  // Mini mode
  if (isElectron && isMini) {
    return (
      <MiniModeView
        theme={theme}
        alias={alias}
        remoteStream={remoteStream}
        localStream={localStream}
        presentationStream={presentationStream}
        isAudioMuted={isAudioMuted}
        isVideoMuted={isVideoMuted}
        isPresenting={isPresenting}
        selfViewVisible={selfViewVisible}
        transcriptionEnabled={transcription.transcriptionEnabled}
        setTranscriptionEnabled={transcription.setTranscriptionEnabled}
        presentationPopped={popout.presentationPopped}
        transcripts={transcription.transcripts}
        interimText={transcription.interimText}
        onToggleMini={toggleMini}
        onMuteAudio={muteAudio}
        onMuteVideo={muteVideo}
        onToggleShare={() => (isPresenting ? stopScreenShare() : startScreenShare())}
        onTogglePresentationPopout={handleTogglePresentationPopout}
        onLeave={handleLeave}
      />
    )
  }

  // Standard meeting view
  return (
    <div className="relative min-h-screen w-full flex flex-col antialiased overflow-hidden">
      {isElectron && (
        <div
          className="absolute top-0 left-0 h-12 z-100 [-webkit-app-region:drag]"
          style={{ right: dockMode === 'side' && dockTab ? 336 : 0 }}
        />
      )}
      <BackgroundEngine
        active={!isAudioMuted && !isVideoMuted}
        isLate={false}
        isCancelling={false}
        isAudioOnly={!isAudioMuted && isVideoMuted}
        waveRgb={theme.waveRgb}
        accentColor={theme.accentColor}
      />

      <div className="relative z-10 flex h-screen">
      <div className={`flex flex-col flex-1 min-w-0 px-3 pb-2 ${isElectron ? 'pt-12' : 'pt-2'}`}>
        <MeetingHeader
          alias={alias}
          displayName={settings.displayName}
          participants={participants}
          isElectron={isElectron}
          isExpanded={isExpanded}
          presentationStream={presentationStream}
          presentationPopped={popout.presentationPopped}
          showStats={showStats}
          onTogglePresentationPopout={handleTogglePresentationPopout}
          onToggleStats={() => setShowStats(!showStats)}
          onOpenSettings={() => setShowSettings(true)}
          onToggleMini={toggleMini}
          onToggleExpand={toggleExpand}
        />

        <div className={`flex flex-row flex-1 min-h-0 ${dockTab && dockMode === 'bottom' ? 'flex-[2]' : ''}`}>
        <div className="flex flex-col flex-1 min-w-0">

        <VideoLayout
          layout={effectiveLayout}
          remoteStream={remoteStream}
          localStream={localStream}
          presentationStream={presentationStream}
          presentationPopped={popout.presentationPopped}
          isVideoMuted={isVideoMuted}
          isAudioMuted={isAudioMuted}
          isExpanded={isExpanded}
          selfViewVisible={selfViewVisible}
          targetAspectRatio={targetAspectRatio}
          pipX={pipX}
          pipY={pipY}
          mainVideoRef={mainVideoRef}
          setRemoteVideoRef={videoRefs.setRemoteVideoRef}
          setLocalVideoRef={videoRefs.setLocalVideoRef}
          setPresentationVideoRef={videoRefs.setPresentationVideoRef}
        />

        <SubtitleBar
          interimText={transcription.interimText}
          latestTranscript={transcription.latestTranscript}
          isTranscriptionConnected={transcription.isTranscriptionConnected}
          captionsVisible={transcription.transcriptionEnabled && transcription.captionsVisible}
        />

        </div>

        {/* Side dock */}
        {dockMode === 'side' && (
          <AnimatePresence>
            {dockTab ? (
              <DockPanel
                activeTab={dockTab}
                mode={dockMode}
                onTabChange={setDockTab}
                onClose={() => setDockTab(null)}
                {...dockPanelProps}
              />
            ) : (
              <div key="side-prerender" className="hidden">
                <DockPanel
                  activeTab="transcript"
                  mode="side"
                  onTabChange={() => {}}
                  onClose={() => {}}
                  {...dockPanelProps}
                />
              </div>
            )}
          </AnimatePresence>
        )}

        </div>

        {/* Bottom dock */}
        {dockMode === 'bottom' && (
          <AnimatePresence>
            {dockTab ? (
              <DockPanel
                activeTab={dockTab}
                mode={dockMode}
                onTabChange={setDockTab}
                onClose={() => setDockTab(null)}
                {...dockPanelProps}
              />
            ) : (
              <div key="bottom-prerender" className="hidden">
                <DockPanel
                  activeTab="transcript"
                  mode="bottom"
                  onTabChange={() => {}}
                  onClose={() => {}}
                  {...dockPanelProps}
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
            transcriptionEnabled={transcription.transcriptionEnabled}
            captionsVisible={transcription.captionsVisible}
            activeDockTab={dockTab}
            dockMode={dockMode}
            layout={effectiveLayout}
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
            onToggleTranscription={() => transcription.setTranscriptionEnabled(!transcription.transcriptionEnabled)}
            onToggleCaptions={() => {
              if (!transcription.transcriptionEnabled) {
                transcription.setTranscriptionEnabled(true)
                transcription.setCaptionsVisible(true)
              } else {
                transcription.setCaptionsVisible(!transcription.captionsVisible)
              }
            }}
            onDockTab={(tab: DockTab) => setDockTab((prev) => (prev === tab ? null : tab))}
            onDockClose={() => setDockTab(null)}
            onDockModeChange={setDockMode}
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
