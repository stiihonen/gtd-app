/**
 * Google Calendar API v3 integration.
 *
 * Prerequisites (one-time manual setup):
 * 1. Go to https://console.cloud.google.com/ → create or select a project
 * 2. APIs & Services → Library → enable "Google Calendar API"
 * 3. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID (type: Web application)
 * 4. Add http://localhost:5173 (and production URL) to Authorized JavaScript origins
 * 5. Copy the Client ID and add to .env.local:
 *    VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
 */

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
}

interface GoogleEventDateTime {
  dateTime?: string
  date?: string
}

interface GoogleEvent {
  id: string
  summary?: string
  start: GoogleEventDateTime
  end: GoogleEventDateTime
}

interface GoogleEventsResponse {
  items: GoogleEvent[]
}

export async function fetchUpcomingEvents(accessToken: string): Promise<CalendarEvent[]> {
  const now = new Date()
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: endOfDay.toISOString(),
    maxResults: '5',
    orderBy: 'startTime',
    singleEvents: 'true',
  })

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) {
    throw new Error(`Calendar API error: ${response.status}`)
  }

  const data: GoogleEventsResponse = await response.json()

  return (data.items ?? []).map(item => {
    const allDay = Boolean(item.start.date && !item.start.dateTime)
    const start = allDay
      ? new Date(item.start.date!)
      : new Date(item.start.dateTime!)
    const end = allDay
      ? new Date(item.end.date!)
      : new Date(item.end.dateTime!)

    return {
      id: item.id,
      title: item.summary ?? '(No title)',
      start,
      end,
      allDay,
    }
  })
}
