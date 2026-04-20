'use client'

import { useState, useEffect } from 'react'
import { log } from '@/utils/logger'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Copy, Check, Info, X } from 'lucide-react'
import { getMeetingProvider } from '@/utils/meetingProvider'
import { formatMeetingTime, getDayLabel } from '@/utils/meetingDate'
import type { CalendarMeeting } from '@/types/meetings'
import { useSettings } from '@/hooks/useSettings'
import { useEscapeKey } from '@/hooks/useEscapeKey'

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
        const sipUri = meeting.alias.includes('@')
          ? meeting.alias
          : `${meeting.alias}@${settings.nodeDomain}`
        lines.push(`SIP URI: ${sipUri}`)
      }
    }

    const text = lines.join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      log.ui.debug('Clipboard API unavailable, falling back to execCommand')
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
      <div>
        <AnimatePresence mode="wait">
          <motion.div
            key={meeting.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="p-6 flex items-center gap-4 border-l-[5px] border-transparent"
            style={{
              borderLeftColor: 'var(--theme-accent)',
              background: 'linear-gradient(to right, color-mix(in srgb, var(--theme-accent) 10%, transparent), transparent 70%)',
            }}
          >
            {provider && (
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={provider.icon} alt={provider.label} width={24} height={24} />
              </div>
            )}
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
              <div className="text-xl font-semibold text-white/95 tracking-[-0.015em] leading-snug">
                {meeting.title}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
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
                className="px-6 py-3 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 text-[14px] font-semibold text-white"
                style={{
                  background: 'rgba(52,211,153,0.2)',
                  border: '1px solid rgba(52,211,153,0.3)',
                  boxShadow: '0 4px 20px rgba(52,211,153,0.1)',
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

        {laterMeetings.length > 0 && (() => {
          const VISIBLE_COUNT = 3
          const visibleMeetings = laterMeetings.slice(0, VISIBLE_COUNT)
          const overflowMeetings = laterMeetings.slice(VISIBLE_COUNT)

          function renderMeetingRow(m: CalendarMeeting, showDayHeader: boolean, day: string) {
            const prov = getMeetingProvider(m.alias)
            return (
              <div key={m.id}>
                {showDayHeader && (
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/20 pt-2 pb-1 pl-0.5">
                    {day}
                  </div>
                )}
                <button
                  onClick={() => onSelectMeeting(m.id)}
                  className="flex items-center gap-3 w-full rounded-lg px-1.5 py-2.5 -mx-1.5 hover:bg-white/4 transition-colors cursor-pointer text-left"
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
                  <span className="text-[12px] text-white/40 flex-1 truncate">
                    {m.title}
                  </span>
                  <span className="text-[11px] text-white/25 tabular-nums flex-shrink-0">
                    {formatMeetingTime(m.startTime)}
                  </span>
                </button>
              </div>
            )
          }

          let lastDay = ''
          return (
            <div className="px-5 pb-3 pt-1">
              {visibleMeetings.map((m) => {
                const day = getDayLabel(m.startTime)
                const showHeader = day !== lastDay
                lastDay = day
                return renderMeetingRow(m, showHeader, day)
              })}

              {overflowMeetings.length > 0 && (
                <button
                  onClick={() => { setShowUpcoming(true); onExpandChange?.(true) }}
                  className="w-full py-2 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-white/2 rounded-lg transition-colors mt-1 pt-1"
                >
                  <span className="text-[12px] text-white/35 font-medium">
                    {overflowMeetings.length} more
                  </span>
                  <ChevronDown size={12} className="text-white/25" strokeWidth={1.5} />
                </button>
              )}
            </div>
          )
        })()}
      </div>

      <ScheduleModal
        open={showUpcoming}
        meetings={[meeting, ...laterMeetings]}
        onClose={() => { setShowUpcoming(false); onExpandChange?.(false) }}
        onSelectMeeting={onSelectMeeting}
      />
    </div>
  )
}

function ScheduleModal({
  open,
  meetings,
  onClose,
  onSelectMeeting,
}: {
  open: boolean
  meetings: CalendarMeeting[]
  onClose: () => void
  onSelectMeeting: (meetingId: string) => void
}) {
  useEscapeKey(onClose, open)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-[380px] mx-4 rounded-2xl bg-[#0d1520]/95 backdrop-blur-2xl border border-white/8 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <span className="text-[13px] font-semibold text-white/70">Schedule</span>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/6 transition-all"
                aria-label="Close schedule"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-5 pb-5 max-h-[60vh] overflow-y-auto [scrollbar-width:none]">
              {(() => {
                let lastDay = ''
                return meetings.map((m) => {
                  const day = getDayLabel(m.startTime)
                  const showHeader = day !== lastDay
                  lastDay = day
                  const prov = getMeetingProvider(m.alias)
                  return (
                    <div key={m.id}>
                      {showHeader && (
                        <div className="text-[10px] font-bold uppercase tracking-widest text-white/20 pt-3 pb-1 pl-0.5">
                          {day}
                        </div>
                      )}
                      <button
                        onClick={() => { onSelectMeeting(m.id); onClose() }}
                        className="flex items-center gap-3 w-full rounded-lg px-2 py-2.5 hover:bg-white/4 transition-colors cursor-pointer text-left"
                      >
                        {prov ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={prov.icon}
                            alt=""
                            width={16}
                            height={16}
                            className="opacity-70 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-white/10 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-[13px] text-white/70 truncate block">
                            {m.title}
                          </span>
                        </div>
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
        </motion.div>
      )}
    </AnimatePresence>
  )
}
