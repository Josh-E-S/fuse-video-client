export function formatMeetingDate(startTime: string): {
  dateLabel: string
  timeLabel: string
  isToday: boolean
} {
  const date = new Date(startTime)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const meetingDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const isToday = meetingDay.getTime() === today.getTime()
  const isTomorrow = meetingDay.getTime() === tomorrow.getTime()

  let dateLabel: string
  if (isToday) {
    dateLabel = 'Today'
  } else if (isTomorrow) {
    dateLabel = 'Tomorrow'
  } else {
    dateLabel = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const timeLabel = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return { dateLabel, timeLabel, isToday }
}

export function getTimeUntil(startTime: string): string {
  const diff = new Date(startTime).getTime() - Date.now()
  if (diff <= 0) return 'Now'

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`
  if (hours > 0) return `in ${hours} hr${hours > 1 ? 's' : ''}`
  if (minutes > 0) return `in ${minutes} min`
  return 'in less than a minute'
}

export function canJoinMeeting(startTime: string, windowSeconds = 900): boolean {
  const diff = (new Date(startTime).getTime() - Date.now()) / 1000
  return diff <= windowSeconds
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function getMeetingCountdown(meeting: { startTime: string; isNow: boolean }): string | null {
  if (meeting.isNow) return null
  const diffMs = new Date(meeting.startTime).getTime() - Date.now()
  if (diffMs <= 0) return null
  const diffMins = Math.round(diffMs / 60_000)
  if (diffMins < 60) return `In ${diffMins} minute${diffMins !== 1 ? 's' : ''}`
  const diffHrs = Math.round(diffMins / 60)
  return `In ${diffHrs} hour${diffHrs !== 1 ? 's' : ''}`
}

export function getDayLabel(startTime: string): string {
  const date = new Date(startTime)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const meetingDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (meetingDay.getTime() === today.getTime()) return 'Today'
  if (meetingDay.getTime() === tomorrow.getTime()) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatMeetingTime(isoStr: string): string {
  const d = new Date(isoStr)
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const period = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${period}`
}
