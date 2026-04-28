'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { log } from '@/utils/logger'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  GalleryThumbnails,
  Share,
  FileText,
  MessageSquare,
  Users,
  ScrollText,
  ChevronDown,
  Check,
  MoreVertical,
  Grid3X3,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DockTab } from '@/components/meeting/DockPanel'
import { useElectron } from '@/hooks/useElectron'

// Device info for the picker
interface DeviceInfo {
  deviceId: string
  label: string
}

interface ControlBarProps {
  isMuted: boolean
  isVideoOff: boolean
  isPipActive?: boolean
  isPipSupported?: boolean
  isPresenting?: boolean
  transcriptionEnabled?: boolean
  captionsVisible?: boolean
  activeDockTab?: DockTab | null
  layout?: 'focus' | 'gallery' | 'side-by-side'
  selfViewVisible?: boolean
  onToggleSelfView?: () => void
  // Device selection
  audioInputId?: string
  videoInputId?: string
  onAudioInputChange?: (deviceId: string) => void
  onVideoInputChange?: (deviceId: string) => void
  // Actions
  onToggleMic: () => void
  onToggleVideo: () => void
  onTogglePip?: () => void
  onToggleLayout?: () => void
  onToggleShare?: () => void
  onToggleTranscription?: () => void
  onToggleCaptions?: () => void
  onDockTab?: (tab: DockTab) => void
  onDockClose?: () => void
  onSettings?: () => void
  onDTMF?: () => void
  onLeave: () => void
}

// Shared button styles
const btn = 'flex items-center justify-center transition-all duration-200 cursor-pointer'
const btnRound = `${btn} rounded-xl border`
const btnLg = `${btnRound} w-[48px] h-[48px]`

function stateClass(active: boolean, color: 'green' | 'blue' | 'red' | 'amber' | 'neutral') {
  if (!active)
    return 'bg-white/4 border-white/6 text-white/50 hover:bg-white/8 hover:text-white/80'
  switch (color) {
    case 'green':
      return 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
    case 'blue':
      return 'bg-blue-400/10 border-blue-400/30 text-blue-400'
    case 'red':
      return 'bg-rose-500/10 border-rose-500/20 text-rose-500'
    case 'amber':
      return 'bg-amber-400/10 border-amber-400/30 text-amber-400'
    case 'neutral':
      return 'bg-white/10 border-white/12 text-white'
  }
}

// Device picker popup shown above the split button
function DevicePicker({
  devices,
  selectedId,
  onSelect,
  onClose,
  kind,
  ignoreRef,
}: {
  devices: DeviceInfo[]
  selectedId: string
  onSelect: (id: string) => void
  onClose: () => void
  kind: 'audio' | 'video'
  ignoreRef?: React.RefObject<HTMLElement | null>
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ignoreRef?.current?.contains(e.target as Node)) return
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose, ignoreRef])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="absolute bottom-full mb-3 left-0 min-w-[240px] max-w-[320px] py-2 rounded-xl bg-black/90 border border-white/10 backdrop-blur-[40px] shadow-2xl z-50"
    >
      <div className="px-3 pb-1.5 pt-0.5">
        <span className="text-[10px] font-medium text-white/35 uppercase tracking-wider">
          {kind === 'audio' ? 'Microphone' : 'Camera'}
        </span>
      </div>
      {devices.length === 0 ? (
        <div className="px-3 py-2 text-[12px] text-white/30">No devices found</div>
      ) : (
        devices.map((d) => {
          const active =
            d.deviceId === selectedId || (selectedId === '' && d.deviceId === 'default')
          return (
            <button
              key={d.deviceId}
              onClick={() => {
                onSelect(d.deviceId)
                onClose()
              }}
              className={`w-full text-left px-3 py-2 text-[13px] flex items-center gap-2.5 transition-colors ${
                active
                  ? 'text-white bg-white/6'
                  : 'text-white/60 hover:text-white hover:bg-white/4'
              }`}
            >
              <span className="w-4 shrink-0">
                {active && <Check size={14} className="text-emerald-400" />}
              </span>
              <span className="truncate">{d.label}</span>
            </button>
          )
        })
      )}
    </motion.div>
  )
}

