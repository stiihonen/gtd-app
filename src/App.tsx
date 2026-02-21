import { useState, useEffect } from 'react'
import { AppLayout } from './ui/layout/AppLayout'
import { InboxView } from './ui/views/InboxView'
import { ProjectsView } from './ui/views/ProjectsView'
import { ActionsView } from './ui/views/ActionsView'
import { WaitingForView } from './ui/views/WaitingForView'
import { WeeklyReviewView } from './ui/views/WeeklyReviewView'
import { FocusView } from './ui/views/FocusView'
import { LoginView } from './ui/views/LoginView'
import { supabase } from './infrastructure/supabase'
import { useStore } from './store'
import type { Session } from '@supabase/supabase-js'

export type ViewId = 'inbox' | 'projects' | 'actions' | 'waiting' | 'review' | 'focus'

export default function App() {
  const [view, setView] = useState<ViewId>('inbox')
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const loadData = useStore(s => s.loadData)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadData()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s) loadData()
    })

    return () => subscription.unsubscribe()
  }, [loadData])

  if (session === undefined) {
    return null
  }

  if (session === null) {
    return <LoginView />
  }

  return (
    <AppLayout activeView={view} onNavigate={setView}>
      {view === 'inbox'    && <InboxView />}
      {view === 'projects' && <ProjectsView />}
      {view === 'actions'  && <ActionsView />}
      {view === 'waiting'  && <WaitingForView />}
      {view === 'review'   && <WeeklyReviewView />}
      {view === 'focus'    && <FocusView />}
    </AppLayout>
  )
}
