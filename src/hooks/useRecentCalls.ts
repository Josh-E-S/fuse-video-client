// Tracks the user's recent ad-hoc dial-out aliases. Stored in localStorage,
// capped at 10, dedupes by alias (case-insensitive) and bumps existing
// entries to the top so the most-recent is always first.

import { useState, useEffect, useCallback } from 'react'
import { log } from '@/utils/logger'

export interface RecentCall {
  alias: string
  timestamp: number
  providerId?: string
}

const STORAGE_KEY = 'fuse_recent_calls'
const MAX_RECENT_CALLS = 10

export function useRecentCalls() {
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([])

  // Load from localStorage on mount. Initial state is [] to match SSR; the
  // effect promotes to the stored value on the client.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as RecentCall[]
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecentCalls(parsed)
      }
    } catch {
      log.ui.debug('localStorage unavailable when loading recent calls')
    }
  }, [])

  // Add a new call (or bump existing to top)
  const addRecentCall = useCallback((alias: string, providerId?: string) => {
    if (!alias.trim()) return

    setRecentCalls((prev) => {
      const cleanAlias = alias.trim()
      const now = Date.now()

      // Remove any existing entries for this alias
      const filtered = prev.filter((call) => call.alias.toLowerCase() !== cleanAlias.toLowerCase())

      // Add new entry at the beginning
      const updated = [{ alias: cleanAlias, timestamp: now, providerId }, ...filtered].slice(
        0,
        MAX_RECENT_CALLS,
      )

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch {
        log.ui.debug('localStorage unavailable when saving recent calls')
      }

      return updated
    })
  }, [])

  // Clear all recent calls
  const clearRecentCalls = useCallback(() => {
    setRecentCalls([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      log.ui.debug('localStorage unavailable when clearing recent calls')
    }
  }, [])

  return {
    recentCalls,
    addRecentCall,
    clearRecentCalls,
  }
}
