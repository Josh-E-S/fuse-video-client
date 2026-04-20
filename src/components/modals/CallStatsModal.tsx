'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { X, ArrowUp, ArrowDown } from 'lucide-react'
import { useEscapeKey } from '@/hooks/useEscapeKey'

interface CallStatsModalProps {
  open: boolean
  onClose: () => void
  getStats: () => Record<string, unknown> | null
}

interface StatRow {
  label: string
  send: string
  recv: string
}

// PexRTC getMediaStatistics() returns this shape
interface PexStats {
  outgoing?: {
    audio?: { bitrate?: number; 'packets-lost'?: number; 'packets-received'?: number; 'percentage-lost'?: number }
    video?: { bitrate?: number; 'packets-lost'?: number; 'packets-received'?: number; 'percentage-lost'?: number; 'decode-delay'?: number; resolution?: string }
  }
  incoming?: {
    audio?: { bitrate?: number; 'packets-lost'?: number; 'packets-received'?: number; 'percentage-lost'?: number }
    video?: { bitrate?: number; 'packets-lost'?: number; 'packets-received'?: number; 'percentage-lost'?: number; 'decode-delay'?: number; resolution?: string }
  }
}

// PexRTC returns bitrate in kbps
function formatBitrate(kbps: number | string | undefined): string {
  if (kbps === undefined || kbps === null) return '--'
  const val = typeof kbps === 'string' ? parseFloat(kbps) : kbps
  if (isNaN(val)) return '--'
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)} Mbps`
  return `${Math.round(val)} kbps`
}

function formatLoss(pct: number | string | undefined): string {
  if (pct === undefined || pct === null) return '--'
  const val = typeof pct === 'string' ? parseFloat(pct) : pct
  if (isNaN(val)) return '--'
  return `${val.toFixed(1)}%`
}

export function CallStatsModal({ open, onClose, getStats }: CallStatsModalProps) {
  useEscapeKey(onClose, open)
  const [stats, setStats] = useState<PexStats | null>(null)
  const [position, setPosition] = useState({ x: 16, y: 80 })
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null,
  )

  // Poll stats every 2 seconds
  useEffect(() => {
    if (!open) return
    const poll = () => setStats(getStats() as PexStats | null)
    poll()
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [open, getStats])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: position.x,
        origY: position.y,
      }

      const handleMove = (ev: PointerEvent) => {
        if (!dragRef.current) return
        setPosition({
          x: dragRef.current.origX + (ev.clientX - dragRef.current.startX),
          y: dragRef.current.origY + (ev.clientY - dragRef.current.startY),
        })
      }

      const handleUp = () => {
        dragRef.current = null
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)
      }

      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
    },
    [position],
  )

  if (!open) return null

  const out = stats?.outgoing
  const inc = stats?.incoming

  const rows: StatRow[] = [
    {
      label: 'Audio bitrate',
      send: formatBitrate(out?.audio?.bitrate),
      recv: formatBitrate(inc?.audio?.bitrate),
    },
    {
      label: 'Video bitrate',
      send: formatBitrate(out?.video?.bitrate),
      recv: formatBitrate(inc?.video?.bitrate),
    },
    {
      label: 'Audio loss',
      send: formatLoss(out?.audio?.['percentage-lost']),
      recv: formatLoss(inc?.audio?.['percentage-lost']),
    },
    {
      label: 'Video loss',
      send: formatLoss(out?.video?.['percentage-lost']),
      recv: formatLoss(inc?.video?.['percentage-lost']),
    },
    {
      label: 'Resolution',
      send: out?.video?.resolution || '--',
      recv: inc?.video?.resolution || '--',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed z-[200] w-[280px] rounded-2xl border border-white/8 shadow-2xl overflow-hidden select-none"
      style={{
        left: position.x,
        top: position.y,
        background: 'rgba(12, 18, 32, 0.92)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
      >
        <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-white/50">
          Call Statistics
        </span>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/8 transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* Stats table */}
      <div className="px-4 pb-4">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2 text-[10px] text-white/30 uppercase tracking-wider">
          <span className="flex-1" />
          <span className="w-16 text-center flex items-center justify-center gap-1">
            <ArrowUp size={9} /> Send
          </span>
          <span className="w-16 text-center flex items-center justify-center gap-1">
            <ArrowDown size={9} /> Recv
          </span>
        </div>

        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center gap-2 py-1.5 border-t border-white/4"
          >
            <span className="flex-1 text-[11px] text-white/50">{row.label}</span>
            <span className="w-16 text-center text-[11px] font-mono text-white/70">
              {row.send}
            </span>
            <span className="w-16 text-center text-[11px] font-mono text-white/70">
              {row.recv}
            </span>
          </div>
        ))}

        {!stats && (
          <div className="text-center text-[11px] text-white/25 py-3">
            Waiting for stats...
          </div>
        )}
      </div>
    </motion.div>
  )
}
