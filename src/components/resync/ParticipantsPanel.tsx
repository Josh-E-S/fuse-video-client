'use client'

import { motion } from 'framer-motion'
import { X, Users, MicOff, VideoOff, Share2 } from 'lucide-react'
import type { Participant } from '@/types/pexrtc'

import { useMediaQuery } from '@/hooks/useMediaQuery'

interface ParticipantsPanelProps {
  isOpen: boolean
  participants: Participant[]
  onClose: () => void
}

export function ParticipantsPanel({ isOpen, participants, onClose }: ParticipantsPanelProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

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
          <Users size={16} className="text-blue-400" />
          <h3 className="font-semibold text-sm">Participants</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50 font-mono">
            {participants.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <X size={16} className="text-white/60" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {participants.length === 0 ? (
          <div className="text-center text-white/30 mt-12">
            <Users className="mx-auto mb-3 opacity-40" size={28} />
            <p className="text-sm">No participants</p>
          </div>
        ) : (
          participants.map((p) => (
            <div
              key={p.uuid}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/4 transition-colors"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/8 flex items-center justify-center text-[11px] font-bold text-white/60 uppercase shrink-0">
                {p.display_name?.charAt(0) || '?'}
              </div>

              {/* Name + Role */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/80 truncate">{p.display_name}</div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider">
                  {p.role === 'chair' ? 'Host' : 'Participant'}
                </div>
              </div>

              {/* Status icons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {p.is_muted === 'YES' && <MicOff size={13} className="text-rose-400/60" />}
                {(p.is_video_muted === 'YES' || p.is_video_muted === 'true') && (
                  <VideoOff size={13} className="text-rose-400/60" />
                )}
                {p.is_presenting === 'YES' && <Share2 size={13} className="text-amber-400/60" />}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}
