'use client'

// Polls every 30s; if a meeting starts within the next 5 minutes, fires a
// sonner toast with a "Join" action button. Per-meeting cooldown of 5
// minutes prevents the same meeting from notifying twice.
//
// In-app toasts only — no system/OS notifications. The user has to be
// looking at the app to see them. System notifications would need
// Notification.requestPermission() + new Notification(); deferred for now.

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { CalendarMeeting } from '@/types/meetings'

const NOTIFICATION_WINDOW = 300
const NOTIFICATION_COOLDOWN = 300_000

export function useMeetingNotifications(
  meetings: CalendarMeeting[],
  onJoin: (meeting: CalendarMeeting) => void,
) {
  const notifiedRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    function check() {
      const now = Date.now()

      for (const meeting of meetings) {
        const start = new Date(meeting.startTime).getTime()
        const secondsUntil = (start - now) / 1000

        if (secondsUntil <= 0 || secondsUntil > NOTIFICATION_WINDOW) continue

        const lastNotified = notifiedRef.current.get(meeting.id) ?? 0
        if (now - lastNotified < NOTIFICATION_COOLDOWN) continue

        notifiedRef.current.set(meeting.id, now)

        const minutes = Math.ceil(secondsUntil / 60)
        toast(`${meeting.title}`, {
          description: `Starting in ${minutes} min`,
          duration: 10_000,
          action: {
            label: 'Join',
            onClick: () => onJoin(meeting),
          },
        })
      }
    }

    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [meetings, onJoin])
}
