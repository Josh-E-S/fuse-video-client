'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Server,
  User,
  CalendarDays,
  KeyRound,
  Key,
  Cloud,
  Video,
  Camera,
  Mic,
  Speaker,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
} from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { useMediaDevices, useSpeakerTest } from '@/hooks/useMediaDevices'

const SETUP_KEY = 'fuse_setup_complete'

export function useSetupRequired() {
  const [required, setRequired] = useState(false)
  useEffect(() => {
    setRequired(!localStorage.getItem(SETUP_KEY))
  }, [])
  return { required, complete: () => { localStorage.setItem(SETUP_KEY, '1'); setRequired(false) } }
}

interface SetupWizardProps {
  open: boolean
  onComplete: () => void
}

const STEPS = ['welcome', 'connection', 'calendar', 'providers', 'devices', 'check', 'done'] as const

type CheckStatus = 'pending' | 'checking' | 'pass' | 'warn' | 'fail'
interface CheckItem {
  label: string
  status: CheckStatus
  detail?: string
}
type Step = typeof STEPS[number]

export function SetupWizard({ open, onComplete }: SetupWizardProps) {
  const { settings, saveSettings } = useSettings()
  const [step, setStep] = useState<Step>('welcome')
  const stepIdx = STEPS.indexOf(step)

  const [nodeDomain, setNodeDomain] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [otjClientId, setOtjClientId] = useState('')
  const [otjClientSecret, setOtjClientSecret] = useState('')
  const [pexipCustomerId, setPexipCustomerId] = useState('')
  const [googleDomain, setGoogleDomain] = useState('')

  useEffect(() => {
    if (open) {
      setNodeDomain(settings.nodeDomain)
      setDisplayName(settings.displayName)
      setOtjClientId(settings.otjClientId)
      setOtjClientSecret(settings.otjClientSecret)
      setPexipCustomerId(settings.pexipCustomerId)
      setGoogleDomain(settings.googleDomain)
    }
  }, [open, settings])

  const {
    audioInputs,
    audioOutputs,
    videoInputs,
    previewStream,
    cameraError,
    micLevel,
  } = useMediaDevices({
    active: open && step === 'devices',
    audioInputId: settings.audioInput,
    videoInputId: settings.videoInput,
  })

  const speakerTest = useSpeakerTest(settings.audioOutput)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    const el = videoRef.current
    if (el && previewStream) {
      el.srcObject = previewStream
      el.play().catch(() => {})
    } else if (el) {
      el.srcObject = null
    }
  }, [previewStream])

  function saveAndNext() {
    if (step === 'connection') {
      saveSettings({ nodeDomain, displayName })
    } else if (step === 'calendar') {
      saveSettings({ otjClientId, otjClientSecret })
    } else if (step === 'providers') {
      saveSettings({ pexipCustomerId, googleDomain })
    }
    const nextStep = STEPS[stepIdx + 1]
    if (nextStep) {
      setStep(nextStep)
      if (nextStep === 'check') runChecks()
    }
  }

  const [checks, setChecks] = useState<CheckItem[]>([])

  async function runChecks() {
    const items: CheckItem[] = [
      { label: 'Pexip Node', status: 'pending' },
      { label: 'Calendar (OTJ)', status: 'pending' },
      { label: 'Camera', status: 'pending' },
      { label: 'Microphone', status: 'pending' },
    ]
    setChecks([...items])

    async function update(idx: number, status: CheckStatus, detail?: string) {
      items[idx] = { ...items[idx], status, detail }
      setChecks([...items])
      await new Promise((r) => setTimeout(r, 400))
    }

    // Check 1: Pexip node reachability
    await update(0, 'checking')
    try {
      const res = await fetch(`https://${nodeDomain}/api/client/v2/status`, { method: 'GET', signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        await update(0, 'pass', 'Node reachable')
      } else {
        await update(0, 'warn', `Status ${res.status}`)
      }
    } catch {
      if (nodeDomain) {
        await update(0, 'fail', 'Cannot reach node')
      } else {
        await update(0, 'fail', 'No node domain configured')
      }
    }

    // Check 2: Calendar / OTJ
    await update(1, 'checking')
    if (!otjClientId || !otjClientSecret) {
      await update(1, 'warn', 'Not configured (optional)')
    } else {
      try {
        const res = await fetch('/api/meetings', {
          headers: {
            'x-otj-client-id': otjClientId,
            'x-otj-client-secret': otjClientSecret,
          },
        })
        const data = await res.json()
        if (res.ok && data.meetings) {
          await update(1, 'pass', `${data.meetings.length} meetings found`)
        } else {
          await update(1, 'fail', 'Auth failed')
        }
      } catch {
        await update(1, 'fail', 'Connection error')
      }
    }

    // Check 3: Camera
    await update(2, 'checking')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      stream.getTracks().forEach((t) => t.stop())
      await update(2, 'pass', 'Camera accessible')
    } catch {
      await update(2, 'fail', 'No camera access')
    }

    // Check 4: Microphone
    await update(3, 'checking')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      stream.getTracks().forEach((t) => t.stop())
      await update(3, 'pass', 'Microphone accessible')
    } catch {
      await update(3, 'fail', 'No microphone access')
    }
  }

  function prev() {
    const p = STEPS[stepIdx - 1]
    if (p) setStep(p)
  }

  function finish() {
    onComplete()
    setStep('welcome')
  }

  const canNext = step === 'connection' ? !!nodeDomain.trim() && !!displayName.trim() : true

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.95, y: 10, opacity: 0, filter: 'blur(4px)' }}
            animate={{ scale: 1, y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ scale: 0.95, y: 10, opacity: 0, filter: 'blur(4px)' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="relative w-full max-w-md rounded-2xl bg-white/4 border border-white/10 backdrop-blur-3xl shadow-2xl p-8 overflow-hidden"
          >
            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i <= stepIdx ? 'bg-white/40 w-6' : 'bg-white/10 w-4'
                  }`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === 'welcome' && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/6 border border-white/8 flex items-center justify-center mx-auto">
                      <Sparkles size={28} className="text-white/50" />
                    </div>
                    <h2 className="text-2xl font-light text-white/90">Welcome to Fuse</h2>
                    <p className="text-sm text-white/40 leading-relaxed max-w-sm mx-auto">
                      Let's get you set up in a few quick steps. You can always change these later in Settings.
                    </p>
                  </div>
                )}

                {step === 'connection' && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-light text-white/90 mb-1">Connection</h2>
                      <p className="text-sm text-white/30">Connect to your Pexip Infinity deployment</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Server size={10} /> Node Domain
                      </label>
                      <input
                        type="text"
                        value={nodeDomain}
                        onChange={(e) => setNodeDomain(e.target.value)}
                        placeholder="e.g. pexipdemo.com"
                        autoFocus
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
                        placeholder="e.g. Jane Doe"
                        className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                      />
                    </div>
                  </div>
                )}

                {step === 'calendar' && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-light text-white/90 mb-1">Calendar</h2>
                      <p className="text-sm text-white/30">Connect your calendar with Pexip One Touch Join</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Key size={10} /> OTJ Client ID
                      </label>
                      <input
                        type="text"
                        value={otjClientId}
                        onChange={(e) => setOtjClientId(e.target.value)}
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
                        placeholder="••••••••"
                        className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                      />
                    </div>
                    <p className="text-[11px] text-white/20">Optional. Skip if you don't use calendar integration.</p>
                  </div>
                )}

                {step === 'providers' && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-light text-white/90 mb-1">Provider Settings</h2>
                      <p className="text-sm text-white/30">Configure interop with third-party meeting providers</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Cloud size={10} /> Pexip Cloud Customer ID
                      </label>
                      <input
                        type="text"
                        value={pexipCustomerId}
                        onChange={(e) => setPexipCustomerId(e.target.value)}
                        placeholder="For Teams CVI dial strings"
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
                        placeholder="e.g. meet.example.com"
                        className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                      />
                    </div>
                    <p className="text-[11px] text-white/20">Optional. Skip if you only use Pexip-native meetings.</p>
                  </div>
                )}

                {step === 'devices' && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-light text-white/90 mb-1">Devices</h2>
                      <p className="text-sm text-white/30">Check your camera, mic, and speakers</p>
                    </div>

                    {/* Camera preview */}
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/6">
                      {cameraError ? (
                        <div className="absolute inset-0 flex items-center justify-center text-white/30 text-xs">
                          Camera unavailable
                        </div>
                      ) : (
                        <video
                          ref={videoRef}
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
                        <option value="" className="bg-zinc-900">System Default</option>
                        {videoInputs.map((d) => (
                          <option key={d.deviceId} value={d.deviceId} className="bg-zinc-900">
                            {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Mic + level */}
                    <div>
                      <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Mic size={10} /> Microphone
                      </label>
                      <select
                        value={settings.audioInput}
                        onChange={(e) => saveSettings({ audioInput: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30 transition-colors appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-zinc-900">System Default</option>
                        {audioInputs.map((d) => (
                          <option key={d.deviceId} value={d.deviceId} className="bg-zinc-900">
                            {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 h-1.5 rounded-full bg-white/6 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500/60"
                          style={{
                            width: `${micLevel * 100}%`,
                            transition: 'width 0.15s ease-out',
                          }}
                        />
                      </div>
                    </div>

                    {/* Speaker */}
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
                          <option value="" className="bg-zinc-900">System Default</option>
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
                          {speakerTest.testing ? 'Stop' : 'Test'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 'check' && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-light text-white/90 mb-1">System Check</h2>
                      <p className="text-sm text-white/30">Verifying your configuration</p>
                    </div>
                    <div className="space-y-3">
                      {checks.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/3 border border-white/6">
                          <div className="w-6 h-6 flex items-center justify-center shrink-0">
                            {item.status === 'pending' && (
                              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                            )}
                            {item.status === 'checking' && (
                              <div className="w-4 h-4 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
                            )}
                            {item.status === 'pass' && (
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            )}
                            {item.status === 'warn' && (
                              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            )}
                            {item.status === 'fail' && (
                              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-white/80">{item.label}</div>
                            {item.detail && (
                              <div className={`text-[11px] ${
                                item.status === 'pass' ? 'text-emerald-400/60' :
                                item.status === 'warn' ? 'text-amber-400/60' :
                                item.status === 'fail' ? 'text-rose-400/60' :
                                'text-white/30'
                              }`}>
                                {item.detail}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 'done' && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                      <Check size={28} className="text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-light text-white/90">You're all set</h2>
                    <p className="text-sm text-white/40 leading-relaxed max-w-sm mx-auto">
                      Everything is configured. You can change any of these settings later from the settings menu.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              {stepIdx > 0 && step !== 'done' && step !== 'check' ? (
                <button
                  onClick={prev}
                  className="flex items-center gap-1 text-sm text-white/30 hover:text-white/60 transition-colors"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              ) : (
                <div />
              )}

              {step === 'done' ? (
                <button
                  onClick={finish}
                  className="w-full py-4 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
                >
                  Get started
                </button>
              ) : step === 'check' ? (
                <button
                  onClick={saveAndNext}
                  disabled={checks.some((c) => c.status === 'pending' || c.status === 'checking')}
                  className="w-full py-4 rounded-xl bg-white/8 border border-white/10 text-white font-medium text-sm hover:bg-white/12 transition-colors flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {checks.some((c) => c.status === 'checking' || c.status === 'pending') ? 'Checking...' : 'Continue'}
                </button>
              ) : step === 'welcome' ? (
                <button
                  onClick={saveAndNext}
                  className="ml-auto py-3 px-6 rounded-xl bg-white/8 border border-white/10 text-white font-medium text-sm hover:bg-white/12 transition-colors flex items-center gap-2"
                >
                  Let's go <ChevronRight size={16} />
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  {step !== 'connection' && (
                    <button
                      onClick={saveAndNext}
                      className="text-sm text-white/25 hover:text-white/50 transition-colors"
                    >
                      Skip
                    </button>
                  )}
                  <button
                    onClick={saveAndNext}
                    disabled={!canNext}
                    className="py-3 px-6 rounded-xl bg-white/8 border border-white/10 text-white font-medium text-sm hover:bg-white/12 transition-colors flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