// Split button: main action + caret for device picker
function SplitButton({
  onClick,
  icon,
  title,
  colorClass,
  caretSide,
  devices,
  selectedDeviceId,
  onDeviceSelect,
  deviceKind,
  compact,
}: {
  onClick: () => void
  icon: React.ReactNode
  title: string
  colorClass: string
  caretSide: 'right'
  devices: DeviceInfo[]
  selectedDeviceId: string
  onDeviceSelect: (id: string) => void
  deviceKind: 'audio' | 'video'
  compact?: boolean
}) {
  const [showPicker, setShowPicker] = useState(false)
  const caretRef = useRef<HTMLButtonElement>(null)
  const size = compact ? 'h-[44px]' : 'h-[48px]'

  return (
    <div className="relative flex items-center">
      {/* Main button */}
      <button
        onClick={onClick}
        className={`${btn} ${compact ? 'w-[38px]' : 'w-[42px]'} ${size} rounded-l-xl rounded-r-none border-r-0 border ${colorClass}`}
        title={title}
      >
        {icon}
      </button>
      {/* Caret divider + button */}
      <button
        ref={caretRef}
        onClick={() => setShowPicker((v) => !v)}
        className={`${btn} w-[18px] ${size} rounded-r-xl rounded-l-none border ${colorClass} relative`}
        title={`Select ${deviceKind}`}
      >
        <ChevronDown size={10} className="opacity-60" />
      </button>

      <AnimatePresence>
        {showPicker && (
          <DevicePicker
            devices={devices}
            selectedId={selectedDeviceId}
            onSelect={onDeviceSelect}
            onClose={() => setShowPicker(false)}
            kind={deviceKind}
            ignoreRef={caretRef}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// 3-dot options menu
function OptionsMenu({
  onDTMF,
}: {
  onDTMF?: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="absolute bottom-full mb-3 right-0 min-w-[180px] py-1.5 rounded-xl bg-black/90 border border-white/10 backdrop-blur-[40px] shadow-2xl z-50"
    >
      {onDTMF && (
        <button
          onClick={onDTMF}
          className="w-full text-left px-4 py-2.5 text-[13px] text-white/70 hover:text-white hover:bg-white/6 transition-colors flex items-center gap-3"
        >
          <Grid3X3 size={15} className="opacity-60" />
          Dialpad (DTMF)
        </button>
      )}
    </motion.div>
  )
}

// Wrapper for the 3-dot button + menu with outside-click handling
function OptionsButton({
  showOptions,
  setShowOptions,
  onDTMF,
  className,
  iconSize,
}: {
  showOptions: boolean
  setShowOptions: (v: boolean) => void
  onDTMF?: () => void
  className: string
  iconSize: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showOptions) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowOptions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showOptions, setShowOptions])

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setShowOptions(!showOptions)}
        className={className}
        title="More options"
      >
        <MoreVertical size={iconSize} />
      </button>
      <AnimatePresence>
        {showOptions && (
          <OptionsMenu
            onDTMF={() => {
              onDTMF?.()
              setShowOptions(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export function ControlBar({
  isMuted,
  isVideoOff,
  isPipActive,
  isPipSupported,
  isPresenting,
  transcriptionEnabled,
  captionsVisible,
  activeDockTab,
  layout,
  selfViewVisible,
  onToggleSelfView,
  audioInputId = '',
  videoInputId = '',
  onAudioInputChange,
  onVideoInputChange,
  onToggleMic,
  onToggleVideo,
  onTogglePip,
  onToggleLayout,
  onToggleShare,
  onToggleTranscription,
  onToggleCaptions,
  onDockTab,
  onDockClose,
  onSettings,
  onDTMF,
  onLeave,
}: ControlBarProps) {
  const { isElectron } = useElectron()
  const [audioDevices, setAudioDevices] = useState<DeviceInfo[]>([])
  const [videoDevices, setVideoDevices] = useState<DeviceInfo[]>([])
  const [showOptions, setShowOptions] = useState(false)

  // Enumerate devices (lazy -- only when user might need them)
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      setAudioDevices(
        devices
          .filter((d) => d.kind === 'audioinput')
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
          })),
      )
      setVideoDevices(
        devices
          .filter((d) => d.kind === 'videoinput')
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
          })),
      )
    } catch (err) {
      log.media.warn('Device enumeration failed, permissions may not be granted')
    }
  }, [])

  // Enumerate on mount and on device changes
  useEffect(() => {
    enumerateDevices()
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices)
    return () => navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices)
  }, [enumerateDevices])

  // Open the dock on the given tab, or close it if already on that tab.
  // Dock mode (side vs bottom) is preserved — the dock panel has its own mode toggle.
  function handleOpenDockTab(tab: DockTab) {
    if (activeDockTab === tab) {
      onDockClose?.()
    } else {
      onDockTab?.(tab)
    }
  }

  const micColor = isMuted ? stateClass(true, 'red') : stateClass(true, 'green')
  const camColor = isVideoOff ? stateClass(true, 'red') : stateClass(true, 'blue')

  // Electron compact layout (430px)
  if (isElectron) {
    return (
      <div className="relative z-[100] flex flex-col items-center w-full">
        <div className="flex items-center gap-[6px] px-3 py-2.5 rounded-[22px] bg-black/60 border border-white/8 backdrop-blur-[120px] shadow-2xl">
          {/* Mic split button */}
          <SplitButton
            onClick={onToggleMic}
            icon={isMuted ? <MicOff size={17} /> : <Mic size={17} />}
            title={isMuted ? 'Unmute' : 'Mute'}
            colorClass={micColor}
            caretSide="right"
            devices={audioDevices}
            selectedDeviceId={audioInputId}
            onDeviceSelect={(id) => onAudioInputChange?.(id)}
            deviceKind="audio"
            compact
          />

          {/* Camera split button */}
          <SplitButton
            onClick={onToggleVideo}
            icon={isVideoOff ? <VideoOff size={17} /> : <Video size={17} />}
            title={isVideoOff ? 'Start video' : 'Stop video'}
            colorClass={camColor}
            caretSide="right"
            devices={videoDevices}
            selectedDeviceId={videoInputId}
            onDeviceSelect={(id) => onVideoInputChange?.(id)}
            deviceKind="video"
            compact
          />

          {/* Share */}
          {onToggleShare && (
            <button
              onClick={onToggleShare}
              className={`${btn} w-[44px] h-[44px] rounded-xl border ${stateClass(!!isPresenting, 'amber')}`}
              title={isPresenting ? 'Stop sharing' : 'Share'}
            >
              <Share size={17} />
            </button>
          )}

          {/* Self-view toggle */}
          {onToggleSelfView && (
            <button
              onClick={onToggleSelfView}
              className={`${btn} w-[44px] h-[44px] rounded-xl border ${stateClass(!!selfViewVisible, 'blue')}`}
              title={selfViewVisible ? 'Hide self-view' : 'Show self-view'}
            >
              {selfViewVisible ? <Eye size={17} /> : <EyeOff size={17} />}
            </button>
          )}

          {/* Layout */}
          {onToggleLayout && (
            <button
              onClick={onToggleLayout}
              className={`${btn} w-[44px] h-[44px] rounded-xl border ${stateClass(false, 'neutral')}`}
              title={
                layout === 'focus'
                  ? 'Gallery view'
                  : layout === 'gallery'
                    ? 'Side-by-side view'
                    : 'Focus view'
              }
            >
              <GalleryThumbnails size={17} />
            </button>
          )}

          {/* Transcription */}
          {onToggleTranscription && (
            <button
              onClick={onToggleTranscription}
              className={`${btn} w-[44px] h-[44px] rounded-xl border ${stateClass(!!transcriptionEnabled, 'green')}`}
              title={transcriptionEnabled ? 'Stop transcription' : 'Transcription'}
            >
              <FileText size={17} />
            </button>
          )}

          {/* CC */}
          {onToggleCaptions && (
            <button
              onClick={onToggleCaptions}
              className={`${btn} w-[44px] h-[44px] rounded-xl border ${stateClass(!!captionsVisible && !!transcriptionEnabled, 'blue')}`}
              title={captionsVisible ? 'Hide captions' : 'Show captions'}
            >
              <span className="text-[13px] font-bold tracking-tight">CC</span>
            </button>
          )}

          {/* Chat */}
          {onDockTab && (
            <button
              onClick={() => handleOpenDockTab('chat')}
              className={`${btn} w-[44px] h-[44px] rounded-xl border ${stateClass(activeDockTab === 'chat', 'blue')}`}
              title={activeDockTab === 'chat' ? 'Close chat' : 'Chat'}
            >
              <MessageSquare size={17} />
            </button>
          )}

          {/* People */}
          {onDockTab && (
            <button
              onClick={() => handleOpenDockTab('people')}
              className={`${btn} w-[44px] h-[44px] rounded-xl border ${stateClass(activeDockTab === 'people', 'blue')}`}
              title={activeDockTab === 'people' ? 'Close participants' : 'Participants'}
            >
              <Users size={17} />
            </button>
          )}

          {/* Transcript panel */}
          {onDockTab && (
            <button
              onClick={() => handleOpenDockTab('transcript')}
              className={`${btn} w-[44px] h-[44px] rounded-xl border ${stateClass(activeDockTab === 'transcript', 'blue')}`}
              title={activeDockTab === 'transcript' ? 'Close transcript' : 'Transcript'}
            >
              <ScrollText size={17} />
            </button>
          )}

          {/* Options (3-dot) */}
          <OptionsButton
            showOptions={showOptions}
            setShowOptions={setShowOptions}
            onDTMF={onDTMF}
            className={`${btn} w-[44px] h-[44px] rounded-xl border ${stateClass(showOptions, 'blue')}`}
            iconSize={17}
          />

          {/* Leave */}
          <button
            onClick={onLeave}
            className={`${btn} w-[52px] h-[44px] rounded-xl bg-rose-600 text-white hover:bg-rose-500`}
            title="Leave"
          >
            <PhoneOff size={17} />
          </button>
        </div>
      </div>
    )
  }

  // Browser full-width layout
  return (
    <div className="relative z-[100] flex flex-col items-center w-full">
      <div className="flex items-center gap-2 px-5 py-3 rounded-[22px] bg-black/60 border border-white/8 backdrop-blur-[120px] shadow-2xl">
        {/* Mic split button */}
        <SplitButton
          onClick={onToggleMic}
          icon={isMuted ? <MicOff size={19} /> : <Mic size={19} />}
          title={isMuted ? 'Unmute' : 'Mute'}
          colorClass={micColor}
          caretSide="right"
          devices={audioDevices}
          selectedDeviceId={audioInputId}
          onDeviceSelect={(id) => onAudioInputChange?.(id)}
          deviceKind="audio"
        />

        {/* Camera split button */}
        <SplitButton
          onClick={onToggleVideo}
          icon={isVideoOff ? <VideoOff size={19} /> : <Video size={19} />}
          title={isVideoOff ? 'Start video' : 'Stop video'}
          colorClass={camColor}
          caretSide="right"
          devices={videoDevices}
          selectedDeviceId={videoInputId}
          onDeviceSelect={(id) => onVideoInputChange?.(id)}
          deviceKind="video"
        />

        {/* Share */}
        {onToggleShare && (
          <button
            onClick={onToggleShare}
            className={`${btnLg} ${stateClass(!!isPresenting, 'amber')}`}
            title={isPresenting ? 'Stop sharing' : 'Share'}
          >
            <Share size={20} />
          </button>
        )}

        {/* Transcription */}
        {onToggleTranscription && (
          <button
            onClick={onToggleTranscription}
            className={`${btnLg} ${stateClass(!!transcriptionEnabled, 'green')}`}
            title={transcriptionEnabled ? 'Stop transcription' : 'Transcription'}
          >
            <FileText size={20} />
          </button>
        )}

        {/* CC -- toggle caption visibility */}
        {onToggleCaptions && (
          <button
            onClick={onToggleCaptions}
            className={`${btnLg} ${stateClass(!!captionsVisible && !!transcriptionEnabled, 'blue')}`}
            title={captionsVisible ? 'Hide captions' : 'Show captions'}
          >
            <span className="text-[14px] font-bold tracking-tight">CC</span>
          </button>
        )}

        {/* Chat */}
        {onDockTab && (
          <button
            onClick={() => handleOpenDockTab('chat')}
            className={`${btnLg} ${stateClass(activeDockTab === 'chat', 'blue')}`}
            title={activeDockTab === 'chat' ? 'Close chat' : 'Chat'}
          >
            <MessageSquare size={20} />
          </button>
        )}

        {/* People */}
        {onDockTab && (
          <button
            onClick={() => handleOpenDockTab('people')}
            className={`${btnLg} ${stateClass(activeDockTab === 'people', 'blue')}`}
            title={activeDockTab === 'people' ? 'Close participants' : 'Participants'}
          >
            <Users size={20} />
          </button>
        )}

        {/* Transcript panel */}
        {onDockTab && (
          <button
            onClick={() => handleOpenDockTab('transcript')}
            className={`${btnLg} ${stateClass(activeDockTab === 'transcript', 'blue')}`}
            title={activeDockTab === 'transcript' ? 'Close transcript' : 'Transcript'}
          >
            <ScrollText size={20} />
          </button>
        )}

        {/* Self-view toggle */}
        {onToggleSelfView && (
          <button
            onClick={onToggleSelfView}
            className={`${btnLg} ${stateClass(!!selfViewVisible, 'blue')}`}
            title={selfViewVisible ? 'Hide self-view' : 'Show self-view'}
          >
            {selfViewVisible ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
        )}

        {/* Layout */}
        {onToggleLayout && (
          <button
            onClick={onToggleLayout}
            className={`${btnLg} ${stateClass(false, 'neutral')}`}
            title={
              layout === 'focus'
                ? 'Gallery view'
                : layout === 'gallery'
                  ? 'Side-by-side view'
                  : 'Focus view'
            }
          >
            <GalleryThumbnails size={20} />
          </button>
        )}

        {/* Options (3-dot) */}
        <OptionsButton
          showOptions={showOptions}
          setShowOptions={setShowOptions}
          onDTMF={onDTMF}
          className={`${btnLg} ${stateClass(showOptions, 'blue')}`}
          iconSize={20}
        />

        {/* PiP (browser only) */}
        {onTogglePip && (
          <button
            onClick={onTogglePip}
            disabled={!isPipSupported}
            className={`${btnLg} ${stateClass(!!isPipActive, 'blue')} disabled:opacity-30 disabled:cursor-not-allowed`}
            title={isPipActive ? 'Close floating window' : 'Float window'}
          >
            {isPipActive ? <PinOff size={20} /> : <Pin size={20} />}
          </button>
        )}

        {/* Leave */}
        <button
          onClick={onLeave}
          className={`${btn} px-6 h-[48px] rounded-xl bg-rose-600 text-white hover:bg-rose-500`}
          title="Leave"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  )
}
