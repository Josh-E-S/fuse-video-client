'use client'

// Single source of truth for "is the AI model present on disk?" — used by
// Settings and the scribe entry point to gate UI. Re-checks on window focus
// because the user may finish a download in another tab/window.

import { useState, useEffect, useCallback } from 'react'
import { getElectronBridge } from '@/hooks/useElectron'

interface ModelEntry {
  downloaded: boolean
  checked: boolean
}

const initialEntry: ModelEntry = { downloaded: false, checked: false }

export function useModelStatus() {
  const [transcription, setTranscription] = useState<ModelEntry>(initialEntry)
  const [summarizer, setSummarizer] = useState<ModelEntry>(initialEntry)

  const refresh = useCallback(() => {
    const bridge = getElectronBridge()
    if (!bridge) {
      setTranscription({ downloaded: false, checked: true })
      setSummarizer({ downloaded: false, checked: true })
      return
    }
    bridge
      .modelsStatus()
      .then((s) => setTranscription({ downloaded: s.downloaded, checked: true }))
      .catch(() => setTranscription({ downloaded: false, checked: true }))

    bridge
      .summarizeModelStatus()
      .then((s) => setSummarizer({ downloaded: s.downloaded, checked: true }))
      .catch(() => setSummarizer({ downloaded: false, checked: true }))
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  return { transcription, summarizer, refresh }
}
