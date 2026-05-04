'use client'

import { useRef, useEffect, useState } from 'react'
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
  Play,
  Square,
  NotebookText,
  ArrowLeft,
  Trash2,
} from 'lucide-react'
import type { ChatMessage, Participant } from '@/types/pexrtc'
import type { TranscriptEntry } from '@/hooks/useTranscription'
import { useSummarizer } from '@/hooks/useSummarizer'
import {
  composeSavedMarkdown,
  defaultSummaryFilename,
  gateReason,
} from '@/utils/summaryMarkdown'
import { defaultScribeFilename, formatScribeMarkdown } from '@/utils/scribeMarkdown'
import { MicVisualizer } from '@/components/scribe/MicVisualizer'
import { ScribeSaveModal } from '@/components/scribe/ScribeSaveModal'
import { ClearConfirmModal } from '@/components/scribe/ClearConfirmModal'
import { SummaryMarkdown } from '@/components/scribe/SummaryMarkdown'

export type DockTab = 'chat' | 'people' | 'transcript'

interface DockPanelProps {
  activeTab: DockTab
  onTabChange: (tab: DockTab) => void
  onClose: () => void

  chatMessages: ChatMessage[]
  participants: Participant[]
  message: string
  onMessageChange: (value: string) => void
  onSend: () => void

  transcripts: TranscriptEntry[]
  interimText: string | null
  interimSpeaker: string | undefined
  isTranscriptionConnected: boolean
  transcriptionEnabled?: boolean
  onToggleTranscription?: () => void
  onDisableTranscription?: () => void
  onClearTranscripts?: () => void

  // External request to open the save modal — increments each time
  // the parent wants the dock to prompt the user to save before stopping.
  stopRequestToken?: number

