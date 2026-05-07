'use client'

// React side of the Electron IPC bridge. The ElectronBridge interface here is
// the TypeScript mirror of electron/preload.js — keep them in sync.
//
// useElectron() exposes window-mode flags (expanded/mini/sidebar) and toggles
// that route through the main process. Returns false-ish defaults when running
// outside Electron (e.g. plain browser tab) so the same components work in
// both environments without conditional code paths.

import { useState, useEffect, useCallback } from 'react'

interface ElectronBridge {
  isElectron: boolean
  toggleExpand: () => Promise<boolean>
  getExpanded: () => Promise<boolean>
  toggleMini: () => Promise<{ isMini: boolean; isSidebar: boolean }>
  getMini: () => Promise<boolean>
  toggleSidebar: () => Promise<boolean>
  getSidebar: () => Promise<boolean>
  promoteFromSidebar: () => Promise<boolean>
  restoreSidebar: () => Promise<boolean>
  resizeToState: (state: { expanded?: boolean; sideDockOpen?: boolean }) => Promise<void>
  adjustWidth: (delta: number) => Promise<void>
  transcriptionAvailable: () => Promise<boolean>
  transcriptionStart: () => Promise<boolean>
  transcriptionStop: () => Promise<Array<string | { text: string; speaker: string }>>
  transcriptionSendAudio: (samples: Float32Array, speaker?: string) => void
  onTranscriptionResult: (callback: (text: string, speaker?: string) => void) => () => void
  modelsStatus: () => Promise<{ downloaded: boolean }>
  downloadModels: () => Promise<{ success: boolean; error?: string }>
  onDownloadProgress: (callback: (line: string) => void) => () => void
  summarizeAvailable: () => Promise<boolean>
  summarizeRun: (
    prompt: string,
  ) => Promise<
    | { ok: true; markdown: string; tokenCount: number; elapsedMs: number }
    | { ok: false; error: string }
  >
  summarizeModelStatus: () => Promise<{ downloaded: boolean }>
  summarizeDownloadModel: () => Promise<{ success: boolean; error?: string }>
  onSummarizeProgress: (
    callback: (payload: { tokenCount: number; elapsedMs: number }) => void,
  ) => () => void
  onSummarizeDownloadProgress: (callback: (line: string) => void) => () => void
  onPowerResume: (callback: () => void) => () => void
}

export function getElectronBridge(): ElectronBridge | null {
  if (typeof window === 'undefined') return null
  const win = window as unknown as { electron?: ElectronBridge }
  return win.electron?.isElectron ? win.electron : null
}

export function useElectron() {
  // All four flags start false to match the server-rendered HTML and avoid a
  // hydration mismatch. The effect below promotes them to their real values
  // on the client; the initial render briefly shows non-Electron defaults
  // (no window controls) which is fine — the swap happens on the same tick.
  const [isElectron, setIsElectron] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMini, setIsMini] = useState(false)
  const [isSidebar, setIsSidebar] = useState(false)

  useEffect(() => {
    const bridge = getElectronBridge()
    if (!bridge) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsElectron(true)
    bridge.getExpanded().then(setIsExpanded).catch(() => {})
    bridge.getMini().then(setIsMini).catch(() => {})
    bridge.getSidebar?.().then(setIsSidebar).catch(() => {})
  }, [])

  const toggleExpand = useCallback(async () => {
    const bridge = getElectronBridge()
    if (!bridge) return false
    const expanded = await bridge.toggleExpand()
    setIsExpanded(expanded)
    setIsSidebar(false)
    return expanded
  }, [])

  const toggleMini = useCallback(async () => {
    const bridge = getElectronBridge()
    if (!bridge) return false
    const { isMini: mini, isSidebar: sidebar } = await bridge.toggleMini()
    setIsMini(mini)
    setIsSidebar(sidebar)
    return mini
  }, [])

  const toggleSidebar = useCallback(async () => {
    const bridge = getElectronBridge()
    if (!bridge) return false
    const sidebar = await bridge.toggleSidebar()
    setIsSidebar(sidebar)
    if (sidebar) setIsMini(false)
    return sidebar
  }, [])

  const promoteFromSidebar = useCallback(async () => {
    const bridge = getElectronBridge()
    if (!bridge) return false
    const ok = await bridge.promoteFromSidebar()
    if (ok) setIsSidebar(false)
    return ok
  }, [])

  const restoreSidebar = useCallback(async () => {
    const bridge = getElectronBridge()
    if (!bridge) return false
    const ok = await bridge.restoreSidebar()
    if (ok) setIsSidebar(true)
    return ok
  }, [])

  return {
    isElectron,
    isExpanded,
    isMini,
    isSidebar,
    toggleExpand,
    toggleMini,
    toggleSidebar,
    promoteFromSidebar,
    restoreSidebar,
  }
}
