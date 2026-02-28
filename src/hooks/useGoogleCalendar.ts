import { useState, useEffect, useCallback } from 'react'
import {
  fetchCalendarList,
  fetchEventsFromCalendars,
  type CalendarEvent,
  type CalendarListEntry,
} from '../infrastructure/googleCalendar'

// GIS (Google Identity Services) is loaded via <script> in index.html
// Minimal type declaration so TypeScript doesn't complain
declare const google: {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string
        scope: string
        callback: (response: { access_token?: string; error?: string }) => void
      }) => { requestAccessToken: () => void }
    }
  }
}

const SESSION_KEY = 'goog_cal_token'
const LOCAL_STORAGE_KEY = 'goog_cal_selected'
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

export function useGoogleCalendar() {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => sessionStorage.getItem(SESSION_KEY)
  )
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [calendarList, setCalendarList] = useState<CalendarListEntry[]>([])
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (stored) return JSON.parse(stored) as string[]
    } catch {
      // ignore parse errors
    }
    return ['primary']
  })
  // tokenClient is initialised once on mount
  const [tokenClient, setTokenClient] = useState<{ requestAccessToken: () => void } | null>(null)

  const loadEvents = useCallback(async (token: string, calIds: string[]) => {
    setLoading(true)
    try {
      const items = await fetchEventsFromCalendars(token, calIds)
      setEvents(items)
    } catch (err) {
      // Token is likely expired — reset to signed-out state
      sessionStorage.removeItem(SESSION_KEY)
      setAccessToken(null)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCalendarList = useCallback(async (token: string) => {
    try {
      const list = await fetchCalendarList(token)
      setCalendarList(list)

      // Normalize 'primary' alias → real primary ID
      const primaryEntry = list.find(c => c.primary === true)
      if (primaryEntry) {
        setSelectedCalendarIds(prev => {
          const normalized = prev.map(id => id === 'primary' ? primaryEntry.id : id)
          // Prune IDs that no longer exist in the list
          const validIds = list.map(c => c.id)
          const pruned = normalized.filter(id => validIds.includes(id))
          const result = pruned.length > 0 ? pruned : [primaryEntry.id]
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(result))
          return result
        })
      }
    } catch {
      // Non-fatal: calendar list just won't show chips
    }
  }, [])

  // Initialise GIS token client on mount (requires the GIS script to have loaded)
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) return

    // GIS may not be loaded yet if the script is still async-loading
    const init = () => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (response) => {
          if (response.access_token) {
            sessionStorage.setItem(SESSION_KEY, response.access_token)
            setAccessToken(response.access_token)
            // Use functional update to get fresh selectedCalendarIds
            setSelectedCalendarIds(current => {
              loadCalendarList(response.access_token!)
              loadEvents(response.access_token!, current)
              return current
            })
          }
        },
      })
      setTokenClient(client)
    }

    if (typeof google !== 'undefined') {
      init()
    } else {
      // Wait for the GIS script to finish loading
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
      if (script) {
        script.addEventListener('load', init, { once: true })
      }
    }
  }, [loadCalendarList, loadEvents])

  // If we already have a stored token on mount, load calendar list
  useEffect(() => {
    if (accessToken) {
      loadCalendarList(accessToken)
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload events whenever token or selected calendars change
  useEffect(() => {
    if (accessToken) {
      loadEvents(accessToken, selectedCalendarIds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, selectedCalendarIds])

  const toggleCalendar = useCallback((id: string) => {
    setSelectedCalendarIds(prev => {
      let next: string[]
      if (prev.includes(id)) {
        // Prevent deselecting last
        if (prev.length === 1) return prev
        next = prev.filter(c => c !== id)
      } else {
        next = [...prev, id]
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const signIn = useCallback(() => {
    tokenClient?.requestAccessToken()
  }, [tokenClient])

  const signOut = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setAccessToken(null)
    setEvents([])
    setCalendarList([])
  }, [])

  return {
    isConnected: Boolean(accessToken),
    events,
    loading,
    calendarList,
    selectedCalendarIds,
    toggleCalendar,
    signIn,
    signOut,
  }
}
