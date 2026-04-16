'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Server,
  User,
  Palette,
  Mail,
  KeyRound,
  Play,
  Square,
  Music,
  Globe,
  CalendarDays,
  SlidersHorizontal,
  Mic,
  Camera,
  Speaker,
  Volume2,
  Key,
  Cloud,
  Video,
} from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { useMediaDevices, useSpeakerTest } from '@/hooks/useMediaDevices'
import type { RegistrationStatus, RegistrationCredentials } from '@/contexts/RegistrationContext'
import { THEMES, CATEGORY_ORDER } from '@/themes/themes'
import type { CosmeticTheme } from '@/themes/types'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  themeId: string
  onThemeChange: (id: string) => void
  registrationStatus: RegistrationStatus
  registrationError: string | null
  onRegister: (creds: RegistrationCredentials, nodeDomain?: string) => Promise<void>
  onUnregister: () => Promise<void>
}

export function SettingsModal({
  open,
  onClose,
  themeId,
  onThemeChange,
  registrationStatus,
  registrationError,
  onRegister,
  onUnregister,
}: SettingsModalProps) {
  const { settings, saveSettings } = useSettings()
  const [nodeDomain, setNodeDomain] = useState(settings.nodeDomain)
  const [displayName, setDisplayName] = useState(settings.displayName)
  const [tab, setTab] = useState<'connection' | 'meetings' | 'devices' | 'appearance'>('connection')
  const [pollInterval, setPollInterval] = useState(60)
  const [otjClientId, setOtjClientId] = useState(settings.otjClientId)
  const [otjClientSecret, setOtjClientSecret] = useState(settings.otjClientSecret)
  const [pexipCustomerId, setPexipCustomerId] = useState(settings.pexipCustomerId)
  const [googleDomain, setGoogleDomain] = useState(settings.googleDomain)
  const [regAlias, setRegAlias] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')

  // Sync local state when modal opens
  useEffect(() => {
    if (open) {
      setNodeDomain(settings.nodeDomain)
      setDisplayName(settings.displayName)
      setOtjClientId(settings.otjClientId)
      setOtjClientSecret(settings.otjClientSecret)
      setPexipCustomerId(settings.pexipCustomerId)
      setGoogleDomain(settings.googleDomain)
      setPollInterval(Number(localStorage.getItem('fuse_poll_interval')) || 60)
      setRegAlias(
        localStorage.getItem('fuse_reg_alias') ?? process.env.NEXT_PUBLIC_DEFAULT_ALIAS ?? '',
      )
      setRegUsername(
        localStorage.getItem('fuse_reg_username') ??
          process.env.NEXT_PUBLIC_DEFAULT_REG_USERNAME ??
          '',
      )
      setRegPassword(
        localStorage.getItem('fuse_reg_password') ??
          process.env.NEXT_PUBLIC_DEFAULT_REG_PASSWORD ??
          '',
      )
    }
  }, [open, settings.nodeDomain, settings.displayName])

  const {
    audioInputs,
    audioOutputs,
    videoInputs,
    previewStream,
    cameraError,
    micLevel,
  } = useMediaDevices({
    active: open && tab === 'devices',
    audioInputId: settings.audioInput,
    videoInputId: settings.videoInput,
  })

  const speakerTest = useSpeakerTest(settings.audioOutput)

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const el = videoPreviewRef.current
    if (el && previewStream) {
      el.srcObject = previewStream
      el.play().catch(() => {})
    } else if (el) {
      el.srcObject = null
    }
  }, [previewStream])

  const [playingRingtone, setPlayingRingtone] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const ringtones = [
    { id: 'ringtone2.mp3', name: 'Modern Chime' },
    { id: 'ringtone1.mp3', name: 'Classic Ring' },
    { id: 'ringtone3.mp3', name: 'Digital Beep' },
    { id: 'ringtone4.mp3', name: 'Soft Bell' },
    { id: 'ringtone5.mp3', name: 'Vibrant Tone' },
    { id: 'ringtone6.mp3', name: 'Minimal Alert' },
    { id: 'ringtone7.mp3', name: 'Elegant Ring' },
    { id: 'ringtone8.mp3', name: 'Professional Call' },
  ]

  const playRingtone = (ringtone: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    if (playingRingtone === ringtone) {
      setPlayingRingtone(null)
      return
    }

    const audio = new Audio(`/${ringtone}`)
    audio.volume = 0.5
    audioRef.current = audio
    setPlayingRingtone(ringtone)

    audio.play().catch(() => {})
    audio.addEventListener('ended', () => {
      setPlayingRingtone(null)
      audioRef.current = null
    })
  }

  const stopRingtone = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setPlayingRingtone(null)
    }
  }

  useEffect(() => {
    if (!open) {
      stopRingtone()
      speakerTest.stop()
    }
  }, [open])

  const [regBusy, setRegBusy] = useState(false)

  function handleBlurSave() {
    saveSettings({ nodeDomain, displayName })
  }

  function handleMeetingBlurSave() {
    saveSettings({ otjClientId, otjClientSecret, pexipCustomerId, googleDomain })
  }

  async function handleRegister() {
    if (!regAlias || !regUsername || !nodeDomain) return
    saveSettings({ nodeDomain, displayName })
    setRegBusy(true)
    await onRegister({ alias: regAlias, username: regUsername, password: regPassword }, nodeDomain)
    setRegBusy(false)
  }

  async function handleUnregister() {
    setRegBusy(true)
    await onUnregister()
    setRegBusy(false)
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
            className="relative w-full max-w-md h-[640px] flex flex-col rounded-2xl bg-white/4 border border-white/10 backdrop-blur-3xl shadow-2xl p-8"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>

            <h2 className="text-2xl font-light text-white/90 mb-1">Settings</h2>
            <p className="text-sm text-white/30 mb-8">
              {tab === 'connection'
                ? 'Configure your Pexip connection'
                : tab === 'meetings'
                  ? 'Calendar and provider settings'
                  : tab === 'devices'
                    ? 'Camera, mic, speakers, and ringtone'
                    : 'Choose your theme'}
            </p>

            <div className="flex gap-1 p-1 rounded-2xl bg-white/4 border border-white/6 mb-6">
              {[
                { id: 'connection' as const, icon: Globe, label: 'Connection' },
                { id: 'meetings' as const, icon: CalendarDays, label: 'Meetings' },
                { id: 'devices' as const, icon: SlidersHorizontal, label: 'Devices' },
                { id: 'appearance' as const, icon: Palette, label: 'Appearance' },
              ].map((t) => {
                const active = tab === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all ${
                      active ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'
                    }`}
                  >
                    <t.icon size={16} strokeWidth={1.5} />
                    <span className="text-[10px] font-medium tracking-wide">{t.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-corner]:bg-transparent">
              {tab === 'connection' && (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Server size={10} /> Node Domain
                    </label>
                    <input
                      type="text"
                      value={nodeDomain}
                      onChange={(e) => setNodeDomain(e.target.value)}
                      onBlur={handleBlurSave}
                      placeholder="e.g. pexipdemo.com"
                      className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <User size={10} /> Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onBlur={handleBlurSave}
                      placeholder="e.g. Jane Doe"
                      className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                    />
                  </div>

                  <div className="border-t border-white/6" />

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white/40 uppercase tracking-widest">
                      Registration
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        registrationStatus === 'registered'
                          ? 'bg-emerald-500'
                          : registrationStatus === 'connecting' || registrationStatus === 'error'
                            ? 'bg-amber-500'
                            : 'bg-white/20'
                      }`}
                    />
                    <span className="text-[10px] text-white/25">
                      {registrationStatus === 'registered'
                        ? 'Registered'
                        : registrationStatus === 'connecting'
                          ? 'Connecting...'
                          : registrationStatus === 'error'
                            ? registrationError || 'Error'
                            : 'Not registered'}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Mail size={10} /> Alias
                    </label>
                    <input
                      type="email"
                      value={regAlias}
                      onChange={(e) => setRegAlias(e.target.value)}
                      placeholder="e.g. user@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <User size={10} /> Username
                    </label>
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="e.g. username"
                      className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <KeyRound size={10} /> Password
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                    />
                  </div>

                  {registrationStatus === 'registered' ? (
                    <button
                      onClick={handleUnregister}
                      disabled={regBusy}
                      className="w-full py-3 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-400 font-semibold text-sm hover:bg-rose-500/25 transition-colors disabled:opacity-50"
                    >
                      {regBusy ? 'Unregistering...' : 'Unregister'}
                    </button>
                  ) : (
                    <button
                      onClick={handleRegister}
                      disabled={regBusy || !regAlias || !regUsername}
                      className="w-full py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-semibold text-sm hover:bg-emerald-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {regBusy ? 'Registering...' : 'Register'}
                    </button>
                  )}
                </div>
              )}

              {tab === 'meetings' && (
                <div className="space-y-5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/20 pl-1">
                    Calendar (One Touch Join)
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Key size={10} /> OTJ Client ID
                    </label>
                    <input
                      type="text"
                      value={otjClientId}
                      onChange={(e) => setOtjClientId(e.target.value)}
                      onBlur={handleMeetingBlurSave}
                      placeholder="From your Pexip OTJ portal"
                      className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <KeyRound size={10} /> OTJ Client Secret
                    </label>
                    <input
                      type="password"
                      value={otjClientSecret}
                      onChange={(e) => setOtjClientSecret(e.target.value)}
                      onBlur={handleMeetingBlurSave}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <CalendarDays size={10} /> Poll Interval
                    </label>
                    <div className="flex gap-2">
                      {[
                        { value: 30, label: '30s' },
                        { value: 60, label: '1m' },
                        { value: 120, label: '2m' },
                        { value: 300, label: '5m' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                            pollInterval === opt.value
                              ? 'bg-white/10 text-white border border-white/20'
                              : 'text-white/30 hover:text-white/50 border border-white/6'
                          }`}
                          onClick={() => {
                            setPollInterval(opt.value)
                            localStorage.setItem('fuse_poll_interval', String(opt.value))
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-white/6" />

                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/20 pl-1">
                    Provider Settings
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Cloud size={10} /> Pexip Cloud Customer ID
                    </label>
                    <input
                      type="text"
                      value={pexipCustomerId}
                      onChange={(e) => setPexipCustomerId(e.target.value)}
                      onBlur={handleMeetingBlurSave}
                      placeholder="Used for Teams CVI dial strings"
                      className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Video size={10} /> Google Meet Domain
                    </label>
                    <input
                      type="text"
                      value={googleDomain}
                      onChange={(e) => setGoogleDomain(e.target.value)}
                      onBlur={handleMeetingBlurSave}
                      placeholder="e.g. meet.example.com"
                      className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                    />
                  </div>
                </div>
              )}

              {tab === 'devices' && (
                <div className="space-y-5">
                  {/* Camera preview */}
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/6">
                    {cameraError ? (
                      <div className="absolute inset-0 flex items-center justify-center text-white/30 text-xs">
                        Camera unavailable
                      </div>
                    ) : (
                      <video
                        ref={videoPreviewRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover -scale-x-100"
                      />
                    )}
                  </div>

                  {/* Camera select */}
                  <div>
                    <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Camera size={10} /> Camera
                    </label>
                    <select
                      value={settings.videoInput}
                      onChange={(e) => saveSettings({ videoInput: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30 transition-colors appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-zinc-900">
                        System Default
                      </option>
                      {videoInputs.map((d) => (
                        <option key={d.deviceId} value={d.deviceId} className="bg-zinc-900">
                          {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Microphone + level meter */}
                  <div>
                    <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Mic size={10} /> Microphone
                    </label>
                    <select
                      value={settings.audioInput}
                      onChange={(e) => saveSettings({ audioInput: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30 transition-colors appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-zinc-900">
                        System Default
                      </option>
                      {audioInputs.map((d) => (
                        <option key={d.deviceId} value={d.deviceId} className="bg-zinc-900">
                          {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 h-2 rounded-full bg-white/6 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500/70 transition-[width] duration-75"
                        style={{ width: `${micLevel * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Speakers + test button */}
                  <div>
                    <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Speaker size={10} /> Speakers
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={settings.audioOutput}
                        onChange={(e) => saveSettings({ audioOutput: e.target.value })}
                        className="flex-1 px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30 transition-colors appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-zinc-900">
                          System Default
                        </option>
                        {audioOutputs.map((d) => (
                          <option key={d.deviceId} value={d.deviceId} className="bg-zinc-900">
                            {d.label || `Speaker ${d.deviceId.slice(0, 8)}`}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={speakerTest.toggle}
                        className={`px-3 py-3 rounded-xl border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                          speakerTest.testing
                            ? 'bg-white/10 border-white/20 text-white'
                            : 'bg-white/4 border-white/6 text-white/40 hover:text-white/60 hover:bg-white/6'
                        }`}
                      >
                        <Volume2 size={12} />
                        {speakerTest.testing ? 'Stop' : 'Test'}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-white/6" />

                  {/* Ringtone */}
                  <div>
                    <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Music size={10} /> Call Ringtone
                    </label>
                    <div className="space-y-2">
                      {ringtones.map((ringtone) => {
                        const selected = settings.ringtone === ringtone.id
                        return (
                          <div
                            key={ringtone.id}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                              selected
                                ? 'border-white/20 bg-white/8'
                                : 'border-transparent hover:bg-white/4'
                            }`}
                            onClick={() => saveSettings({ ringtone: ringtone.id })}
                          >
                            <span
                              className={`text-xs font-semibold ${selected ? 'text-white' : 'text-white/60'}`}
                            >
                              {ringtone.name}
                            </span>
                            <button
                              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                playRingtone(ringtone.id)
                              }}
                            >
                              {playingRingtone === ringtone.id ? (
                                <Square fill="currentColor" size={14} />
                              ) : (
                                <Play size={14} />
                              )}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'appearance' && (
                <div className="space-y-5 pb-2">
                  {CATEGORY_ORDER.map((category) => {
                    const categoryThemes = Object.values(THEMES).filter(
                      (t) => t.category === category,
                    )
                    if (categoryThemes.length === 0) return null
                    return (
                      <div key={category}>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-2 pl-1">
                          {category}
                        </div>
                        <div className="space-y-1.5">
                          {categoryThemes.map((t) => {
                            const selected = themeId === t.id
                            return (
                              <button
                                key={t.id}
                                onClick={() => onThemeChange(t.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                                  selected
                                    ? 'border-white/20 bg-white/8'
                                    : 'border-transparent hover:bg-white/4'
                                }`}
                              >
                                <div className="flex gap-1.5 shrink-0">
                                  {t.preview.map((color, i) => (
                                    <div
                                      key={i}
                                      className="w-3 h-3 rounded-full border border-white/10"
                                      style={{ backgroundColor: color }}
                                    />
                                  ))}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div
                                    className={`text-xs font-semibold ${selected ? 'text-white' : 'text-white/60'}`}
                                  >
                                    {t.label}
                                  </div>
                                  <div className="text-[10px] text-white/25 mt-0.5">
                                    {t.description}
                                  </div>
                                </div>
                                {selected && (
                                  <div
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: t.accentColor }}
                                  />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
