'use client'

import {
  BarChart3,
  Settings2,
  PictureInPicture2,
  Maximize2,
  Minimize2,
  MonitorUp,
} from 'lucide-react'

interface MeetingHeaderProps {
  alias: string
  displayName: string
  participants: Array<{ display_name: string }>
  isElectron: boolean
  isExpanded: boolean
  presentationStream: MediaStream | null
  presentationPopped: boolean
  showStats: boolean
  onTogglePresentationPopout: () => void
  onToggleStats: () => void
  onOpenSettings: () => void
  onToggleMini: () => void
  onToggleExpand: () => void
}

export function MeetingHeader({
  alias,
  displayName,
  participants,
  isElectron,
  isExpanded,
  presentationStream,
  presentationPopped,
  showStats,
  onTogglePresentationPopout,
  onToggleStats,
  onOpenSettings,
  onToggleMini,
  onToggleExpand,
}: MeetingHeaderProps) {
  return (
    <header className="flex items-center justify-between shrink-0 px-1 mb-2">
      <span className="text-[13px] text-white/50 font-medium truncate max-w-[200px] [-webkit-app-region:no-drag]">
        {participants.find((p) => p.display_name !== displayName)?.display_name || alias}
      </span>
      <div className="flex items-center gap-1.5">
        {isElectron && presentationStream && (
          <button
            onClick={onTogglePresentationPopout}
            className={`w-8 h-8 rounded-full flex items-center justify-center hover:text-white/85 glass-button [-webkit-app-region:no-drag] ${presentationPopped ? 'text-blue-400' : 'text-white/60'}`}
            title={presentationPopped ? 'Close presentation window' : 'Pop out presentation'}
            aria-label={presentationPopped ? 'Close presentation window' : 'Pop out presentation'}
          >
            <MonitorUp size={14} strokeWidth={1.5} />
          </button>
        )}
        <button
          onClick={onToggleStats}
          className={`w-8 h-8 rounded-full flex items-center justify-center hover:text-white/85 glass-button [-webkit-app-region:no-drag] ${showStats ? 'text-blue-400' : 'text-white/60'}`}
          title="Call statistics"
          aria-label="Call statistics"
        >
          <BarChart3 size={14} strokeWidth={1.5} />
        </button>
        <button
          onClick={onOpenSettings}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white/85 glass-button [-webkit-app-region:no-drag]"
          title="Settings"
          aria-label="Settings"
        >
          <Settings2 size={14} strokeWidth={1.5} />
        </button>
        {isElectron && (
          <>
            <button
              onClick={onToggleMini}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white/85 glass-button [-webkit-app-region:no-drag]"
              title="Mini mode"
              aria-label="Mini mode"
            >
              <PictureInPicture2 size={14} strokeWidth={1.5} />
            </button>
            <button
              onClick={onToggleExpand}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white/85 glass-button [-webkit-app-region:no-drag]"
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
        )}
      </div>
    </header>
  )
}
