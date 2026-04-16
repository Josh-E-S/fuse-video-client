'use client'

import { useState, useEffect, useCallback } from 'react'
import { pexipOTJ } from '@/services/pexipOTJ'
import type { CalendarMeeting } from '@/types/meetings'

const DEFAULT_POLL_INTERVAL = 60_000

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMeetings = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await pexipOTJ.getMeetings(otjClientId, otjClientSecret)
      const transformed = pexipOTJ.transformMeetings(raw)
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
