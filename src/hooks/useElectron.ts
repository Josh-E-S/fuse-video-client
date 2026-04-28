'use client'

import { useState, useEffect, useCallback } from 'react'

interface ElectronBridge {
  isElectron: boolean
  toggleExpand: () => Promise<boolean>
  getExpanded: () => Promise<boolean>
  toggleMini: () => Promise<boolean>
  getMini: () => Promise<boolean>
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

  useEffect(() => {
    const bridge = getElectronBridge()
    if (bridge) {
      setIsElectron(true)
      bridge.getExpanded().then(setIsExpanded).catch(() => {})
      bridge.getMini().then(setIsMini).catch(() => {})
    }
  }, [])

  const toggleExpand = useCallback(async () => {
    const bridge = getElectronBridge()
    if (!bridge) return false
    const expanded = await bridge.toggleExpand()
    setIsExpanded(expanded)
    return expanded
  }, [])

  const toggleMini = useCallback(async () => {
    const bridge = getElectronBridge()
    if (!bridge) return false
    const mini = await bridge.toggleMini()
    setIsMini(mini)
    return mini
  }, [])

  return { isElectron, isExpanded, isMini, toggleExpand, toggleMini }
}
