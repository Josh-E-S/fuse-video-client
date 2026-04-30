'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Square, NotebookPen, AlertCircle, NotebookText, ArrowLeft, Trash2 } from 'lucide-react'
import { useScribe } from '@/hooks/useScribe'
import { useSettings } from '@/hooks/useSettings'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { useSummarizer } from '@/hooks/useSummarizer'
import { TranscriptionConsentModal } from '@/components/modals/TranscriptionConsentModal'
import { MicVisualizer } from '@/components/scribe/MicVisualizer'
import { ScribeSaveModal } from '@/components/scribe/ScribeSaveModal'
import { ClearConfirmModal } from '@/components/scribe/ClearConfirmModal'
import { SummaryMarkdown } from '@/components/scribe/SummaryMarkdown'
import { defaultScribeFilename, formatScribeMarkdown } from '@/utils/scribeMarkdown'
import { composeSavedMarkdown, defaultSummaryFilename, gateReason } from '@/utils/summaryMarkdown'

interface ScribeOverlayProps {
  open: boolean
  onClose: () => void
}

export function ScribeOverlay({ open, onClose }: ScribeOverlayProps) {
  const { settings } = useSettings()
  const scribe = useScribe(settings.audioInput || undefined)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveModalIntent, setSaveModalIntent] = useState<'stop' | 'close'>('stop')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const summarizer = useSummarizer()
  const [includeFullTranscript, setIncludeFullTranscript] = useState(true)
  const [generateSummary, setGenerateSummary] = useState(true)
  const [view, setView] = useState<'transcript' | 'summary'>('transcript')
  const bodyScrollRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  const isRecording = scribe.status === 'recording' || scribe.status === 'starting'
  const hasContent = scribe.transcripts.length > 0
  const transcriptGate = gateReason(scribe.transcripts)

  const handleBodyScroll = () => {
    const el = bodyScrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isAtBottomRef.current = distanceFromBottom < 50
  }

  useEffect(() => {
    if (!bodyScrollRef.current) return
    if (!isAtBottomRef.current) return
    bodyScrollRef.current.scrollTop = bodyScrollRef.current.scrollHeight
  }, [scribe.transcripts, scribe.interimText])

  useEffect(() => {
    if (summarizer.status === 'done' && summarizer.summary) {
      setView('summary')
    }
  }, [summarizer.status, summarizer.summary])

  const handleStartScribing = () => {
    setShowConsent(true)
  }

  const confirmStartScribing = () => {
    setShowConsent(false)
    summarizer.clear()
    setView('transcript')
    scribe.start()
  }

  const openSaveModal = async (intent: 'stop' | 'close') => {
    if (isRecording) await scribe.stop()
    setSaveModalIntent(intent)
    setShowSaveModal(true)
  }

  const handleAttemptClose = () => {
    if (isRecording || hasContent) {
      openSaveModal('close')
    } else {
      onClose()
    }
  }

  useEscapeKey(handleAttemptClose, open && !showSaveModal)

  const resetSession = () => {
    scribe.clear()
    summarizer.clear()
    setView('transcript')
  }

  const closeAndReset = () => {
    resetSession()
    setShowSaveModal(false)
    onClose()
  }

  const handleClearConfirm = () => {
    resetSession()
    setShowClearConfirm(false)
  }

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

  const handleSave = async () => {
    const startedAt = scribe.startedAt ?? new Date()
    const wantSummary = generateSummary && summarizer.available && !transcriptGate

    let summaryText = summarizer.summary
    if (wantSummary && !summaryText) {
      const result = await summarizer.run(scribe.transcripts)
      summaryText = result ?? null
    }

    if (summaryText) {
      const md = composeSavedMarkdown({
        summary: summaryText,
        transcripts: scribe.transcripts,
        startedAt,
        includeFullTranscript,
      })
      writeMarkdown(md, defaultSummaryFilename(startedAt))
    } else {
      const md = formatScribeMarkdown(scribe.transcripts, startedAt)
      writeMarkdown(md, defaultScribeFilename(startedAt))
    }

    if (saveModalIntent === 'close') {
      closeAndReset()
    } else {
      // Stay in scribe so the user can see the summary view; reset only on
      // explicit exit (X) or when they start a new session.
      setShowSaveModal(false)
    }
  }

  const handleDiscard = () => {
    if (saveModalIntent === 'close') {
      closeAndReset()
    } else {
      resetSession()
      setShowSaveModal(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex flex-col"
          style={{
            background: 'rgba(var(--theme-surface-base), 0.55)',
            backdropFilter: 'blur(60px)',
            WebkitBackdropFilter: 'blur(60px)',
          } as React.CSSProperties}
        >
          <div
            className="shrink-0 flex items-center justify-between px-5 pt-12 pb-4"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          >
            <div
              className="flex items-center gap-2.5"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <div className="w-8 h-8 rounded-lg bg-white/6 border border-white/8 flex items-center justify-center">
                <NotebookPen size={15} className="text-white/55" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-white/85 leading-none">
                  Scribe Mode
                </div>
                <div className="text-[10px] text-white/35 mt-0.5">Local · on this device</div>
              </div>
            </div>
            <button
              onClick={handleAttemptClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/6 transition-colors"
              title="Close"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <X size={15} />
            </button>
          </div>

          {view === 'summary' && summarizer.summary ? (
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
              <div className="max-w-[640px] mx-auto">
                <button
                  type="button"
                  onClick={() => setView('transcript')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-5 rounded-full bg-white/5 border border-white/10 text-[12px] font-medium text-white/60 hover:bg-white/10 hover:text-white/85 transition-colors"
                >
                  <ArrowLeft size={12} />
                  Back to transcript
                </button>

                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-violet-400/15 border border-violet-400/30 flex items-center justify-center">
                    <NotebookText size={14} className="text-violet-200" />
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-white/90 leading-none">
                      Scribe Summary
                    </div>
                    <div className="text-[11px] text-white/35 mt-1">
                      Generated locally · {scribe.transcripts.length} transcript lines
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-400/10 via-violet-400/5 to-transparent border border-violet-400/20">
                  <SummaryMarkdown markdown={summarizer.summary} />
                </div>
              </div>
            </div>
          ) : (
          <div
            ref={bodyScrollRef}
            onScroll={handleBodyScroll}
            className="flex-1 min-h-0 overflow-y-auto px-6 py-3"
          >
            {scribe.status === 'error' && scribe.error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
                <AlertCircle size={16} className="text-rose-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-rose-300">{scribe.error}</div>
                  <button
                    onClick={() => scribe.start()}
                    className="text-[12px] text-rose-300/80 hover:text-rose-200 mt-1 underline underline-offset-2"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {summarizer.status === 'error' && summarizer.error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
                <AlertCircle size={16} className="text-rose-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-rose-300">{summarizer.error}</div>
                  <button
                    onClick={() => summarizer.run(scribe.transcripts)}
                    className="text-[12px] text-rose-300/80 hover:text-rose-200 mt-1 underline underline-offset-2"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {summarizer.summary && (
              <button
                type="button"
                onClick={() => setView('summary')}
                className="w-full mb-4 px-4 py-3 rounded-xl bg-violet-400/8 border border-violet-400/20 hover:bg-violet-400/12 transition-colors flex items-center gap-3 text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-violet-400/15 border border-violet-400/25 flex items-center justify-center shrink-0">
                  <NotebookText size={13} className="text-violet-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-violet-100">View summary</div>
                  <div className="text-[11px] text-violet-200/50 mt-0.5">
                    Tap to see your generated meeting notes
                  </div>
                </div>
                <ArrowLeft size={13} className="text-violet-200/60 rotate-180" />
              </button>
            )}

            {!hasContent && scribe.status === 'idle' ? (
              <div className="h-full flex flex-col items-center justify-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                  <NotebookPen size={24} className="text-white/40" strokeWidth={1.5} />
                </div>
                <div className="text-center px-6">
                  <h3 className="text-[15px] font-semibold text-white/85">Ready to scribe</h3>
                  <p className="text-[12px] text-white/40 mt-1 leading-relaxed">
                    Captures your microphone and transcribes locally on this device.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={handleStartScribing}
                    className="flex items-center justify-center gap-2 px-6 h-11 rounded-xl bg-emerald-400/10 border border-emerald-400/25 text-emerald-300 hover:bg-emerald-400/15 text-[14px] font-medium transition-colors"
                  >
                    <Play size={14} fill="currentColor" />
                    Start scribing
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 h-8 rounded-lg text-[12px] text-white/45 hover:text-white/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : !hasContent && scribe.status !== 'error' ? (
              <div className="h-full flex flex-col items-center justify-center text-white/30 gap-3">
                {scribe.status === 'starting' && (
                  <div className="w-9 h-9 border-[3px] border-white/10 border-t-white/60 rounded-full animate-spin" />
                )}
                {scribe.status === 'recording' && (
                  <div className="w-9 h-9 border-[3px] border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
                )}
                <p className="text-sm">
                  {scribe.status === 'starting' ? 'Starting…' : 'Listening…'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {scribe.transcripts.map((entry) => {
                  const time = new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                  return (
                    <div key={entry.id} className="animate-[fadeInUp_0.3s_ease-out]">
                      <div className="text-[10px] font-semibold text-white/30 mb-0.5 tracking-wide">
                        {time}
                      </div>
                      <div className="text-[14px] leading-[1.5] text-white/90">{entry.text}</div>
                    </div>
                  )
                })}
                {scribe.interimText && (
                  <div className="text-[14px] leading-[1.5] text-white/40 italic">
                    {scribe.interimText}
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {!(scribe.status === 'idle' && !hasContent) && (
            <div className="shrink-0 px-5 pb-5 pt-3 border-t border-white/6 flex flex-col gap-3">
              {settings.audioVisualizerEnabled && (
                <MicVisualizer stream={scribe.micStream} active={isRecording} />
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isRecording) {
                      openSaveModal('stop')
                    } else {
                      handleStartScribing()
                    }
                  }}
                  disabled={scribe.status === 'starting' || scribe.status === 'stopping'}
                  className={`flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-[13px] font-semibold border transition-colors disabled:opacity-50 ${
                    isRecording
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-200 hover:bg-rose-500/20'
                      : 'bg-emerald-400/15 border-emerald-400/30 text-emerald-200 hover:bg-emerald-400/20'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square size={13} fill="currentColor" />
                      Stop scribing
                    </>
                  ) : (
                    <>
                      <Play size={13} fill="currentColor" />
                      Start scribing
                    </>
                  )}
                </button>
                {hasContent && (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-white/45 hover:text-rose-300 border border-white/10 hover:border-rose-500/25 hover:bg-rose-500/10 transition-colors"
                    title="Clear transcript"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          <TranscriptionConsentModal
            open={showConsent}
            onConfirm={confirmStartScribing}
            onCancel={() => setShowConsent(false)}
          />

          <ScribeSaveModal
            open={showSaveModal}
            intent={saveModalIntent}
            hasContent={hasContent}
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
  )
}
