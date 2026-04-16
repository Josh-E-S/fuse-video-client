export interface OTJMeeting {
  id: string
  subject: string
  organizerName: string
  organizerEmail: string
  startTime: string
  endTime: string
  alias?: string
}

export interface OTJMeetingsResponse {
  metadata: { count: number }
  meetings: OTJMeeting[]
}

export interface CalendarMeeting {
  id: string
  title: string
  time: string
  duration: string
  alias: string | null
  isNow: boolean
  startTime: string
  endTime: string
  organizerName: string
}
