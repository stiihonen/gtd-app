import { useState, useEffect, useCallback } from 'react'
import { fetchUpcomingEvents, type CalendarEvent } from '../infrastructure/googleCalendar'

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
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

export function useGoogleCalendar() {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => sessionStorage.getItem(SESSION_KEY)
  )
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  // tokenClient is initialised once on mount
  const [tokenClient, setTokenClient] = useState<{ requestAccessToken: () => void } | null>(null)

  // Fetch events whenever we have a valid access token
  const loadEvents = useCallback(async (token: string) => {
    setLoading(true)
    try {
      const items = await fetchUpcomingEvents(token)
      setEvents(items)
    } catch {
      // Token is likely expired — reset to signed-out state
      sessionStorage.removeItem(SESSION_KEY)
      setAccessToken(null)
      setEvents([])
    } finally {
      setLoading(false)
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
            loadEvents(response.access_token)
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
  }, [loadEvents])

  // If we already have a stored token on mount, fetch events immediately
  useEffect(() => {
    if (accessToken) {
      loadEvents(accessToken)
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = useCallback(() => {
    tokenClient?.requestAccessToken()
  }, [tokenClient])

  const signOut = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setAccessToken(null)
    setEvents([])
  }, [])

  return {
    isConnected: Boolean(accessToken),
    events,
    loading,
    signIn,
    signOut,
  }
}
