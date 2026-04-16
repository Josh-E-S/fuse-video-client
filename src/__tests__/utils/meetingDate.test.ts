import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatTime, getMeetingCountdown, formatMeetingTime } from '@/utils/meetingDate'

describe('formatTime', () => {
  it('formats 0 seconds', () => {
    expect(formatTime(0)).toBe('0:00')
  })

  it('formats seconds under a minute', () => {
    expect(formatTime(45)).toBe('0:45')
  })

  it('formats minutes and seconds', () => {
    expect(formatTime(125)).toBe('2:05')
  })
})

describe('getMeetingCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-27T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null for live meetings', () => {
    expect(getMeetingCountdown({ startTime: '2026-03-27T09:30:00', isNow: true })).toBeNull()
  })

  it('returns null for past meetings', () => {
    expect(getMeetingCountdown({ startTime: '2026-03-27T09:00:00', isNow: false })).toBeNull()
  })

  it('returns minutes for meetings under an hour away', () => {
    expect(getMeetingCountdown({ startTime: '2026-03-27T10:30:00', isNow: false })).toBe(
      'In 30 minutes',
    )
  })

  it('returns singular minute', () => {
    expect(getMeetingCountdown({ startTime: '2026-03-27T10:01:00', isNow: false })).toBe(
      'In 1 minute',
    )
  })

  it('returns hours for meetings over an hour away', () => {
    expect(getMeetingCountdown({ startTime: '2026-03-27T12:30:00', isNow: false })).toBe(
      'In 3 hours',
    )
  })
})

describe('formatMeetingTime', () => {
  it('formats morning time', () => {
    expect(formatMeetingTime('2026-03-27T09:05:00')).toBe('9:05 AM')
  })

  it('formats afternoon time', () => {
    expect(formatMeetingTime('2026-03-27T14:30:00')).toBe('2:30 PM')
  })

  it('formats noon', () => {
    expect(formatMeetingTime('2026-03-27T12:00:00')).toBe('12:00 PM')
  })

  it('formats midnight', () => {
    expect(formatMeetingTime('2026-03-27T00:00:00')).toBe('12:00 AM')
  })
})
