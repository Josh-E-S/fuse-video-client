'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getElectronBridge } from '@/hooks/useElectron'
import type { TranscriptEntry } from '@/hooks/useTranscription'
import { buildPrompt, gateReason } from '@/utils/summaryMarkdown'
import { log } from '@/utils/logger'

export type SummarizerStatus = 'idle' | 'preparing' | 'running' | 'done' | 'error'

interface UseSummarizerReturn {
  available: boolean
  status: SummarizerStatus
  summary: string | null
  error: string | null
  elapsedSeconds: number
  tokenCount: number
  run: (entries: TranscriptEntry[]) => Promise<void>
  clear: () => void
}

export function useSummarizer(): UseSummarizerReturn {
  const [available, setAvailable] = useState(false)
  const [status, setStatus] = useState<SummarizerStatus>('idle')
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [tokenCount, setTokenCount] = useState(0)

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const bridge = getElectronBridge()
    if (!bridge) return
    bridge
      .summarizeModelStatus()
      .then((s) => setAvailable(s.downloaded))
      .catch(() => setAvailable(false))
  }, [])

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      if (unsubRef.current) unsubRef.current()
    }
  }, [])

  const clear = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    if (unsubRef.current) {
      unsubRef.current()
      unsubRef.current = null
    }
    setStatus('idle')
    setSummary(null)
    setError(null)
    setElapsedSeconds(0)
    setTokenCount(0)
  }, [])

  const run = useCallback(
    async (entries: TranscriptEntry[]) => {
      if (status === 'preparing' || status === 'running') return

      const bridge = getElectronBridge()
      if (!bridge) {
        setError('Summary engine not available outside the desktop app')
        setStatus('error')
        return
      }

      const reason = gateReason(entries)
      if (reason) {
        setError(reason)
        setStatus('error')
        return
      }

      setStatus('preparing')
      setError(null)
      setSummary(null)
      setElapsedSeconds(0)
      setTokenCount(0)

      const startedAt = Date.now()
      tickRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
      }, 250)

      unsubRef.current = bridge.onSummarizeProgress((payload) => {
        setTokenCount(payload.tokenCount)
      })

      setStatus('running')

      try {
        const prompt = buildPrompt(entries)
        const result = await bridge.summarizeRun(prompt)

        if (result.ok) {
          setSummary(result.markdown)
          setTokenCount(result.tokenCount)
          setElapsedSeconds(Math.floor(result.elapsedMs / 1000))
          setStatus('done')
        } else {
          setError(result.error)
          setStatus('error')
        }
      } catch (err) {
        log.media.warn('Summarizer call threw')
        setError(err instanceof Error ? err.message : "Couldn't generate summary. Try again.")
        setStatus('error')
      } finally {
        if (tickRef.current) {
          clearInterval(tickRef.current)
          tickRef.current = null
        }
        if (unsubRef.current) {
          unsubRef.current()
          unsubRef.current = null
        }
      }
    },
    [status],
  )

  return { available, status, summary, error, elapsedSeconds, tokenCount, run, clear }
}