  localStream?: MediaStream | null
  remoteStream?: MediaStream | null
  audioVisualizerEnabled?: boolean
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
  onTabChange,
  onClose,
  chatMessages,
  participants,
  message,
  onMessageChange,
  onSend,
  transcripts,
  interimText,
  interimSpeaker,
  isTranscriptionConnected,
  transcriptionEnabled,
  onToggleTranscription,
  onDisableTranscription,
  onClearTranscripts,
  stopRequestToken,
  localStream,
  remoteStream,
  audioVisualizerEnabled = true,
}: DockPanelProps) {
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const transcriptScrollRef = useRef<HTMLDivElement>(null)
  const isAtChatBottomRef = useRef(true)
  const isAtTranscriptBottomRef = useRef(true)
  const summarizer = useSummarizer()
  const [view, setView] = useState<'transcript' | 'summary'>('transcript')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveModalIntent, setSaveModalIntent] = useState<'stop' | 'close'>('stop')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [includeFullTranscript, setIncludeFullTranscript] = useState(true)
  const [generateSummary, setGenerateSummary] = useState(true)
  const [handleVisible, setHandleVisible] = useState(true)
  const handleHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transcriptGate = gateReason(transcripts)

  // Auto-hide collapse handle: matches the side pill — fades after 2s of idle,
  // returns on any mouse move.
  useEffect(() => {
    const scheduleHide = () => {
      if (handleHideTimerRef.current) clearTimeout(handleHideTimerRef.current)
      handleHideTimerRef.current = setTimeout(() => setHandleVisible(false), 2000)
    }
    const handleMove = () => {
      setHandleVisible(true)
      scheduleHide()
    }
    scheduleHide()
    window.addEventListener('mousemove', handleMove)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      if (handleHideTimerRef.current) clearTimeout(handleHideTimerRef.current)
    }
  }, [])

  const handleClearConfirm = () => {
    onClearTranscripts?.()
    summarizer.clear()
    setView('transcript')
    setShowClearConfirm(false)
  }

  const handleChatScroll = () => {
    const el = chatScrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isAtChatBottomRef.current = distanceFromBottom < 50
  }

  const handleTranscriptScroll = () => {
    const el = transcriptScrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isAtTranscriptBottomRef.current = distanceFromBottom < 50
  }

  useEffect(() => {
    if (summarizer.status === 'done' && summarizer.summary) {
      setView('summary')
    }
  }, [summarizer.status, summarizer.summary])

  // External stop request from the toolbar — open the save modal so the
  // user can save/discard before transcription is actually stopped.
  useEffect(() => {
    if (stopRequestToken === undefined || stopRequestToken === 0) return
    setSaveModalIntent('stop')
    setShowSaveModal(true)
  }, [stopRequestToken])

  const writeMarkdown = (md: string, filename: string) => {
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const openSaveModal = (intent: 'stop' | 'close') => {
    // Stop transcription up-front so audio capture halts while the user
    // decides what to do with the transcript.
    if (transcriptionEnabled && onDisableTranscription) onDisableTranscription()
    setSaveModalIntent(intent)
    setShowSaveModal(true)
  }

  const handleSave = async () => {
    const startedAt = new Date()
    const wantSummary = generateSummary && summarizer.available && !transcriptGate

    let summaryText = summarizer.summary
    if (wantSummary && !summaryText) {
      const result = await summarizer.run(transcripts)
      summaryText = result ?? null
    }

    if (summaryText) {
      const md = composeSavedMarkdown({
        summary: summaryText,
        transcripts,
        startedAt,
        includeFullTranscript,
      })
      writeMarkdown(md, defaultSummaryFilename(startedAt))
    } else {
      const md = formatScribeMarkdown(transcripts, startedAt)
      writeMarkdown(md, defaultScribeFilename(startedAt))
    }

    if (saveModalIntent === 'close') {
      summarizer.clear()
      setView('transcript')
      setShowSaveModal(false)
      onClose()
    } else {
      setShowSaveModal(false)
    }
  }

  const handleDiscard = () => {
    summarizer.clear()
    setView('transcript')
    setShowSaveModal(false)
    if (saveModalIntent === 'close') onClose()
  }

  useEffect(() => {
    if (activeTab !== 'chat' || !chatScrollRef.current) return
    if (!isAtChatBottomRef.current) return
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
  }, [chatMessages, activeTab])

  useEffect(() => {
    if (activeTab !== 'transcript' || !transcriptScrollRef.current) return
    if (!isAtTranscriptBottomRef.current) return
    transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight
  }, [transcripts, interimText, activeTab])

  useEffect(() => {
    if (activeTab === 'chat') {
      isAtChatBottomRef.current = true
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
      }
    } else if (activeTab === 'transcript') {
      isAtTranscriptBottomRef.current = true
      if (transcriptScrollRef.current) {
        transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight
      }
    }
  }, [activeTab])

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
            <div
              ref={chatScrollRef}
              onScroll={handleChatScroll}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5"
            >
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
                        <div className="text-[13px] leading-[1.45] text-white/90">
                          {msg.payload}
                        </div>
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
                      <div className="text-[11px] text-white/35">{roleLabel}</div>
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
                      {presenting && <Share2 size={16} className="text-amber-400/60" />}
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
            className="absolute inset-0 flex flex-col"
          >
            {view === 'summary' && summarizer.summary ? (
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <button
                  type="button"
                  onClick={() => setView('transcript')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-3 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-white/60 hover:bg-white/10 hover:text-white/85 transition-colors"
                >
                  <ArrowLeft size={11} />
                  Back to transcript
                </button>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-violet-400/15 border border-violet-400/30 flex items-center justify-center shrink-0">
                    <NotebookText size={12} className="text-violet-200" />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-white/90 leading-none">
                      Meeting Summary
                    </div>
                    <div className="text-[10px] text-white/35 mt-0.5">
                      {transcripts.length} lines
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-violet-400/10 via-violet-400/5 to-transparent border border-violet-400/20">
                  <SummaryMarkdown markdown={summarizer.summary} />
                </div>
              </div>
            ) : (
              <div
                ref={transcriptScrollRef}
                onScroll={handleTranscriptScroll}
                className="flex-1 overflow-y-auto px-4 py-3"
              >
                {summarizer.status === 'error' && summarizer.error && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/25 text-[12px] text-rose-300">
                    {summarizer.error}{' '}
                    <button
                      onClick={() => summarizer.run(transcripts)}
                      className="underline underline-offset-2 hover:text-rose-200"
                    >
                      Try again
                    </button>
                  </div>
                )}
                {summarizer.summary && (
                  <button
                    type="button"
                    onClick={() => setView('summary')}
                    className="w-full mb-3 px-3 py-2 rounded-xl bg-violet-400/8 border border-violet-400/20 hover:bg-violet-400/12 transition-colors flex items-center gap-2 text-left"
                  >
                    <div className="w-6 h-6 rounded-md bg-violet-400/15 border border-violet-400/25 flex items-center justify-center shrink-0">
                      <NotebookText size={11} className="text-violet-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-violet-100">
                        View summary
                      </div>
                      <div className="text-[10px] text-violet-200/50 mt-0.5">
                        Tap for generated notes
                      </div>
                    </div>
                    <ArrowLeft size={11} className="text-violet-200/60 rotate-180" />
                  </button>
                )}
                {transcripts.length === 0 && !interimText ? (
                  <div className="flex flex-col items-center justify-center h-full text-white/25">
                    <FileText size={20} className="mb-2 opacity-40" />
                    <p className="text-xs">No transcripts yet</p>
                    <p className="text-[10px] mt-1 text-white/20">
                      {isTranscriptionConnected
                        ? 'Speak to see captions'
                        : transcriptionEnabled
                          ? 'Connecting…'
                          : 'Start transcription below'}
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
                          <div className="text-[13px] leading-[1.5] text-white/90">
                            {entry.text}
                          </div>
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
              </div>
            )}

            {onToggleTranscription && (
              <div className="shrink-0 px-4 pb-3 pt-2 border-t border-white/6 flex flex-col gap-2.5">
                {audioVisualizerEnabled && (
                  <MicVisualizer
                    stream={localStream ?? null}
                    remoteStream={remoteStream ?? null}
                    active={Boolean(transcriptionEnabled && isTranscriptionConnected)}
                  />
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (transcriptionEnabled) {
                        openSaveModal('stop')
                      } else {
                        onToggleTranscription()
                      }
                    }}
                    className={`flex-1 h-9 rounded-xl flex items-center justify-center gap-2 text-[13px] font-medium border transition-colors ${
                      transcriptionEnabled
                        ? 'bg-rose-500/10 border-rose-500/25 text-rose-300 hover:bg-rose-500/15'
                        : 'bg-emerald-400/10 border-emerald-400/25 text-emerald-300 hover:bg-emerald-400/15'
                    }`}
                  >
                    {transcriptionEnabled ? (
                      <>
                        <Square size={12} fill="currentColor" />
                        Stop transcription
                      </>
                    ) : (
                      <>
                        <Play size={12} fill="currentColor" />
                        Start transcription
                      </>
                    )}
                  </button>
                  {onClearTranscripts && transcripts.length > 0 && (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white/45 hover:text-rose-300 border border-white/10 hover:border-rose-500/25 hover:bg-rose-500/10 transition-colors"
                      title="Clear transcript"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            )}

            <ScribeSaveModal
              open={showSaveModal}
              intent={saveModalIntent}
              hasContent={transcripts.length > 0}
              summarizerAvailable={summarizer.available}
              summarizerStatus={summarizer.status}
              summarizerElapsed={summarizer.elapsedSeconds}
              hasSummary={Boolean(summarizer.summary)}
              gateReason={transcriptGate}
              generateSummary={generateSummary}
              includeFullTranscript={includeFullTranscript}
              onGenerateSummaryChange={setGenerateSummary}
              onIncludeFullTranscriptChange={setIncludeFullTranscript}
              onSave={handleSave}
              onDiscard={handleDiscard}
              onCancel={() => setShowSaveModal(false)}
            />

            <ClearConfirmModal
              open={showClearConfirm}
              onConfirm={handleClearConfirm}
              onCancel={() => setShowClearConfirm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  // Side mode: outer wrapper animates width, inner panel floats with Gemini-style inset
  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 336, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="shrink-0 self-stretch overflow-hidden relative"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <button
        onClick={onClose}
        title="Collapse panel"
        className={`absolute top-1/2 left-3 -translate-y-1/2 z-10 w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/85 bg-black/30 hover:bg-black/65 border border-white/8 hover:border-white/20 backdrop-blur-md transition-all duration-200 ${
          handleVisible ? 'opacity-100' : 'opacity-0 hover:opacity-100'
        }`}
      >
        <PanelRightClose size={14} />
      </button>
      <div
        className="flex flex-col w-[320px] ml-2 h-full rounded-2xl border border-white/8 overflow-hidden"
        style={{
          background: 'rgba(var(--theme-surface-base), 0.55)',
          backdropFilter: 'blur(60px)',
          WebkitBackdropFilter: 'blur(60px)',
        }}
      >
        {tabBar}
        {tabContent}
      </div>
    </motion.div>
  )
}
