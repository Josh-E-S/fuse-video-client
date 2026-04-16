'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  ChevronDown,
  Volume2,
  User,
} from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { useMediaDevices, useSpeakerTest } from '@/hooks/useMediaDevices'
import { getMeetingProvider } from '@/utils/meetingProvider'

interface PreflightModalProps {
  open: boolean
  alias: string
  connecting?: boolean
  onClose: () => void
  onJoin: (opts: { audioOff: boolean; videoOff: boolean }) => void
}

export function PreflightModal({ open, alias, connecting, onClose, onJoin }: PreflightModalProps) {
  const { settings, saveSettings } = useSettings()
  const provider = getMeetingProvider(alias)

  const [audioOff, setAudioOff] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [showAudioMenu, setShowAudioMenu] = useState(false)
  const [showVideoMenu, setShowVideoMenu] = useState(false)
  const [showOutputMenu, setShowOutputMenu] = useState(false)

  const {
    audioInputs,
    audioOutputs,
    videoInputs,
    previewStream,
    cameraError,
    micLevel,
  } = useMediaDevices({
    active: open,
    audioInputId: settings.audioInput,
    videoInputId: settings.videoInput,
  })

  const speakerTest = useSpeakerTest(settings.audioOutput)

  const videoRef = useRef<HTMLVideoElement | null>(null)

  const displayName = settings.displayName || 'Guest'
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  useEffect(() => {
    if (!open) {
      setAudioOff(false)
      setVideoOff(false)
      setShowAudioMenu(false)
      setShowVideoMenu(false)
      setShowOutputMenu(false)
      speakerTest.stop()
    }
  }, [open])

  useEffect(() => {
    const el = videoRef.current
    if (el && previewStream) {
      el.srcObject = previewStream
      el.play().catch(() => {})
    } else if (el) {
      el.srcObject = null
    }
  }, [previewStream])

  function handleJoinClick() {
    onJoin({ audioOff, videoOff })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10, opacity: 0, filter: 'blur(4px)' }}
            animate={{ scale: 1, y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ scale: 0.95, y: 10, opacity: 0, filter: 'blur(4px)' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl bg-white/4 border border-white/10 backdrop-blur-3xl shadow-2xl overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white/80 bg-black/40 backdrop-blur-xl hover:bg-black/60 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            {/* Camera preview */}
            <div className="relative w-full aspect-[16/10] bg-black/60">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover -scale-x-100 transition-opacity duration-200 ${
                  !videoOff && previewStream && !cameraError ? 'opacity-100' : 'opacity-0'
                }`}
              />
              {(videoOff || cameraError || !previewStream) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-20 h-20 rounded-full bg-white/6 border border-white/8 flex items-center justify-center">
                    {videoOff ? (
                      <VideoOff size={28} className="text-white/30" />
                    ) : (
                      <span className="text-2xl font-semibold text-white/40">{initials}</span>
                    )}
                  </div>
                  <span className="text-sm text-white/30">
                    {videoOff ? 'Camera is off' : cameraError ? 'Camera unavailable' : ''}
                  </span>
                </div>
              )}

              {/* Mic/Video toggle overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <button
                  onClick={() => setAudioOff(!audioOff)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all backdrop-blur-xl border ${
                    audioOff
                      ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                      : 'bg-black/40 border-white/10 text-white/80 hover:bg-black/60'
                  }`}
                >
                  {audioOff ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button
                  onClick={() => setVideoOff(!videoOff)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all backdrop-blur-xl border ${
                    videoOff
                      ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                      : 'bg-black/40 border-white/10 text-white/80 hover:bg-black/60'
                  }`}
                >
                  {videoOff ? <VideoOff size={18} /> : <Video size={18} />}
                </button>
              </div>

              {/* Meeting info pill */}
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/8">
                {provider && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={provider.icon} alt="" width={14} height={14} />
                )}
                <span className="text-xs text-white/60 truncate max-w-[200px]">{alias}</span>
              </div>
            </div>

            {/* Controls section */}
            <div className="p-6 space-y-4">
              {/* Display name (read-only) */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/6 border border-white/8 flex items-center justify-center shrink-0">
                  <User size={14} className="text-white/40" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white/80">{displayName}</div>
                  <div className="text-[11px] text-white/30">Display name from settings</div>
                </div>
              </div>

              <div className="border-t border-white/6" />

              {/* Microphone */}
              <DeviceRow
                label="Microphone"
                devices={audioInputs}
                selectedId={settings.audioInput}
                onSelect={(id) => saveSettings({ audioInput: id })}
                showMenu={showAudioMenu}
                setShowMenu={setShowAudioMenu}
              >
                <div className="mt-2 h-1.5 rounded-full bg-white/6 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500/60"
                    style={{
                      width: audioOff ? '0%' : `${micLevel * 100}%`,
                      transition: 'width 0.15s ease-out',
                    }}
                  />
                </div>
              </DeviceRow>

              {/* Speaker */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <DeviceRow
                    label="Speaker"
                    devices={audioOutputs}
                    selectedId={settings.audioOutput}
                    onSelect={(id) => saveSettings({ audioOutput: id })}
                    showMenu={showOutputMenu}
                    setShowMenu={setShowOutputMenu}
                  />
                </div>
                <button
                  onClick={speakerTest.toggle}
                  className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    speakerTest.testing
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-white/4 border-white/6 text-white/40 hover:text-white/60 hover:bg-white/6'
                  }`}
                >
                  <Volume2 size={12} />
                  {speakerTest.testing ? 'Stop' : 'Test'}
                </button>
              </div>

              {/* Camera */}
              <DeviceRow
                label="Camera"
                devices={videoInputs}
                selectedId={settings.videoInput}
                onSelect={(id) => saveSettings({ videoInput: id })}
                showMenu={showVideoMenu}
                setShowMenu={setShowVideoMenu}
              />

              {/* Join button */}
              {(() => {
                const bothOn = !audioOff && !videoOff
                const audioOnly = !audioOff && videoOff
                const videoOnly = audioOff && !videoOff
                const label = bothOn
                  ? 'Join now'
                  : audioOnly
                    ? 'Join audio only'
                    : videoOnly
                      ? 'Join video only'
                      : 'Join fully muted'
                const color = bothOn
                  ? 'bg-emerald-500 hover:bg-emerald-400'
                  : audioOnly
                    ? 'bg-blue-500 hover:bg-blue-400'
                    : videoOnly
                      ? 'bg-amber-500 hover:bg-amber-400'
                      : 'bg-white/12 hover:bg-white/18'
                const textColor = bothOn || audioOnly || videoOnly ? 'text-white' : 'text-white/70'
                return (
                  <button
                    onClick={handleJoinClick}
                    className={`w-full mt-2 py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${color} ${textColor}`}
                  >
                    {label}
                  </button>
                )
              })()}
            </div>

            {/* Connecting overlay */}
            <AnimatePresence>
              {connecting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-md rounded-2xl"
                >
                  <div className="w-10 h-10 border-[3px] border-white/10 border-t-white/60 rounded-full animate-spin" />
                  <span className="text-sm font-medium text-white/70">
                    {!audioOff && !videoOff
                      ? 'Connecting...'
                      : !audioOff && videoOff
                        ? 'Connecting with audio only...'
                        : audioOff && !videoOff
                          ? 'Connecting with video only...'
                          : 'Connecting fully muted...'}
                  </span>
                  <button
                    onClick={onClose}
                    className="mt-2 px-5 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-white/70 bg-white/4 border border-white/6 hover:bg-white/8 transition-colors"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function DeviceRow({
  label,
  devices,
  selectedId,
  onSelect,
  showMenu,
  setShowMenu,
  children,
}: {
  label: string
  devices: MediaDeviceInfo[]
  selectedId: string
  onSelect: (id: string) => void
  showMenu: boolean
  setShowMenu: (v: boolean) => void
  children?: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!showMenu) return
    function handleClick(e: MouseEvent) {
      if (buttonRef.current?.contains(e.target as Node)) return
      if (ref.current && !ref.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu, setShowMenu])

  const selected = devices.find((d) => d.deviceId === selectedId)
  const displayLabel = selected?.label || 'System Default'

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setShowMenu(!showMenu)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/4 border border-white/6 hover:bg-white/6 transition-colors text-left"
      >
        <div className="min-w-0">
          <div className="text-[10px] font-medium text-white/30 uppercase tracking-wider">{label}</div>
          <div className="text-[13px] text-white/70 truncate">{displayLabel}</div>
        </div>
        <ChevronDown size={14} className={`text-white/30 shrink-0 ml-2 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
      </button>
      {children}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1 py-1.5 rounded-xl bg-black/90 border border-white/10 backdrop-blur-[40px] shadow-2xl z-50 max-h-[160px] overflow-y-auto"
          >
            <button
              onClick={() => { onSelect(''); setShowMenu(false) }}
              className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${
                !selectedId ? 'text-white bg-white/6' : 'text-white/60 hover:text-white hover:bg-white/4'
              }`}
            >
              System Default
            </button>
            {devices.map((d) => (
              <button
                key={d.deviceId}
                onClick={() => { onSelect(d.deviceId); setShowMenu(false) }}
                className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${
                  d.deviceId === selectedId ? 'text-white bg-white/6' : 'text-white/60 hover:text-white hover:bg-white/4'
                }`}
              >
                {d.label || `Device ${d.deviceId.slice(0, 8)}`}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
