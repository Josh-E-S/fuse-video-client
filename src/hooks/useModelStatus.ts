'use client'

import { useState, useEffect, useCallback } from 'react'
import { getElectronBridge } from '@/hooks/useElectron'

export function useModelStatus() {
  const [downloaded, setDownloaded] = useState(false)
  const [checked, setChecked] = useState(false)

  const refresh = useCallback(() => {
    const bridge = getElectronBridge()
    if (!bridge) {
      setDownloaded(false)
      setChecked(true)
      return
    }
    bridge
      .modelsStatus()
      .then((s) => setDownloaded(s.downloaded))
      .catch(() => setDownloaded(false))
      .finally(() => setChecked(true))
  }, [])

  useEffect(() => {
    refresh()
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  return { downloaded, checked, refresh }
}
