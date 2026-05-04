'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface ClearConfirmModalProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ClearConfirmModal({ open, onConfirm, onCancel }: ClearConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCancel()
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-[320px] rounded-2xl bg-black/90 border border-white/10 backdrop-blur-2xl shadow-2xl p-6 flex flex-col gap-4"
          >
            <div>
              <h3 className="text-[15px] font-semibold text-white/90">Clear transcript?</h3>
              <p className="text-[13px] text-white/45 mt-1.5 leading-relaxed">
                This removes all captured lines and any summary. Cannot be undone.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={onConfirm}
                className="w-full py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-[13px] font-medium hover:bg-rose-500/20 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={onCancel}
                className="w-full py-2.5 rounded-xl text-white/45 text-[13px] hover:text-white/85 transition-colors"
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
