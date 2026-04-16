'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, FileText } from 'lucide-react'
import type { TranscriptEntry } from '@/hooks/useTranscription'

import { useMediaQuery } from '@/hooks/useMediaQuery'

interface TranscriptPanelProps {
  isOpen: boolean
  transcripts: TranscriptEntry[]
  interimText: string | null
  interimSpeaker: string | undefined
  isConnected: boolean
  onClose: () => void
}

export function TranscriptPanel({
  isOpen,
  transcripts,
  interimText,
  interimSpeaker,
  isConnected,
  onClose,
}: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcripts, interimText])

  if (!isOpen) return null

  const variants = isDesktop
    ? {
        initial: { x: '100%', y: 0, opacity: 0 },
        animate: { x: 0, y: 0, opacity: 1 },
        exit: { x: '100%', y: 0, opacity: 0 },
      }
    : {
        initial: { x: 0, y: '100%', opacity: 0 },
        animate: { x: 0, y: 0, opacity: 1 },
        exit: { x: 0, y: '100%', opacity: 0 },
      }

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed bottom-0 left-0 w-full h-[85vh] rounded-t-[2.5rem] border-t \
                 md:bottom-auto md:left-auto md:top-0 md:right-0 md:h-full md:w-96 md:rounded-none md:border-t-0 md:border-l \
                 z-40 backdrop-blur-[120px] bg-black/80 border-white/8 flex flex-col shadow-2xl"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Mobile Drag Indicator */}
      <div className="md:hidden w-full flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <FileText size={16} className="text-emerald-400" />
          <h3 className="font-semibold text-sm">Transcript</h3>
          {isConnected && (
            <div className="flex items-center gap-1.5 ml-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] text-emerald-400 uppercase tracking-wider font-mono">
                Live
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <X size={16} className="text-white/60" />
        </button>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {transcripts.length === 0 && !interimText ? (
          <div className="text-center text-white/30 mt-12">
            <FileText className="mx-auto mb-3 opacity-40" size={28} />
            <p className="text-sm">No transcripts yet</p>
            <p className="text-xs mt-1 text-white/20">
              {isConnected
                ? 'Speak in the meeting to see captions'
                : 'Enable transcription to see captions'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {transcripts.map((entry) => {
              const time = new Date(entry.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
              return (
                <div
                  key={entry.id}
                  className="py-1.5 px-2 rounded-lg hover:bg-white/4 transition-colors"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-semibold text-blue-400 shrink-0">
                      {entry.speaker || 'Speaker'}
                    </span>
                    <span className="text-[9px] text-white/20 shrink-0 font-mono">{time}</span>
                    <span className="text-sm text-white/70">{entry.text}</span>
                  </div>
                </div>
              )
            })}

            {interimText && (
              <div className="py-1.5 px-2 rounded-lg bg-blue-500/5 border-l-2 border-blue-500/30">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-semibold text-blue-400/60 shrink-0">
                    {interimSpeaker || '...'}
                  </span>
                  <span className="text-sm text-white/40 italic">{interimText}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
