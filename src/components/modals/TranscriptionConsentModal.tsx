'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Mic } from 'lucide-react'
import { useEscapeKey } from '@/hooks/useEscapeKey'

interface TranscriptionConsentModalProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function TranscriptionConsentModal({
  open,
  onConfirm,
  onCancel,
}: TranscriptionConsentModalProps) {
  useEscapeKey(onCancel, open)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onClick={(e) => {
            if (e.target === e.currentTarget) onCancel()
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-[360px] rounded-2xl bg-black/90 border border-white/10 backdrop-blur-2xl shadow-2xl p-6 flex flex-col gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-400/15 border border-violet-400/25 flex items-center justify-center shrink-0">
                <Mic size={16} className="text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-semibold text-white/90 leading-tight">
                  Start transcription?
                </h3>
                <p className="text-[13px] text-white/55 mt-2 leading-relaxed">
                  Please ensure any participants present have consented to being recorded.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={onConfirm}
                className="w-full py-2.5 rounded-xl bg-emerald-400/15 border border-emerald-400/30 text-emerald-200 text-[13px] font-semibold hover:bg-emerald-400/20 transition-colors"
              >
                Start transcription
              </button>
              <button
                onClick={onCancel}
                className="w-full py-2.5 rounded-xl bg-white/4 border border-white/10 text-white/70 text-[13px] font-medium hover:bg-white/8 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
