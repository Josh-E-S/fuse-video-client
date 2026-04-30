'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MicOff, ScrollText } from 'lucide-react'

interface StatusBannerProps {
  isMuted: boolean
  isTranscribing: boolean
}

const REMIND_INTERVAL_MS = 30_000

export function StatusBanner({ isMuted, isTranscribing }: StatusBannerProps) {
  const [emphasis, setEmphasis] = useState(false)

  const items: { id: string; icon: React.ReactNode; label: string; color: string }[] = []
  if (isMuted) {
    items.push({
      id: 'muted',
      icon: <MicOff size={13} />,
      label: "You're muted",
      color: 'text-amber-300',
    })
  }
  if (isTranscribing) {
    items.push({
      id: 'transcribing',
      icon: <ScrollText size={13} />,
      label: 'Transcribing',
      color: 'text-violet-300',
    })
  }

  const visible = items.length > 0

  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => {
      setEmphasis(true)
      setTimeout(() => setEmphasis(false), 800)
    }, REMIND_INTERVAL_MS)
    return () => clearInterval(id)
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        // Outer wrapper: framer owns enter/exit (y + scale + opacity).
        <motion.div
          key="status-banner"
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: emphasis ? 1.04 : 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          className="absolute top-14 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
        >
          {/* Inner: CSS owns the steady-state pulse on opacity. */}
          <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-black/65 border border-white/10 backdrop-blur-2xl shadow-lg animate-[status-pulse_4s_ease-in-out_infinite]">
            {items.map((item, i) => (
              <div key={item.id} className="flex items-center gap-1.5">
                {i > 0 && <span className="w-px h-3 bg-white/15" />}
                <span className={`flex items-center gap-1.5 ${item.color}`}>
                  {item.icon}
                  <span className="text-[11px] font-medium text-white/85">{item.label}</span>
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
