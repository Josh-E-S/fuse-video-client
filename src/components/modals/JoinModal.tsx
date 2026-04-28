'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, Lock, History, ChevronDown, Phone } from 'lucide-react'
import { getProviderById, getMeetingProvider } from '@/utils/meetingProvider'
import { useRecentCalls } from '@/hooks/useRecentCalls'
import { useSettings } from '@/hooks/useSettings'
import { useEscapeKey } from '@/hooks/useEscapeKey'

// Per-provider field configuration
const PROVIDER_FIELDS: Record<
  string,
  {
    subtitle: string
    idLabel: string
    idPlaceholder: string
    secondaryField: null | { label: string; placeholder: string }
  }
> = {
  'google-meet': {
    subtitle: 'Enter your Google Meet ID to join',
    idLabel: 'Meeting ID',
    idPlaceholder: 'e.g. abc-defg-hij',
    secondaryField: null,
  },
  zoom: {
    subtitle: 'Enter your Zoom meeting ID to join',
    idLabel: 'Meeting ID',
    idPlaceholder: 'e.g. 123 456 7890',
    secondaryField: { label: 'Passcode (optional)', placeholder: 'Leave blank if not required' },
  },
  'microsoft-teams': {
    subtitle: 'Enter your Teams meeting ID to join',
    idLabel: 'Meeting ID',
    idPlaceholder: 'e.g. 366 124 178 110 0',
    secondaryField: { label: 'Passcode', placeholder: 'e.g. wMv4Nr12 (case sensitive)' },
  },
  pexip: {
    subtitle: 'Enter the Pexip conference alias',
    idLabel: 'Conference Alias',
    idPlaceholder: 'e.g. meet.alice',
    secondaryField: { label: 'PIN (optional)', placeholder: 'Leave blank if no PIN required' },
  },
}

const DEFAULT_FIELDS = {
  subtitle: 'Enter a Pexip alias or full SIP URI',
  idLabel: 'Dial String',
  idPlaceholder: 'e.g. meet.room or 12345@zoomcrc.com',
  secondaryField: { label: 'PIN (optional)', placeholder: 'Leave blank if no PIN required' } as {
    label: string
    placeholder: string
  },
}

interface JoinModalProps {
  open: boolean
  onClose: () => void
  onJoin: (alias: string, pin?: string) => void
  loading: boolean
  error?: string | null
  providerId?: string
  providerIcon?: string
  providerLabel?: string
  pinRequested?: boolean
  initialAlias?: string
}

