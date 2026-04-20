'use client'

import { useState, useEffect } from 'react'
import { Phone, Grid3X3, History, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getProviderById, getMeetingProvider } from '@/utils/meetingProvider'
import { useEscapeKey } from '@/hooks/useEscapeKey'
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
      <div className="flex items-center gap-6">
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => onProviderClick(p)}
            disabled={isBusy}
            className="group flex flex-col items-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div
              className="w-[60px] h-[60px] rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 group-active:scale-95 glass-button"
              style={{ background: cardBg }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.icon}
                alt={p.label}
                width={32}
                height={32}
                className="opacity-90 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </button>
        ))}
      </div>
        </>
      )}

      <div className="flex items-center justify-center mt-5">
        <div
          className="flex items-center rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'rgba(52,211,153,0.15)',
            border: '1px solid rgba(52,211,153,0.25)',
            boxShadow: '0 4px 20px rgba(52,211,153,0.1)',
          }}
        >
          <button
            onClick={onCallClick}
            className="flex items-center gap-2.5 px-8 py-3 transition-all hover:bg-emerald-500/15 active:scale-[0.97]"
          >
            <Phone size={16} className="text-emerald-500" />
            <span className="text-[14px] font-semibold text-emerald-500">Dial</span>
          </button>

          {recentCalls.length > 0 && (
            <>
              <div className="w-px self-stretch bg-emerald-500/40" />
              <button
                onClick={() => { setShowRecents(true); onExpandChange?.(true) }}
                className="flex items-center px-3 py-3 transition-all hover:bg-emerald-500/15 active:scale-[0.97]"
              >
                <History size={15} className="text-emerald-500" strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>
      </div>

      <RecentsModal
        open={showRecents}
        recentCalls={recentCalls}
        isBusy={isBusy}
        onClose={() => { setShowRecents(false); onExpandChange?.(false) }}
        onRecentCallClick={(alias) => { setShowRecents(false); onExpandChange?.(false); onRecentCallClick(alias) }}
      />
    </div>
  )
}

function RecentsModal({
  open,
  recentCalls,
  isBusy,
  onClose,
  onRecentCallClick,
}: {
  open: boolean
  recentCalls: RecentCall[]
  isBusy: boolean
  onClose: () => void
  onRecentCallClick: (alias: string) => void
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
            className="relative w-full max-w-[380px] mx-4 rounded-2xl bg-black/95 backdrop-blur-2xl border border-white/8 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <span className="text-[13px] font-semibold text-white/70">Recent Calls</span>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/6 transition-all"
                aria-label="Close recent calls"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-3 pb-4 max-h-[50vh] overflow-y-auto [scrollbar-width:none]">
              {recentCalls.slice(0, 15).map((call) => {
                const prov =
                  getProviderById(call.providerId) || getMeetingProvider(call.alias)
                return (
                  <button
                    key={call.alias}
                    onClick={() => onRecentCallClick(call.alias)}
                    disabled={isBusy}
                    className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 hover:bg-white/4 transition-colors cursor-pointer text-left group disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {prov ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={prov.icon}
                        alt=""
                        width={16}
                        height={16}
                        className="opacity-70 group-hover:opacity-100 flex-shrink-0"
                      />
                    ) : (
                      <Phone
                        size={14}
                        className="text-white/40 group-hover:text-white/70 flex-shrink-0"
                      />
                    )}
                    <span className="flex-1 text-[13px] text-white/60 group-hover:text-white/80 transition-colors truncate min-w-0">
                      {call.alias}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider shrink-0">
                      Dial
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
