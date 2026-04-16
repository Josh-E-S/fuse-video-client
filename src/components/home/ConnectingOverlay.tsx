'use client'

import { motion } from 'framer-motion'
import { PhoneOff } from 'lucide-react'

interface ConnectingOverlayProps {
  alias: string
  onCancel: () => void
}

export function ConnectingOverlay({ alias, onCancel }: ConnectingOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl"
    >
      <div className="relative w-20 h-20 mb-6">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-blue-400/40"
          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-blue-400/25"
          animate={{ scale: [1, 1.8, 1], opacity: [0.25, 0, 0.25] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        />
        <div className="absolute inset-0 rounded-full bg-blue-500/10 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-blue-400/80" />
        </div>
      </div>

      <span className="text-white/90 text-lg font-light tracking-wide mb-1">Calling...</span>
      <span className="text-white/35 text-sm">{alias}</span>

      <button
        onClick={onCancel}
        className="mt-10 w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/20 flex items-center justify-center text-rose-400 hover:bg-rose-500/25 transition-all"
        title="Cancel call"
      >
        <PhoneOff size={20} />
      </button>
      <span className="text-white/25 text-xs mt-2">Cancel</span>
    </motion.div>
  )
}
