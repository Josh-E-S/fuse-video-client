import { describe, it, expect, beforeAll } from 'vitest'
import { getMeetingProvider } from '@/utils/meetingProvider'

beforeAll(() => {
  process.env.NEXT_PUBLIC_GOOGLE_DOMAIN = 'meet.example.com'
  process.env.NEXT_PUBLIC_TEAMS_DOMAIN = 'teams.example.com'
  process.env.NEXT_PUBLIC_PEXIP_DOMAIN = '.pexip.example.com'
})

describe('getMeetingProvider', () => {
  it('returns null for null or undefined alias', () => {
    expect(getMeetingProvider(null)).toBeNull()
    expect(getMeetingProvider(undefined)).toBeNull()
  })

  it('returns null for unknown alias', () => {
    expect(getMeetingProvider('random-meeting@unknown.test')).toBeNull()
  })

  it('resolves Google Meet alias', () => {
    const provider = getMeetingProvider('meeting@meet.example.com')
    expect(provider).not.toBeNull()
    expect(provider!.id).toBe('google-meet')
  })

  it('resolves Teams alias', () => {
    const provider = getMeetingProvider('user@teams.example.com')
    expect(provider).not.toBeNull()
    expect(provider!.id).toBe('microsoft-teams')
  })

  it('resolves Zoom alias', () => {
    const provider = getMeetingProvider('12345@zoomcrc.com')
    expect(provider).not.toBeNull()
    expect(provider!.id).toBe('zoom')
  })

  it('resolves Pexip alias', () => {
    const provider = getMeetingProvider('room@company.pexip.example.com')
    expect(provider).not.toBeNull()
    expect(provider!.id).toBe('pexip')
  })

  it('resolves Webex alias', () => {
    const provider = getMeetingProvider('meeting@webex.com')
    expect(provider).not.toBeNull()
    expect(provider!.id).toBe('webex')
  })

  it('is case-insensitive', () => {
    const provider = getMeetingProvider('MEETING@MEET.EXAMPLE.COM')
    expect(provider).not.toBeNull()
    expect(provider!.id).toBe('google-meet')
  })
})
