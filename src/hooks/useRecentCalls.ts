import { useState, useEffect, useCallback } from 'react'

export interface RecentCall {
  alias: string
  timestamp: number
  providerId?: string
}

const STORAGE_KEY = 'fuse_recent_calls'
const MAX_RECENT_CALLS = 10

export function useRecentCalls() {
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([])

  // Load from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as RecentCall[]
        setRecentCalls(parsed)
      }
    } catch {
      // localStorage may be unavailable
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
        // localStorage may be unavailable
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
      // localStorage may be unavailable
    }
  }, [])

  return {
    recentCalls,
    addRecentCall,
    clearRecentCalls,
  }
}
