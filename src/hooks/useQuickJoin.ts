'use client'

import { useState, useEffect } from 'react'
import { useSettings } from './useSettings'

export interface QuickJoinProvider {
  id: string
  label: string
  icon: string
  enabled: boolean
  configReady: boolean
  configHint?: string
}

const STORAGE_PREFIX = 'fuse_quickjoin_'

const PROVIDERS = [
  { id: 'google-meet', label: 'Google', icon: '/icons/meeting-providers/google-meet.svg' },
  { id: 'microsoft-teams', label: 'Teams', icon: '/icons/meeting-providers/microsoft-teams.svg' },
  { id: 'zoom', label: 'Zoom', icon: '/icons/meeting-providers/zoom.svg' },
  { id: 'pexip', label: 'Pexip', icon: '/icons/meeting-providers/pexip.svg' },
] as const

function getToggle(id: string): boolean {
  const val = localStorage.getItem(`${STORAGE_PREFIX}${id}`)
  return val === null ? true : val === '1'
}

export function useQuickJoin() {
  const { settings } = useSettings()
  const [toggles, setToggles] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const t: Record<string, boolean> = {}
    for (const p of PROVIDERS) t[p.id] = getToggle(p.id)
    setToggles(t)
  }, [])

  function configReady(id: string): boolean {
    switch (id) {
      case 'google-meet': return !!settings.googleDomain
      case 'microsoft-teams': return !!settings.pexipCustomerId
      default: return true
    }
  }

  function configHint(id: string): string | undefined {
    switch (id) {
      case 'google-meet': return settings.googleDomain ? undefined : 'Set Google domain to enable'
      case 'microsoft-teams': return settings.pexipCustomerId ? undefined : 'Set customer ID to enable'
      default: return undefined
    }
  }

  const providers: QuickJoinProvider[] = PROVIDERS.map((p) => ({
    ...p,
    enabled: (toggles[p.id] ?? true) && configReady(p.id),
    configReady: configReady(p.id),
    configHint: configHint(p.id),
  }))

  const visibleProviders = providers.filter((p) => p.enabled)

  function setEnabled(id: string, enabled: boolean) {
    localStorage.setItem(`${STORAGE_PREFIX}${id}`, enabled ? '1' : '0')
    setToggles((prev) => ({ ...prev, [id]: enabled }))
  }

  function isToggled(id: string): boolean {
    return toggles[id] ?? true
  }

  return { providers, visibleProviders, setEnabled, isToggled }
}
