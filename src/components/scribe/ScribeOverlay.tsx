'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Square, Save, NotebookPen, AlertCircle, Sparkles } from 'lucide-react'
import { useScribe } from '@/hooks/useScribe'
import { useSettings } from '@/hooks/useSettings'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { useSummarizer } from '@/hooks/useSummarizer'
import { defaultScribeFilename, formatScribeMarkdown } from '@/utils/scribeMarkdown'
import { composeSavedMarkdown, defaultSummaryFilename, gateReason } from '@/utils/summaryMarkdown'

interface ScribeOverlayProps {
  open: boolean
  onClose: () => void
}

export function ScribeOverlay({ open, onClose }: ScribeOverlayProps) {
  const { settings } = useSettings()
  const scribe = useScribe(settings.audioInput || undefined)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const summarizer = useSummarizer()
  const [includeFullTranscript, setIncludeFullTranscript] = useState(true)

  const isRecording = scribe.status === 'recording' || scribe.status === 'starting'
  const hasContent = scribe.transcripts.length > 0

  const handleAttemptClose = () => {
    if (isRecording || hasContent) {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }

  useEscapeKey(handleAttemptClose, open && !showCloseConfirm)

  const handleConfirmClose = async () => {
    if (isRecording) await scribe.stop()
    scribe.clear()
    summarizer.clear()
    setShowCloseConfirm(false)
    onClose()
  }

  const handleSave = () => {
    const startedAt = scribe.startedAt ?? new Date()

    if (summarizer.summary) {
      const md = composeSavedMarkdown({
        summary: summarizer.summary,
        transcripts: scribe.transcripts,
        startedAt,
        includeFullTranscript,
      })
      const blob = new Blob([md], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = defaultSummaryFilename(startedAt)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return
    }

    const md = formatScribeMarkdown(scribe.transcripts, startedAt)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = defaultScribeFilename(startedAt)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >
          <div className="shrink-0 flex items-center justify-between px-5 pt-12 pb-4">
            <div className="flex items-center gap-2.5">
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
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-3">
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
              <div className="mb-4 p-4 rounded-2xl bg-violet-400/8 border border-violet-400/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-violet-300" />
                    <span className="text-[11px] font-semibold tracking-wide uppercase text-violet-200/80">
                      Summary
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={summarizer.clear}
                    className="px-2 py-1 rounded-md text-[11px] font-medium text-violet-200/80 hover:text-violet-100 hover:bg-violet-400/15 transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <pre className="whitespace-pre-wrap text-[13px] leading-[1.55] text-white/90 font-sans">
                  {summarizer.summary}
                </pre>
              </div>
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
                    onClick={scribe.start}
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

          {!(scribe.status === 'idle' && !hasContent) && (
            <div className="shrink-0 px-5 pb-5 pt-3 border-t border-white/6 flex flex-col gap-2">
              {summarizer.summary && (
                <label className="flex items-center gap-2 text-[12px] text-white/55 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeFullTranscript}
                    onChange={(e) => setIncludeFullTranscript(e.target.checked)}
                    className="accent-violet-400"
                  />
                  Include full transcript when saving
                </label>
              )}
              <div className="flex gap-2">
                <button
                  onClick={isRecording ? scribe.stop : scribe.start}
                  disabled={scribe.status === 'starting' || scribe.status === 'stopping'}
                  className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-[13px] font-medium border transition-colors disabled:opacity-50 ${
                    isRecording
                      ? 'bg-rose-500/10 border-rose-500/25 text-rose-300 hover:bg-rose-500/15'
                      : 'bg-emerald-400/10 border-emerald-400/25 text-emerald-300 hover:bg-emerald-400/15'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square size={12} fill="currentColor" />
                      Stop scribing
                    </>
                  ) : (
                    <>
                      <Play size={12} fill="currentColor" />
                      Start scribing
                    </>
                  )}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasContent}
                  className="px-4 h-10 rounded-xl flex items-center justify-center gap-2 text-[13px] font-medium border bg-white/5 border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Save as markdown"
                >
                  <Save size={13} />
                  Save
                </button>
              </div>
              {summarizer.available && (
                <button
                  onClick={() => summarizer.run(scribe.transcripts)}
                  disabled={
                    !hasContent ||
                    summarizer.status === 'preparing' ||
                    summarizer.status === 'running' ||
                    Boolean(gateReason(scribe.transcripts))
                  }
                  title={gateReason(scribe.transcripts) ?? 'Generate summary'}
                  className="w-full h-10 rounded-xl flex items-center justify-center gap-2 text-[13px] font-medium border bg-violet-400/10 border-violet-400/25 text-violet-200 hover:bg-violet-400/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Sparkles size={13} />
                  {summarizer.status === 'running' || summarizer.status === 'preparing'
                    ? `Summarizing… ${summarizer.elapsedSeconds}s · ${summarizer.tokenCount} tokens`
                    : summarizer.status === 'done'
                      ? 'Regenerate summary'
                      : 'Generate summary'}
                </button>
              )}
            </div>
          )}

          <AnimatePresence>
            {showCloseConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setShowCloseConfirm(false)
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
                    <h3 className="text-[15px] font-semibold text-white/90">Stop scribing?</h3>
                    <p className="text-[13px] text-white/45 mt-1.5 leading-relaxed">
                      Your transcript will be lost unless you save it first.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        handleSave()
                        handleConfirmClose()
                      }}
                      disabled={!hasContent}
                      className="w-full py-2.5 rounded-xl bg-emerald-400/15 border border-emerald-400/25 text-emerald-300 text-[13px] font-medium hover:bg-emerald-400/20 disabled:opacity-30 transition-colors"
                    >
                      Save and close
                    </button>
                    <button
                      onClick={handleConfirmClose}
                      className="w-full py-2.5 rounded-xl bg-white/4 border border-white/10 text-white/70 text-[13px] font-medium hover:bg-white/8 transition-colors"
                    >
                      Discard
                    </button>
                    <button
                      onClick={() => setShowCloseConfirm(false)}
                      className="w-full py-2.5 rounded-xl text-white/40 text-[13px] hover:text-white/70 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
