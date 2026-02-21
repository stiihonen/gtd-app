/** Read-only. Sourced from Google Calendar or other integrations. */
export interface CalendarItem {
  id: string
  title: string
  start_at: Date
  end_at: Date
  all_day: boolean
  source: 'google_calendar' | 'manual'
  notes?: string
}
