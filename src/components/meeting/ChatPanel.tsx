'use client'

import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, MessageSquare, Send } from 'lucide-react'
import type { ChatMessage, Participant } from '@/types/pexrtc'

import { useMediaQuery } from '@/hooks/useMediaQuery'

interface ChatPanelProps {
  isOpen: boolean
  chatMessages: ChatMessage[]
  participants: Participant[]
  message: string
  onMessageChange: (value: string) => void
  onSend: () => void
  onClose: () => void
}

export function ChatPanel({
  isOpen,
  chatMessages,
  participants,
  message,
  onMessageChange,
  onSend,
  onClose,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages])

  if (!isOpen) return null

  function resolveName(uuid: string, origin: string) {
    if (uuid === 'self') return 'You'
    const p = participants.find((x) => x.uuid === uuid)
    return p?.display_name || origin || 'Unknown'
  }

  // Mobile slides up from bottom, Desktop slides left from right edge
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
          <MessageSquare size={16} className="text-blue-400" />
          <h3 className="font-semibold text-sm">Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <X size={16} className="text-white/60" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {chatMessages.length === 0 ? (
          <div className="text-center text-white/30 mt-12">
            <MessageSquare className="mx-auto mb-3 opacity-40" size={28} />
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          chatMessages.map((msg, i) => {
            const isMe = msg.uuid === 'self'
            const name = resolveName(msg.uuid, msg.origin)
            const time = msg.timestamp
              ? new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''
            return (
              <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                    {name}
                  </span>
                  {time && <span className="text-[9px] text-white/20">{time}</span>}
                </div>
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-blue-500/15 border border-blue-500/20 text-blue-100'
                      : 'bg-white/6 border border-white/8 text-white/80'
                  }`}
                >
                  {msg.payload}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-white/8">
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/6 border border-white/8">
          <input
            type="text"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSend()
              }
            }}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
          />
          <button
            onClick={onSend}
            disabled={!message.trim()}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-30"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
