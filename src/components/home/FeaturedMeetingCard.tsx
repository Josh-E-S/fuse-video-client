'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChevronDown, Copy, Check, Info } from 'lucide-react'
import { getMeetingProvider } from '@/utils/meetingProvider'
import { formatMeetingTime, getDayLabel } from '@/utils/meetingDate'
import type { CalendarMeeting } from '@/types/meetings'
import { useSettings } from '@/hooks/useSettings'

interface FeaturedMeetingCardProps {
  meeting: CalendarMeeting
  laterMeetings: CalendarMeeting[]
  countdown: string | null
  canJoin: boolean
  isBusy: boolean
  cardBg: string
  expanded?: boolean
  onExpandChange?: (expanded: boolean) => void
  onJoin: () => void
  onSelectMeeting: (meetingId: string) => void
}

export function FeaturedMeetingCard({
  meeting,
  laterMeetings,
  countdown,
  canJoin,
  isBusy,
  cardBg,
  expanded,
  onExpandChange,
  onJoin,
  onSelectMeeting,
}: FeaturedMeetingCardProps) {
  const [showUpcoming, setShowUpcoming] = useState(false)

  useEffect(() => {
    if (expanded !== undefined) setShowUpcoming(expanded)
  }, [expanded])
  const [copied, setCopied] = useState(false)
  const provider = getMeetingProvider(meeting.alias)
  const { settings } = useSettings()

  async function handleCopy() {
    const lines = [
      meeting.title,
      `Time: ${formatMeetingTime(meeting.startTime)} - ${formatMeetingTime(meeting.endTime)}`,
      meeting.organizerName ? `Organizer: ${meeting.organizerName}` : '',
      provider ? `Provider: ${provider.label}` : '',
    ].filter(Boolean)

    if (meeting.alias) {
      lines.push('')
      lines.push(`Alias: ${meeting.alias}`)
      if (settings.nodeDomain) {
        lines.push(`SIP URI: ${meeting.alias}@${settings.nodeDomain}`)
      }
    }

    const text = lines.join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mt-8">
      <div className="rounded-2xl glass-surface overflow-hidden" style={{ background: cardBg }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={meeting.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="p-5 flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              {meeting.isNow ? (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide">
                    Live now
                  </span>
                </div>
              ) : countdown ? (
                <div className="text-xs font-semibold text-blue-400/85 mb-1.5 tracking-wide">
                  {countdown}
                </div>
              ) : null}
              <div className="text-lg font-semibold text-white/93 tracking-[-0.015em] leading-snug">
                {meeting.title}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                {provider && (
                  <>
                    <div className="flex items-center gap-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={provider.icon} alt="" width={14} height={14} />
                      <span className="text-[12px] font-medium" style={{ color: provider.color }}>
                        {provider.label}
                      </span>
                    </div>
                    <span className="text-white/20">|</span>
                  </>
                )}
                <span className="text-[13px] text-white/55">
                  {formatMeetingTime(meeting.startTime)} - {formatMeetingTime(meeting.endTime)}
                </span>
                <button
                  onClick={handleCopy}
                  className="ml-1 w-6 h-6 rounded-lg flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/6 transition-all"
                  title="Copy meeting info"
                >
                  {copied ? (
                    <Check size={11} className="text-emerald-400" />
                  ) : (
                    <Copy size={11} />
                  )}
                </button>
              </div>
            </div>
            {canJoin ? (
              <button
                onClick={onJoin}
                disabled={isBusy}
                className="px-5 py-2.5 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 text-[13px] font-semibold text-emerald-400"
                style={{
                  background: 'rgba(52,211,153,0.12)',
                  border: '1px solid rgba(52,211,153,0.18)',
                  boxShadow: '0 4px 20px rgba(52,211,153,0.08)',
                }}
                title="Join meeting"
              >
                Join
              </button>
            ) : !meeting.alias ? (
              <div className="relative group flex-shrink-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 group-hover:text-white/45 transition-colors">
                  <Info size={15} strokeWidth={1.5} />
                </div>
                <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm border border-white/10 text-[11px] text-white/70 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                  No dial info found
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {laterMeetings.length > 0 && (
          <div className="border-t border-white/5">
            <button
              onClick={() => { setShowUpcoming(!showUpcoming); onExpandChange?.(!showUpcoming) }}
              className="w-full px-5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-white/35" strokeWidth={1.5} />
                <span className="text-[13px] text-white/40">{laterMeetings.length} upcoming</span>
              </div>
              <motion.div
                animate={{ rotate: showUpcoming ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={14} className="text-white/20" strokeWidth={1.5} />
              </motion.div>
            </button>

            <AnimatePresence>
              {showUpcoming && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-3 max-h-[140px] overflow-y-auto [scrollbar-width:none]">
                    {(() => {
                      let lastDay = ''
                      return laterMeetings.map((m) => {
                        const day = getDayLabel(m.startTime)
                        const showHeader = day !== lastDay
                        lastDay = day
                        const prov = getMeetingProvider(m.alias)
                        return (
                          <div key={m.id}>
                            {showHeader && (
                              <div className="text-[10px] font-bold uppercase tracking-widest text-white/20 pt-2 pb-1 pl-0.5">
                                {day}
                              </div>
                            )}
                            <button
                              onClick={() => onSelectMeeting(m.id)}
                              className="flex items-center gap-3 w-full rounded-lg px-1.5 py-1.5 -mx-1.5 hover:bg-white/4 transition-colors cursor-pointer text-left"
                            >
                              {prov ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={prov.icon}
                                  alt=""
                                  width={12}
                                  height={12}
                                  className="opacity-60 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-3 h-3 rounded-full bg-white/10 flex-shrink-0" />
                              )}
                              <span className="text-[13px] text-white/55 flex-1 truncate">
                                {m.title}
                              </span>
                              <span className="text-[12px] text-white/35 tabular-nums flex-shrink-0">
                                {formatMeetingTime(m.startTime)}
                              </span>
                            </button>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
