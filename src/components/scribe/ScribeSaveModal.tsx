'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { NotebookText, Save, AlertCircle } from 'lucide-react'
import { Toggle } from '@/components/scribe/Toggle'

interface ScribeSaveModalProps {
  open: boolean
  intent: 'stop' | 'close'
  hasContent: boolean
  summarizerAvailable: boolean
  summarizerStatus: 'idle' | 'preparing' | 'running' | 'done' | 'error'
  summarizerElapsed: number
  hasSummary: boolean
  gateReason: string | null
  generateSummary: boolean
  includeFullTranscript: boolean
  onGenerateSummaryChange: (next: boolean) => void
  onIncludeFullTranscriptChange: (next: boolean) => void
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export function ScribeSaveModal({
  open,
  intent,
  hasContent,
  summarizerAvailable,
  summarizerStatus,
  summarizerElapsed,
  hasSummary,
  gateReason,
  generateSummary,
  includeFullTranscript,
  onGenerateSummaryChange,
  onIncludeFullTranscriptChange,
  onSave,
  onDiscard,
  onCancel,
}: ScribeSaveModalProps) {
  const summaryRunning = summarizerStatus === 'running' || summarizerStatus === 'preparing'
  const summaryDisabled = !hasContent || Boolean(gateReason) || !summarizerAvailable
  const headline = intent === 'close' ? 'Save before closing?' : 'Save transcript?'
  const subtext = hasContent
    ? intent === 'close'
      ? 'Save this transcript as markdown before exiting scribe mode.'
      : 'Choose what to include before saving as markdown.'
    : 'No transcript captured yet — nothing to save.'
  const discardLabel = intent === 'close' ? 'Discard and close' : 'Discard'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCancel()
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-[360px] rounded-2xl bg-black/90 border border-white/10 backdrop-blur-2xl shadow-2xl p-6 flex flex-col gap-5"
          >
            <div>
              <h3 className="text-[15px] font-semibold text-white/90">{headline}</h3>
              <p className="text-[13px] text-white/45 mt-1.5 leading-relaxed">{subtext}</p>
            </div>

            {hasContent && (
              <div className="flex flex-col gap-3">
                {summarizerAvailable && (
                  <label
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/3 border border-white/8 ${
                      summaryDisabled ? 'opacity-50' : 'cursor-pointer hover:bg-white/5'
                    } transition-colors`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-violet-400/15 border border-violet-400/25 flex items-center justify-center shrink-0">
                      <NotebookText size={13} className="text-violet-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-white/85">
                        Generate summary
                      </div>
                      <div className="text-[11px] text-white/40 mt-0.5">
                        {gateReason ?? (hasSummary ? 'Already generated' : 'AI summary on this device')}
                      </div>
                    </div>
                    <Toggle
                      checked={generateSummary}
                      onChange={onGenerateSummaryChange}
                      disabled={summaryDisabled}
                    />
                  </label>
                )}

                <label className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/3 border border-white/8 cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
                    <Save size={13} className="text-white/55" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-white/85">
                      Include full transcript
                    </div>
                    <div className="text-[11px] text-white/40 mt-0.5">
                      Append every captured line to the file
                    </div>
                  </div>
                  <Toggle
                    checked={includeFullTranscript}
                    onChange={onIncludeFullTranscriptChange}
                  />
                </label>
              </div>
            )}

            {summaryRunning && (
              <div className="flex items-center gap-2 text-[12px] text-violet-200/70">
                <div className="w-3 h-3 border-2 border-violet-300/30 border-t-violet-300 rounded-full animate-spin" />
                Generating summary… {summarizerElapsed}s
              </div>
            )}

            {summarizerStatus === 'error' && (
              <div className="flex items-start gap-2 text-[12px] text-rose-300/80">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                Summary failed — saving without it.
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={onSave}
                disabled={!hasContent || summaryRunning}
                className="w-full py-2.5 rounded-xl bg-emerald-400/15 border border-emerald-400/25 text-emerald-200 text-[13px] font-medium hover:bg-emerald-400/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {summaryRunning ? 'Working…' : 'Save'}
              </button>
              <button
                onClick={onDiscard}
                className="w-full py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200/85 text-[13px] font-medium hover:bg-rose-500/15 transition-colors"
              >
                {discardLabel}
              </button>
              <button
                onClick={onCancel}
                disabled={summaryRunning}
                className="w-full py-2.5 rounded-xl text-white/40 text-[13px] hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
