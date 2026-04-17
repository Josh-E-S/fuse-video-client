'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface SubtitleBarProps {
  interimText: string | null
  latestTranscript: { id: string; text: string } | null
  isTranscriptionConnected: boolean
  captionsVisible: boolean
}

export function SubtitleBar({
  interimText,
  latestTranscript,
  isTranscriptionConnected,
  captionsVisible,
}: SubtitleBarProps) {
  const hasContent = interimText || latestTranscript

  return (
    <AnimatePresence>
      {captionsVisible && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      className="shrink-0 overflow-hidden"
    >
    <div className="px-4 py-1.5">
      <div className="backdrop-blur-[120px] bg-black/60 border border-white/6 rounded-xl px-5 h-[68px] flex items-center overflow-hidden">
        <AnimatePresence mode="wait">
          {hasContent ? (
            <motion.div
              key={interimText ? 'interim' : latestTranscript?.id}
              animate={{ opacity: 1 }}
              className="w-full"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {interimText ? (
                <p className="text-[15px] leading-relaxed text-white/50 italic line-clamp-2">
                  {interimText}
                </p>
              ) : latestTranscript ? (
                <p className="text-[15px] leading-relaxed text-white/90 line-clamp-2">
                  {latestTranscript.text}
                </p>
              ) : null}
            </motion.div>
          ) : isTranscriptionConnected ? (
            <motion.div
              key="waiting"
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-xs text-white/35">Listening...</p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
    </motion.div>
      )}
    </AnimatePresence>
  )
}
