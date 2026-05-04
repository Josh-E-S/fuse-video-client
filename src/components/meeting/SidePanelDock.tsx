'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Users,
  ScrollText,
  Hash,
  MoreVertical,
  LayoutGrid,
} from 'lucide-react'
import type { DockTab } from '@/components/meeting/DockPanel'

const HIDE_AFTER_MS = 2000

interface SidePanelDockProps {
  activeTab: DockTab | null
  onTabChange: (tab: DockTab | null) => void
  onDTMF?: () => void
  onToggleLayout?: () => void
  layout?: 'focus' | 'gallery' | 'side-by-side'
  participantCount?: number
  transcriptionEnabled?: boolean
  onRequestTranscription?: () => void
}

interface DockIcon {
  id: DockTab
  label: string
  icon: React.ReactNode
  badge?: number
}

export function SidePanelDock({
  activeTab,
  onTabChange,
  onDTMF,
  onToggleLayout,
  layout,
  participantCount,
  transcriptionEnabled,
  onRequestTranscription,
}: SidePanelDockProps) {
  const [showMore, setShowMore] = useState(false)
  const [visible, setVisible] = useState(true)
  const [pinned, setPinned] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!showMore) return
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMore])

  // Auto-hide: any mouse move shows the pill and resets a 2s idle timer.
  // Pinned (hover, open menu) prevents hiding entirely.
  useEffect(() => {
    const scheduleHide = () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      hideTimerRef.current = setTimeout(() => {
        setVisible(false)
      }, HIDE_AFTER_MS)
    }

    const handleMove = () => {
      setVisible(true)
      if (!pinned) scheduleHide()
    }

    scheduleHide()
    window.addEventListener('mousemove', handleMove)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [pinned])

  useEffect(() => {
    if (pinned && hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [pinned])

  // Pin while the more menu is open so it doesn't disappear mid-interaction.
  useEffect(() => {
    if (showMore) setPinned(true)
  }, [showMore])

  const dockIcons: DockIcon[] = [
    { id: 'transcript', label: 'Transcript', icon: <ScrollText size={17} /> },
    {
      id: 'people',
      label: 'Participants',
      icon: <Users size={17} />,
      badge: participantCount && participantCount > 0 ? participantCount : undefined,
    },
    { id: 'chat', label: 'Chat', icon: <MessageSquare size={17} /> },
  ]

  const handleTabClick = (tab: DockTab) => {
    // When transcription is off, clicking the transcript pill triggers the
    // consent flow. The parent's onConfirm opens the dock — we deliberately
    // do NOT open it here, so cancelling consent doesn't leave an empty dock.
    if (tab === 'transcript' && !transcriptionEnabled && onRequestTranscription) {
      onRequestTranscription()
      return
    }
    onTabChange(activeTab === tab ? null : tab)
  }

  const layoutLabel =
    layout === 'gallery' ? 'Gallery' : layout === 'side-by-side' ? 'Side-by-side' : 'Focus'

  const showOptionsMenu = Boolean(onDTMF)

  return (
    <AnimatePresence>
      {visible && (
    <motion.div
      key="side-pill"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      onMouseEnter={() => setPinned(true)}
      onMouseLeave={() => {
        if (!showMore) setPinned(false)
      }}
      className="absolute top-1/2 right-3 -translate-y-1/2 z-30 flex flex-col items-center gap-1 px-1.5 py-2 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-2xl shadow-2xl"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {dockIcons.map((seg) => {
        const active = activeTab === seg.id
        return (
          <button
            key={seg.id}
            onClick={() => handleTabClick(seg.id)}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${
              active
                ? 'bg-blue-400/15 text-blue-400'
                : 'text-white/60 hover:text-white/90 hover:bg-white/8'
            }`}
            title={active ? `Close ${seg.label.toLowerCase()}` : seg.label}
          >
            {seg.icon}
            {seg.badge !== undefined && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-black/85 border border-white/15 text-[9px] font-semibold text-white/85 flex items-center justify-center">
                {seg.badge}
              </span>
            )}
          </button>
        )
      })}

      {onToggleLayout && (
        <button
          onClick={onToggleLayout}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:text-white/90 hover:bg-white/8 transition-all duration-150"
          title={`Layout · ${layoutLabel}`}
        >
          <LayoutGrid size={17} />
        </button>
      )}

      <div className="w-6 h-px bg-white/8 my-0.5" />

      <div className="relative" ref={moreRef}>
        <button
          onClick={() => setShowMore((s) => !s)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${
            showMore
              ? 'bg-white/10 text-white/90'
              : 'text-white/60 hover:text-white/90 hover:bg-white/8'
          }`}
          title="More options"
        >
          <MoreVertical size={17} />
        </button>

        <AnimatePresence>
          {showMore && showOptionsMenu && (
            <motion.div
              initial={{ opacity: 0, x: 8, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 8, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              className="absolute right-full mr-3 top-0 min-w-[180px] py-1.5 rounded-xl bg-black/90 border border-white/10 backdrop-blur-2xl shadow-2xl"
            >
              {onDTMF && (
                <button
                  onClick={() => {
                    onDTMF()
                    setShowMore(false)
                  }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-white/70 hover:text-white hover:bg-white/6 transition-colors flex items-center gap-3"
                >
                  <Hash size={15} className="opacity-60" />
                  <span className="flex-1">Dialpad</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
      )}
    </AnimatePresence>
  )
}
