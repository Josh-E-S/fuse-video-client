'use client'

import { Settings2, Pin, Maximize2, Minimize2, PictureInPicture2 } from 'lucide-react'
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

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-20 flex items-start justify-between ${isElectron ? 'pt-14' : 'pt-5'} pb-2 px-5`}
      style={isElectron ? ({ WebkitAppRegion: 'drag' } as React.CSSProperties) : undefined}
    >
      {/* Left: avatar + name + status */}
      <div
        className="flex items-start gap-2.5"
        style={isElectron ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}
      >
        <div className="flex flex-col items-center gap-3">
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
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white/55 leading-tight">{displayName}</span>
          {regStatus === 'registered' && (
            <div className="flex items-center gap-1.5">
              <div className="w-[5px] h-[5px] rounded-full bg-emerald-400" />
              <span className="text-[10px] font-medium text-white/25">Online</span>
            </div>
          )}
          {regStatus === 'connecting' && (
            <span className="text-[10px] font-medium text-amber-400/50">Connecting...</span>
          )}
        </div>
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
          <Settings2 size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
