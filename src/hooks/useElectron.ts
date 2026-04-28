'use client'

import { useState, useEffect, useCallback } from 'react'

interface ElectronBridge {
  isElectron: boolean
  toggleExpand: () => Promise<boolean>
  getExpanded: () => Promise<boolean>
  toggleMini: () => Promise<boolean>
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
  onPowerResume: (callback: () => void) => () => void
}

export function getElectronBridge(): ElectronBridge | null {
  if (typeof window === 'undefined') return null
  const win = window as unknown as { electron?: ElectronBridge }
  return win.electron?.isElectron ? win.electron : null
}

export function useElectron() {
  const [isElectron, setIsElectron] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMini, setIsMini] = useState(false)
  const [isSidebar, setIsSidebar] = useState(false)

  useEffect(() => {
    const bridge = getElectronBridge()
    if (bridge) {
      setIsElectron(true)
      bridge.getExpanded().then(setIsExpanded).catch(() => {})
      bridge.getMini().then(setIsMini).catch(() => {})
      bridge.getSidebar?.().then(setIsSidebar).catch(() => {})
    }
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
    const mini = await bridge.toggleMini()
    setIsMini(mini)
    setIsSidebar(false)
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