export function JoinModal({
  open,
  onClose,
  onJoin,
  loading,
  error,
  providerId,
  providerIcon,
  providerLabel,
  pinRequested,
  initialAlias,
}: JoinModalProps) {
  useEscapeKey(onClose, open)
  const [alias, setAlias] = useState('')
  const [pin, setPin] = useState('')
  const [showRecents, setShowRecents] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const { recentCalls } = useRecentCalls()
  const { settings } = useSettings()

  useEffect(() => {
    if (!open) {
      setAlias('')
      setPin('')
      setShowRecents(false)
      setValidationError(null)
    } else if (initialAlias) {
      setAlias(initialAlias)
    }
  }, [open, initialAlias])

  // Show passed-in provider, or detect from alias as user types
  const detectedProvider = getMeetingProvider(alias)
  const activeIcon = providerIcon || detectedProvider?.icon
  const activeLabel = providerLabel || detectedProvider?.label

  const fields = (providerId && PROVIDER_FIELDS[providerId]) || DEFAULT_FIELDS

  function buildZoomDialString(rawAlias: string, rawPin: string): { alias: string } | null {
    const cleanId = rawAlias.replace(/[\s-]/g, '')
    const cleanPasscode = rawPin.replace(/\s/g, '')
    if (!/^\d{9,11}$/.test(cleanId)) {
      setValidationError('Zoom Meeting ID must be 9-11 digits')
      return null
    }
    if (cleanPasscode && !/^\d+$/.test(cleanPasscode)) {
      setValidationError('Zoom passcode must be numeric')
      return null
    }
    setValidationError(null)
    const zoomAlias = cleanPasscode
      ? `${cleanId}.${cleanPasscode}@zoomcrc.com`
      : `${cleanId}@zoomcrc.com`
    return { alias: zoomAlias }
  }

  function validateTeams(rawId: string, rawPasscode: string): { meetingId: string; passcode: string } | null {
    const cleanId = rawId.replace(/[\s-]/g, '')
    if (!/^\d{9,17}$/.test(cleanId)) {
      setValidationError('Teams Meeting ID must be 9-17 digits')
      return null
    }
    const cleanPasscode = rawPasscode.trim()
    if (!cleanPasscode || !/^[a-zA-Z0-9]{6}$|^[a-zA-Z0-9]{8}$/.test(cleanPasscode)) {
      setValidationError('Teams passcode must be 6 or 8 alphanumeric characters')
      return null
    }
    setValidationError(null)
    return { meetingId: cleanId, passcode: cleanPasscode }
  }

  function buildGoogleMeetDialString(rawAlias: string): { alias: string } | null {
    const cleanId = rawAlias.replace(/[\s-]/g, '')
    if (!/^[a-z]{9,11}$/i.test(cleanId)) {
      setValidationError('Google Meet ID must be 9-11 letters (e.g. abc-defg-hij)')
      return null
    }
    const domain = settings.googleDomain || process.env.NEXT_PUBLIC_GOOGLE_DOMAIN
    if (!domain) {
      setValidationError('Google Meet domain not configured')
      return null
    }
    setValidationError(null)
    return { alias: `${cleanId}@${domain}` }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!alias.trim()) return

    if (providerId === 'zoom') {
      const dial = buildZoomDialString(alias.trim(), pin.trim())
      if (!dial) return
      onJoin(dial.alias)
      return
    }

    if (providerId === 'microsoft-teams') {
      const validated = validateTeams(alias.trim(), pin.trim())
      if (!validated) return
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (settings.pexipCustomerId) {
        headers['x-pexip-customer-id'] = settings.pexipCustomerId
      }
      const res = await fetch('/api/dial-string/teams', {
        method: 'POST',
        headers,
        body: JSON.stringify(validated),
      })
      if (!res.ok) {
        const data = await res.json()
        setValidationError(data.error || 'Failed to build dial string')
        return
      }
      const { alias: dialString } = await res.json()
      onJoin(dialString)
      return
    }

    if (providerId === 'google-meet') {
      const dial = buildGoogleMeetDialString(alias.trim())
      if (!dial) return
      onJoin(dial.alias)
      return
    }

    const trimmed = alias.trim()

    // If no @ in the dial string, it's a Pexip alias — needs a node domain configured
    if (!trimmed.includes('@')) {
      const nodeDomain = settings.nodeDomain || localStorage.getItem('fuse_node_domain') || ''
      if (!nodeDomain) {
        setValidationError('No Pexip node configured. Include a full SIP URI (user@domain) or set your node domain in Settings.')
        return
      }
    }

    setValidationError(null)
    onJoin(trimmed, pin.trim() || undefined)
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
            className="relative w-full max-w-md rounded-2xl bg-white/4 border border-white/10 backdrop-blur-3xl shadow-2xl p-8"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-1">
              <AnimatePresence mode="wait">
                {activeIcon && (
                  <motion.div
                    key={activeIcon}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={activeIcon} alt={activeLabel || ''} width={28} height={28} />
                  </motion.div>
                )}
              </AnimatePresence>
              <h2 className="text-2xl font-light text-white/90">
                {activeLabel ? `Join via ${activeLabel}` : 'Join Meeting'}
              </h2>
            </div>
            <p className="text-sm text-white/30 mb-8">
              {pinRequested ? 'This meeting requires a PIN to join' : fields.subtitle}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 block">
                  {fields.idLabel}
                </label>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => { setAlias(e.target.value); setValidationError(null) }}
                  placeholder={fields.idPlaceholder}
                  autoFocus={!pinRequested}
                  disabled={pinRequested}
                  className={`w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm ${pinRequested ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>

              {fields.secondaryField && (
                <div>
                  <label
                    className={`text-xs font-medium uppercase tracking-widest mb-2 flex items-center gap-1.5 ${pinRequested ? 'text-rose-400' : 'text-white/40'}`}
                  >
                    <Lock size={10} /> {pinRequested ? 'Required PIN' : fields.secondaryField.label}
                  </label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => { setPin(e.target.value); setValidationError(null) }}
                    placeholder={fields.secondaryField.placeholder}
                    autoFocus={pinRequested}
                    className="w-full px-4 py-3 rounded-xl bg-white/6 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                  />
                </div>
              )}

              {(error || validationError) && (
                <p className="text-rose-400 text-xs text-center">{validationError || error}</p>
              )}

              <button
                type="submit"
                disabled={!alias.trim() || loading}
                className="w-full mt-2 py-4 rounded-xl bg-white text-black font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  'Connecting...'
                ) : (
                  <>
                    Join <ChevronRight size={16} />
                  </>
                )}
              </button>
            </form>

            {recentCalls.length > 0 && !pinRequested && (
              <div className="mt-6 border-t border-white/5 pt-4">
                <button
                  onClick={() => setShowRecents(!showRecents)}
                  className="w-full flex items-center justify-between cursor-pointer hover:bg-white/2 transition-colors rounded-lg py-2 px-1 -mx-1"
                >
                  <div className="flex items-center gap-2">
                    <History size={14} className="text-white/35" strokeWidth={1.5} />
                    <span className="text-[13px] text-white/40">
                      Recent calls ({recentCalls.length})
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: showRecents ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={14} className="text-white/20" strokeWidth={1.5} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {showRecents && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 flex flex-col gap-1">
                        {recentCalls.map((call) => {
                          const prov = getProviderById(call.providerId) || getMeetingProvider(call.alias)
                          return (
                            <button
                              key={call.timestamp + call.alias}
                              onClick={() => {
                                setAlias(call.alias)
                                onJoin(call.alias)
                              }}
                              className="flex items-center gap-3 w-full rounded-lg px-2 py-2 -mx-2 hover:bg-white/4 transition-colors cursor-pointer text-left group"
                            >
                              <div className="w-8 h-8 rounded-full bg-white/4 flex items-center justify-center shrink-0 group-hover:bg-white/8 transition-colors">
                                {prov ? (
                                  <img
                                    src={prov.icon}
                                    alt=""
                                    width={14}
                                    height={14}
                                    className="opacity-70 group-hover:opacity-100"
                                  />
                                ) : (
                                  <Phone
                                    size={12}
                                    className="text-white/40 group-hover:text-white/70"
                                  />
                                )}
                              </div>
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-[13px] font-medium text-white/70 group-hover:text-white truncate transition-colors">
                                  {call.alias}
                                </span>
                                {prov && (
                                  <span
                                    className="text-[10px] text-white/30"
                                    style={{ color: prov.color }}
                                  >
                                    {prov.label}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-semibold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                                Dial
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
