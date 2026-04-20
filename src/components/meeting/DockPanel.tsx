'use client'

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Users,
  FileText,
  Send,
  MicOff,
  Mic,
  VideoOff,
  Video,
  Share2,
  PanelRightClose,
  PanelBottomClose,
} from 'lucide-react'
import type { ChatMessage, Participant } from '@/types/pexrtc'
import type { TranscriptEntry } from '@/hooks/useTranscription'

export type DockTab = 'chat' | 'people' | 'transcript'
export type DockMode = 'bottom' | 'side'

interface DockPanelProps {
  activeTab: DockTab
  mode: DockMode
  onTabChange: (tab: DockTab) => void
  onClose: () => void
  onToggleMode: () => void

  chatMessages: ChatMessage[]
  participants: Participant[]
  message: string
  onMessageChange: (value: string) => void
  onSend: () => void

  transcripts: TranscriptEntry[]
  interimText: string | null
  interimSpeaker: string | undefined
  isTranscriptionConnected: boolean
}

const tabs: { id: DockTab; label: string }[] = [
  { id: 'transcript', label: 'Transcript' },
  { id: 'people', label: 'People' },
  { id: 'chat', label: 'Chat' },
]

const tabContentVariants = {
  enter: { opacity: 0, y: 6 },
  active: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

export function DockPanel({
  activeTab,
  mode,
  onTabChange,
  onClose,
  onToggleMode,
  chatMessages,
  participants,
  message,
  onMessageChange,
  onSend,
  transcripts,
  interimText,
  interimSpeaker,
  isTranscriptionConnected,
}: DockPanelProps) {
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const transcriptScrollRef = useRef<HTMLDivElement>(null)
  const isBottom = mode === 'bottom'

  useEffect(() => {
    if (activeTab === 'chat' && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages, activeTab])

  useEffect(() => {
    if (activeTab === 'transcript' && transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight
    }
  }, [transcripts, interimText, activeTab])

  function resolveName(uuid: string, origin: string) {
    if (uuid === 'self') return 'You'
    const p = participants.find((x) => x.uuid === uuid)
    return p?.display_name || origin || 'Unknown'
  }

  const tabBar = (
    <div className="shrink-0 flex items-center gap-1 px-3 pt-3 pb-0">
      <div className="flex gap-1 flex-1">
        {tabs.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-2 text-center text-[12px] font-medium tracking-[0.03em] rounded-xl transition-all duration-200 relative ${
                active
                  ? 'text-white bg-white/10'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {tab.label}
              {tab.id === 'people' && participants.length > 0 && (
                <span className="ml-1 opacity-50">({participants.length})</span>
              )}
              {tab.id === 'chat' && chatMessages.length > 0 && !active && (
                <span className="absolute top-1.5 right-[calc(50%-28px)] w-[6px] h-[6px] rounded-full bg-blue-400" />
              )}
            </button>
          )
        })}
      </div>
      <button
        onClick={onToggleMode}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/6 transition-colors"
        title={isBottom ? 'Switch to side panel' : 'Switch to bottom panel'}
      >
        {isBottom ? <PanelRightClose size={14} /> : <PanelBottomClose size={14} />}
      </button>
    </div>
  )

  const tabContent = (
    <div className="flex-1 min-h-0 relative">
      <AnimatePresence mode="wait">
        {activeTab === 'chat' && (
          <motion.div
            key="chat"
            variants={tabContentVariants}
            initial="enter"
            animate="active"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-0 flex flex-col"
          >
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/25">
                  <MessageSquare size={20} className="mb-2 opacity-40" />
                  <p className="text-xs">No messages yet</p>
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
                    <div key={i} className="flex gap-2.5 animate-[fadeInUp_0.3s_ease-out]">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-semibold text-white shrink-0 ${
                          isMe
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                            : 'bg-gradient-to-br from-blue-500 to-violet-500'
                        }`}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-white/60 mb-0.5">
                          {name}
                          {time && (
                            <span className="font-normal text-white/30 ml-1.5 text-[10px]">
                              {time}
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] leading-[1.45] text-white/90">{msg.payload}</div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="shrink-0 px-4 pb-3 pt-2 border-t border-white/6">
              <div className="flex items-center gap-2">
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
                  className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-[13px] text-white placeholder-white/30 outline-none transition-colors focus:border-blue-400/40"
                />
                <button
                  onClick={onSend}
                  disabled={!message.trim()}
                  className="w-[34px] h-[34px] rounded-xl flex items-center justify-center bg-blue-500 text-white hover:bg-blue-400 transition-colors disabled:opacity-30 shrink-0"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'people' && (
          <motion.div
            key="people"
            variants={tabContentVariants}
            initial="enter"
            animate="active"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-0 overflow-y-auto px-4 py-3"
          >
            {participants.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/25">
                <Users size={20} className="mb-2 opacity-40" />
                <p className="text-xs">No participants</p>
              </div>
            ) : (
              participants.map((p) => {
                const name = p.display_name || p.uri || 'Unknown'
                const initial = name.charAt(0).toUpperCase()
                const muted = p.is_muted === 'YES' || p.is_client_muted === true
                const videoMuted = p.is_video_muted === true || p.is_video_muted === 'YES'
                const presenting = p.is_presenting === 'YES'
                const roleLabel = p.role === 'chair' ? 'Host' : p.protocol || 'Participant'
                return (
                <div
                  key={p.uuid}
                  className="flex items-center gap-3 py-2.5 border-b border-white/4 last:border-b-0"
                >
                  <div className="w-[34px] h-[34px] rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-[13px] font-semibold text-white shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-white/90 truncate leading-tight">
                      {name}
                    </div>
                    <div className="text-[11px] text-white/35">
                      {roleLabel}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {muted ? (
                      <MicOff size={16} className="text-rose-400/60" />
                    ) : (
                      <Mic size={16} className="text-white/45" />
                    )}
                    {videoMuted ? (
                      <VideoOff size={16} className="text-rose-400/60" />
                    ) : (
                      <Video size={16} className="text-white/45" />
                    )}
                    {presenting && (
                      <Share2 size={16} className="text-amber-400/60" />
                    )}
                  </div>
                </div>
                )
              })
            )}
          </motion.div>
        )}

        {activeTab === 'transcript' && (
          <motion.div
            key="transcript"
            variants={tabContentVariants}
            initial="enter"
            animate="active"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-0 overflow-y-auto px-4 py-3"
            ref={transcriptScrollRef}
          >
            {transcripts.length === 0 && !interimText ? (
              <div className="flex flex-col items-center justify-center h-full text-white/25">
                <FileText size={20} className="mb-2 opacity-40" />
                <p className="text-xs">No transcripts yet</p>
                <p className="text-[10px] mt-1 text-white/20">
                  {isTranscriptionConnected
                    ? 'Speak to see captions'
                    : 'Enable transcription first'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {transcripts.map((entry) => {
                  const time = new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  return (
                    <div key={entry.id} className="animate-[fadeInUp_0.3s_ease-out]">
                      <div className="text-[11px] font-semibold text-blue-400 mb-0.5">
                        {entry.speaker || 'Speaker'}
                      </div>
                      <div className="text-[13px] leading-[1.5] text-white/90">{entry.text}</div>
                      <div className="text-[10px] text-white/25 mt-0.5">{time}</div>
                    </div>
                  )
                })}

                {interimText && (
                  <div>
                    <div className="text-[11px] font-semibold text-amber-400/60 mb-0.5">
                      {interimSpeaker || '...'}
                    </div>
                    <div className="text-[13px] leading-[1.5] text-white/40 italic">
                      {interimText}
                    </div>
                    <div className="text-[10px] text-white/20 mt-0.5">live</div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  // Side mode: outer wrapper animates width, inner panel floats with Gemini-style inset
  if (!isBottom) {
    return (
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 336, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="shrink-0 self-stretch overflow-hidden"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div
          className="flex flex-col w-[320px] ml-2 h-full rounded-2xl border border-white/8 overflow-hidden"
          style={{
            background: 'rgba(var(--theme-surface-base), 0.95)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {tabBar}
          {tabContent}
        </div>
      </motion.div>
    )
  }

  // Bottom mode: slides up from below
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 300, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="shrink-0 flex flex-col rounded-t-2xl border-t border-x border-white/8 overflow-hidden"
      style={{
        background: 'rgba(var(--theme-surface-base), 0.95)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {tabBar}
      {tabContent}
    </motion.div>
  )
}
