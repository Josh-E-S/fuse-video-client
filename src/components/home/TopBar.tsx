'use client'

import { useState, useEffect } from 'react'
import { Settings, Pin, Maximize2, Minimize2, PictureInPicture2 } from 'lucide-react'
import type { RegistrationStatus } from '@/contexts/RegistrationContext'

interface TopBarProps {
  displayName: string
  userInitials: string
  regStatus: RegistrationStatus
  isElectron: boolean
  isExpanded: boolean
  isBusy: boolean
  pipSupported: boolean
  onSettings: () => void
  onToggleExpand: () => void
  onToggleMini?: () => void
  onOpenPip: () => void
}

export function TopBar({
  displayName,
  userInitials,
  regStatus,
  isElectron,
  isExpanded,
  isBusy,
  pipSupported,
  onSettings,
  onToggleExpand,
  onToggleMini,
  onOpenPip,
}: TopBarProps) {
  const regRingColor =
    regStatus === 'registered'
      ? 'ring-emerald-500'
      : regStatus === 'connecting' || regStatus === 'error'
        ? 'ring-amber-500'
        : 'ring-rose-500'

  const [clockStr, setClockStr] = useState('')
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    function tick() {
      const now = new Date()
      let h = now.getHours()
      const m = String(now.getMinutes()).padStart(2, '0')
      h = h % 12 || 12
      setClockStr(`${h}:${m}`)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      setDateStr(`${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`)
    }
    tick()
    const interval = setInterval(tick, 10_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-20 flex items-center justify-between ${isElectron ? 'pt-14' : 'pt-5'} pb-10 px-5 backdrop-blur-xl border-b border-white/8`}
      style={{
        backgroundColor: 'var(--theme-header-bg)',
        ...(isElectron ? ({ WebkitAppRegion: 'drag' } as React.CSSProperties) : {}),
      }}
    >
      {/* Left: avatar + name + status */}
      <div
        className="flex items-center gap-2.5"
        style={isElectron ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}
      >
        <div className="relative">
          <button
            onClick={onSettings}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold tracking-wide cursor-pointer transition-transform hover:scale-105 ring-[1.5px] ${regRingColor}`}
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(139,92,246,0.25))',
            }}
            title="Settings"
            aria-label="Open settings"
          >
            {userInitials}
          </button>
          {regStatus === 'registered' && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black" />
          )}
          {(regStatus === 'connecting' || regStatus === 'error') && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-black" />
          )}
          {regStatus === 'unregistered' && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-white/20 border-2 border-black" />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white/70 leading-tight">{displayName}</span>
        </div>
      </div>

      {/* Center: clock */}
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
        <span className="text-[12px] text-white/35">{dateStr}</span>
        <span className="text-[32px] font-light text-white/80 tabular-nums tracking-tight leading-none mt-0.5">{clockStr}</span>
      </div>

      {/* Right: expand/compact toggle (Electron) or PiP (web) + settings */}
      <div
        className="flex items-center gap-2"
        style={isElectron ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}
      >
        {isElectron ? (
          <>
            {onToggleMini && (
              <button
                onClick={onToggleMini}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white/85 glass-button"
                title="Mini mode"
                aria-label="Mini mode"
              >
                <PictureInPicture2 size={14} strokeWidth={1.5} />
              </button>
            )}
            <button
              onClick={onToggleExpand}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white/85 glass-button"
              title={isExpanded ? 'Compact view' : 'Expanded view'}
              aria-label={isExpanded ? 'Compact view' : 'Expanded view'}
            >
              {isExpanded ? (
                <Minimize2 size={14} strokeWidth={1.5} />
              ) : (
                <Maximize2 size={14} strokeWidth={1.5} />
              )}
            </button>
          </>
        ) : (
          <button
            onClick={onOpenPip}
            disabled={isBusy || !pipSupported}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white/85 glass-button disabled:opacity-30 disabled:cursor-not-allowed"
            title={!pipSupported ? 'PiP not supported in this browser' : 'Float window'}
            aria-label="Float window"
          >
            <Pin size={14} strokeWidth={1.5} />
          </button>
        )}
        <button
          onClick={onSettings}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white/85 glass-button"
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
