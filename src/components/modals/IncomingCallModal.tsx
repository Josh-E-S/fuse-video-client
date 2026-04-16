'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff, UserRound } from 'lucide-react'

interface IncomingCallModalProps {
  callerName: string
  conferenceAlias: string
  ringtone: string
  onAnswer: () => void
  onDecline: () => void
}

export function IncomingCallModal({
  callerName,
  conferenceAlias,
  ringtone,
  onAnswer,
  onDecline,
}: IncomingCallModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    let cancelled = false
    const audio = new Audio(`/${ringtone}`)
    audio.loop = true
    audio.volume = 0.6
    audioRef.current = audio

    audio.play().catch(() => {
      // Silently handle interruption from Strict Mode double-mount
    })

    return () => {
      cancelled = true
      audio.pause()
      audio.currentTime = 0
      audioRef.current = null
    }
  }, [ringtone])

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0, filter: 'blur(8px)' }}
        animate={{ scale: 1, y: 0, opacity: 1, filter: 'blur(0px)' }}
        exit={{ scale: 0.9, y: 20, opacity: 0, filter: 'blur(8px)' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="relative w-full max-w-sm rounded-2xl bg-white/4 border border-white/10 backdrop-blur-3xl shadow-2xl p-8 flex flex-col items-center gap-6"
      >
        {/* Pulsing avatar ring */}
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-emerald-500/20"
            style={{ margin: -8 }}
          />
          <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-emerald-500/60 flex items-center justify-center">
            <UserRound size={32} className="text-white/50" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-emerald-400 uppercase tracking-widest font-medium mb-2">
            Incoming Call
          </p>
          <h3 className="text-xl font-light text-white/90">{callerName}</h3>
          <p className="text-sm text-white/30 mt-1">{conferenceAlias}</p>
        </div>

        <div className="flex items-center gap-6 mt-2">
          <button
            onClick={() => {
              stopAudio()
              onDecline()
            }}
            className="w-16 h-16 rounded-full bg-rose-600 flex items-center justify-center text-white hover:bg-rose-500 transition-colors shadow-lg shadow-rose-600/30"
            title="Decline"
          >
            <PhoneOff size={22} />
          </button>

          <button
            onClick={() => {
              stopAudio()
              onAnswer()
            }}
            className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/30"
            title="Answer"
          >
            <Phone size={22} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
