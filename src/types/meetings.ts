// Wire shapes from the Pexip OTJ portal API. Field names match the Pexip
// response verbatim — don't rename, the /api/meetings route reads them as-is.
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

// Renderer-side shape after the OTJ response is transformed for display.
// Different field names (subject → title) and computed display fields
// (time/duration/isNow) so UI changes don't ripple into the API contract.
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
