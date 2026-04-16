'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Delete } from 'lucide-react'

interface DTMFModalProps {
  open: boolean
  onClose: () => void
  onSendDTMF: (digits: string) => void
}

const keys = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
]

export function DTMFModal({ open, onClose, onSendDTMF }: DTMFModalProps) {
  const [input, setInput] = useState('')

  useEffect(() => {
    if (!open) setInput('')
  }, [open])

  const handleKey = useCallback(
    (key: string) => {
      setInput((prev) => prev + key)
      onSendDTMF(key)
    },
    [onSendDTMF],
  )

  const handleBackspace = useCallback(() => {
    setInput((prev) => prev.slice(0, -1))
  }, [])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed z-[201] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] rounded-2xl border border-white/8 overflow-hidden shadow-2xl"
            style={{
              background: 'rgba(12, 18, 32, 0.95)',
              backdropFilter: 'blur(40px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h3 className="text-sm font-medium text-white/80">Dialpad</h3>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/6 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Display */}
            <div className="mx-5 mb-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/4 border border-white/6 min-h-[44px]">
              <span className="flex-1 text-lg font-mono text-white/90 tracking-widest truncate">
                {input || <span className="text-white/20">...</span>}
              </span>
              {input && (
                <button
                  onClick={handleBackspace}
                  className="shrink-0 text-white/40 hover:text-white/70 transition-colors"
                >
                  <Delete size={16} />
                </button>
              )}
            </div>

            {/* Keypad */}
            <div className="px-5 pb-5 grid grid-cols-3 gap-2">
              {keys.flat().map((key) => (
                <button
                  key={key}
                  onClick={() => handleKey(key)}
                  className="h-12 rounded-xl bg-white/4 border border-white/6 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white active:scale-95 transition-all"
                >
                  {key}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
