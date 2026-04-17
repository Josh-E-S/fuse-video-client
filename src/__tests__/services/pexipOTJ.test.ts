import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pexipOTJ } from '@/services/pexipOTJ'
import type { OTJMeeting } from '@/types/meetings'

describe('PexipOTJService', () => {
  describe('transformMeetings', () => {
    it('transforms OTJ meetings into CalendarMeetings', () => {
      const meetings: OTJMeeting[] = [
        {
          id: '1',
          subject: 'Standup',
          organizerName: 'Alice',
          organizerEmail: 'alice@example.com',
          startTime: '2026-04-16T09:00:00Z',
          endTime: '2026-04-16T09:30:00Z',
          alias: 'standup@example.com',
        },
      ]

      const result = pexipOTJ.transformMeetings(meetings)

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Standup')
      expect(result[0].alias).toBe('standup@example.com')
      expect(result[0].duration).toBe('30 min')
      expect(result[0].organizerName).toBe('Alice')
    })

    it('uses "Untitled Meeting" when subject is empty', () => {
      const meetings: OTJMeeting[] = [
        {
          id: '2',
          subject: '',
          organizerName: '',
          organizerEmail: '',
          startTime: '2026-04-16T10:00:00Z',
          endTime: '2026-04-16T11:00:00Z',
        },
      ]

      const result = pexipOTJ.transformMeetings(meetings)
      expect(result[0].title).toBe('Untitled Meeting')
      expect(result[0].alias).toBeNull()
    })

    it('formats duration correctly for hours', () => {
      const meetings: OTJMeeting[] = [
        {
          id: '3',
          subject: 'Workshop',
          organizerName: '',
          organizerEmail: '',
          startTime: '2026-04-16T10:00:00Z',
          endTime: '2026-04-16T12:00:00Z',
        },
      ]

      const result = pexipOTJ.transformMeetings(meetings)
      expect(result[0].duration).toBe('2 hr')
    })

    it('formats duration correctly for hours + minutes', () => {
      const meetings: OTJMeeting[] = [
        {
          id: '4',
          subject: 'Long call',
          organizerName: '',
          organizerEmail: '',
          startTime: '2026-04-16T10:00:00Z',
          endTime: '2026-04-16T11:30:00Z',
        },
      ]

      const result = pexipOTJ.transformMeetings(meetings)
      expect(result[0].duration).toBe('1 hr 30 min')
    })

    it('marks currently running meetings as isNow', () => {
      const now = new Date()
      const start = new Date(now.getTime() - 600_000) // 10 min ago
      const end = new Date(now.getTime() + 600_000) // 10 min from now

      const meetings: OTJMeeting[] = [
        {
          id: '5',
          subject: 'Live Now',
          organizerName: '',
          organizerEmail: '',
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        },
      ]

      const result = pexipOTJ.transformMeetings(meetings)
      expect(result[0].isNow).toBe(true)
    })

    it('marks future meetings as not isNow', () => {
      const future = new Date(Date.now() + 3_600_000)
      const meetings: OTJMeeting[] = [
        {
          id: '6',
          subject: 'Later',
          organizerName: '',
          organizerEmail: '',
          startTime: future.toISOString(),
          endTime: new Date(future.getTime() + 1_800_000).toISOString(),
        },
      ]

      const result = pexipOTJ.transformMeetings(meetings)
      expect(result[0].isNow).toBe(false)
    })

    it('handles empty array', () => {
      expect(pexipOTJ.transformMeetings([])).toEqual([])
    })
  })

  describe('getMeetings', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    it('fetches meetings from /api/meetings', async () => {
      const mockMeetings = [{ id: '1', subject: 'Test' }]
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ meetings: mockMeetings }), { status: 200 }),
      )

      const result = await pexipOTJ.getMeetings()
      expect(fetch).toHaveBeenCalledWith('/api/meetings', { headers: {} })
      expect(result).toEqual(mockMeetings)
    })

    it('passes client credentials as headers', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ meetings: [] }), { status: 200 }),
      )

      await pexipOTJ.getMeetings('client-id', 'client-secret')

      expect(fetch).toHaveBeenCalledWith('/api/meetings', {
        headers: {
          'x-otj-client-id': 'client-id',
          'x-otj-client-secret': 'client-secret',
        },
      })
    })

    it('throws on non-OK response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('', { status: 500 }),
      )

      await expect(pexipOTJ.getMeetings()).rejects.toThrow('Failed to fetch meetings: 500')
    })

    it('returns empty array when no meetings in response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 }),
      )

      const result = await pexipOTJ.getMeetings()
      expect(result).toEqual([])
    })
  })
})
