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

export interface CalendarListEntry {
  id: string
  summary: string
  backgroundColor: string
  primary?: boolean
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

interface GoogleCalendarListResponse {
  items: Array<{
    id: string
    summary: string
    backgroundColor: string
    primary?: boolean
  }>
}

export async function fetchCalendarList(accessToken: string): Promise<CalendarListEntry[]> {
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) {
    if (response.status === 401) throw new Error('UNAUTHORIZED')
    throw new Error(`Calendar API error: ${response.status}`)
  }

  const data: GoogleCalendarListResponse = await response.json()
  return (data.items ?? []).map(item => ({
    id: item.id,
    summary: item.summary,
    backgroundColor: item.backgroundColor,
    primary: item.primary,
  }))
}

export async function fetchUpcomingEvents(accessToken: string, calendarId = 'primary'): Promise<CalendarEvent[]> {
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
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) {
    if (response.status === 401) throw new Error('UNAUTHORIZED')
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

export async function fetchEventsFromCalendars(
  accessToken: string,
  calendarIds: string[]
): Promise<CalendarEvent[]> {
  const results = await Promise.allSettled(
    calendarIds.map(id => fetchUpcomingEvents(accessToken, id))
  )

  const allUnauthorized = results.every(
    r => r.status === 'rejected' && (r.reason as Error).message === 'UNAUTHORIZED'
  )
  if (allUnauthorized) throw new Error('UNAUTHORIZED')

  const seen = new Set<string>()
  const events: CalendarEvent[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const event of result.value) {
        if (!seen.has(event.id)) {
          seen.add(event.id)
          events.push(event)
        }
      }
    }
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime())
}
