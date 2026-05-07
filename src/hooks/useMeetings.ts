'use client'

// Polls the OTJ portal for upcoming meetings on a 60s interval, transforms
// them into the renderer shape, and caps at 20. Auto-points the carousel at
// the currently-live meeting (if any) on every refresh — so a meeting that
// goes live during the session gets focus, even if the user had navigated
// elsewhere in the carousel. Trade-off: manual navigation is overridden
// when a new meeting begins. Acceptable for "join the live meeting fast."

import { useState, useEffect, useCallback } from 'react'
import { pexipOTJ } from '@/services/pexipOTJ'
import type { CalendarMeeting } from '@/types/meetings'

const DEFAULT_POLL_INTERVAL = 60_000
const MAX_MEETINGS = 20

interface UseMeetingsOptions {
  pollInterval?: number
  otjClientId?: string
  otjClientSecret?: string
}

export function useMeetings({
  pollInterval = DEFAULT_POLL_INTERVAL,
  otjClientId,
  otjClientSecret,
}: UseMeetingsOptions = {}) {
  const [meetings, setMeetings] = useState<CalendarMeeting[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  // Start true — the effect below kicks off a fetch on mount, so the first
  // render should already reflect "loading" rather than "settled empty".
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMeetings = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await pexipOTJ.getMeetings(otjClientId, otjClientSecret)
      const transformed = pexipOTJ.transformMeetings(raw).slice(0, MAX_MEETINGS)
      setMeetings(transformed)
      setError(null)

      const liveIndex = transformed.findIndex((m) => m.isNow)
      if (liveIndex >= 0) setCurrentIndex(liveIndex)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch meetings')
    } finally {
      setLoading(false)
    }
  }, [otjClientId, otjClientSecret])

  useEffect(() => {
    // Initial fetch + 60s poll. fetchMeetings sets state; the lint rule flags
    // any setState chain from an effect, but kicking off async network work
    // on mount is exactly what effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMeetings()
    const interval = setInterval(fetchMeetings, pollInterval)
    return () => clearInterval(interval)
  }, [fetchMeetings, pollInterval])

  const currentMeeting = meetings[currentIndex] ?? null

  function next() {
    setCurrentIndex((i) => (i + 1) % meetings.length)
  }

  function prev() {
    setCurrentIndex((i) => (i - 1 + meetings.length) % meetings.length)
  }

  function goTo(index: number) {
    setCurrentIndex(index)
  }

  return {
    meetings,
    currentMeeting,
    currentIndex,
    loading,
    error,
    next,
    prev,
    goTo,
    refresh: fetchMeetings,
  }
}
