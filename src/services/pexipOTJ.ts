import type { OTJMeeting, OTJMeetingsResponse, CalendarMeeting } from '@/types/meetings'

class PexipOTJService {
  async getMeetings(clientId?: string, clientSecret?: string): Promise<OTJMeeting[]> {
    const headers: Record<string, string> = {}
    if (clientId) headers['x-otj-client-id'] = clientId
    if (clientSecret) headers['x-otj-client-secret'] = clientSecret

    const response = await fetch('/api/meetings', { headers })

    if (!response.ok) {
      throw new Error(`Failed to fetch meetings: ${response.status}`)
    }

    const data: OTJMeetingsResponse = await response.json()
    return data.meetings || []
  }

  transformMeetings(meetings: OTJMeeting[]): CalendarMeeting[] {
    const now = new Date()

    return meetings.map((meeting) => {
      const start = new Date(meeting.startTime)
      const end = new Date(meeting.endTime)
      const isNow = now >= start && now <= end

      const time = start.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })

      const durationMins = Math.round((end.getTime() - start.getTime()) / 60000)
      let duration: string
      if (durationMins < 60) {
        duration = `${durationMins} min`
      } else {
        const hours = Math.floor(durationMins / 60)
        const mins = durationMins % 60
        duration = mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`
      }

      return {
        id: meeting.id,
        title: meeting.subject || 'Untitled Meeting',
        time,
        duration,
        alias: meeting.alias || null,
        isNow,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        organizerName: meeting.organizerName || '',
      }
    })
  }
}

export const pexipOTJ = new PexipOTJService()
