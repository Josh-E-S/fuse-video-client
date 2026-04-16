'use client'

import { useState, useEffect } from 'react'
import { Phone, History, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getProviderById, getMeetingProvider } from '@/utils/meetingProvider'
import type { RecentCall } from '@/hooks/useRecentCalls'

interface VisibleProvider {
  id: string
  label: string
  icon: string
}

interface AdHocJoinProps {
  isBusy: boolean
  cardBg: string
  recentCalls: RecentCall[]
  providers: VisibleProvider[]
  expanded?: boolean
  onExpandChange?: (expanded: boolean) => void
  onProviderClick: (provider: { id: string; icon: string; label: string }) => void
  onCallClick: () => void
  onRecentCallClick: (alias: string) => void
}

export function AdHocJoin({
  isBusy,
  cardBg,
  recentCalls,
  providers,
  expanded,
  onExpandChange,
  onProviderClick,
  onCallClick,
  onRecentCallClick,
}: AdHocJoinProps) {
  const [showRecents, setShowRecents] = useState(false)

  useEffect(() => {
    if (expanded !== undefined) setShowRecents(expanded)
  }, [expanded])

  return (
    <div className="mt-10 flex flex-col items-center gap-4">
      {providers.length > 0 && (
        <>
      <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-white/50">
        Quick Join
      </span>
      <div className="flex items-center gap-5">
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => onProviderClick(p)}
            disabled={isBusy}
            className="group flex flex-col items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-105 group-active:scale-95 glass-button"
              style={{ background: cardBg }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.icon}
                alt={p.label}
                width={28}
                height={28}
                className="opacity-85 group-hover:opacity-100 transition-opacity"
              />
            </div>
            <span className="text-[10px] text-white/50 group-hover:text-white/70 transition-colors">
              {p.label}
            </span>
          </button>
        ))}
      </div>
        </>
      )}

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={onCallClick}
          className="flex items-center gap-2.5 px-6 py-2.5 glass-pill"
          style={{ background: cardBg }}
        >
          <Phone size={15} className="text-emerald-400" />
          <span className="text-[13px] font-medium text-white/70">Call</span>
        </button>

        {recentCalls.length > 0 && (
          <button
            onClick={() => { setShowRecents(!showRecents); onExpandChange?.(!showRecents) }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-full bg-white/4 border border-white/6 hover:bg-white/8 transition-all"
          >
            <History size={13} className="text-white/35" strokeWidth={1.5} />
            <motion.div
              animate={{ rotate: showRecents ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={12} className="text-white/25" strokeWidth={1.5} />
            </motion.div>
          </button>
        )}
      </div>

      <AnimatePresence>
        {showRecents && recentCalls.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full max-w-[320px] overflow-hidden rounded-2xl bg-white/3 border border-white/6"
          >
            <div className="flex flex-col gap-0.5 p-2 max-h-[150px] overflow-y-auto [scrollbar-width:none]">
              {recentCalls.slice(0, 10).map((call) => {
                const prov =
                  getProviderById(call.providerId) || getMeetingProvider(call.alias)
                return (
                  <button
                    key={call.alias}
                    onClick={() => onRecentCallClick(call.alias)}
                    disabled={isBusy}
                    className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 hover:bg-white/6 transition-colors cursor-pointer text-left group disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/4 flex items-center justify-center shrink-0 group-hover:bg-white/8 transition-colors">
                      {prov ? (
                        // eslint-disable-next-line @next/next/no-img-element
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
                    <span className="flex-1 text-[13px] text-white/50 group-hover:text-white/70 transition-colors truncate min-w-0">
                      {call.alias}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider shrink-0">
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
  )
}
