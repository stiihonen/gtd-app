import type { ReactNode } from 'react'
import type { ViewId } from '../../App'
import { useStore } from '../../store'
import { supabase } from '../../infrastructure/supabase'
import { getInboxItemState } from '../../domain/state-machines/inbox'
import { getWeeklyReviewSystemState } from '../../domain/state-machines/weeklyReview'

interface NavItem {
  id: ViewId
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'inbox',    label: 'Inbox',        icon: '○' },
  { id: 'projects', label: 'Projects',     icon: '◈' },
  { id: 'actions',  label: 'Next Actions', icon: '▷' },
  { id: 'waiting',  label: 'Waiting For',  icon: '⧖' },
  { id: 'focus',    label: 'Focus',        icon: '◎' },
  { id: 'review',   label: 'Review',       icon: '⟳' },
]

interface Props {
  activeView: ViewId
  onNavigate: (view: ViewId) => void
  /** The `review` view manages its own height/scroll; all others scroll normally. */
  children: ReactNode
}

export function AppLayout({ activeView, onNavigate, children }: Props) {
  const inboxItems   = useStore(s => s.inboxItems)
  const projects     = useStore(s => s.projects)
  const nextActions  = useStore(s => s.nextActions)
  const waitingFor   = useStore(s => s.waitingFor)
  const weeklyReviews = useStore(s => s.weeklyReviews)

  const unclarifiedCount = inboxItems.filter(
    i => getInboxItemState(i) === 'captured'
  ).length

  const reviewOverdue = getWeeklyReviewSystemState(weeklyReviews) === 'overdue'

  // Badge counts — null means no badge
  const counts: Record<ViewId, number | null> = {
    inbox:    unclarifiedCount || null,
    projects: projects.filter(p => p.status === 'active' || p.status === 'stalled').length || null,
    actions:  nextActions.filter(a => !a.completed_at).length || null,
    waiting:  waitingFor.filter(w => !w.resolved_at).length || null,
    focus:    null,
    review:   null, // handled separately via dot
  }

  // The review view manages its own scrolling internally
  const mainClass = activeView === 'review'
    ? 'flex-1 overflow-hidden bg-surface-0'
    : 'flex-1 overflow-y-auto bg-surface-0'

  return (
    <div className="flex h-screen overflow-hidden">
      {/* App sidebar */}
      <nav className="w-56 flex-shrink-0 bg-surface-1 border-r border-surface-3 flex flex-col">
        <div className="px-5 py-6">
          <span className="text-sm font-semibold tracking-widest text-gray-500 uppercase">
            GTD
          </span>
        </div>

        <div className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map(item => {
            const isActive = activeView === item.id
            const count = counts[item.id]
            const isReview = item.id === 'review'

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                  ${isActive
                    ? 'bg-surface-3 text-white'
                    : 'text-gray-400 hover:bg-surface-2 hover:text-gray-200'
                  }
                `}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base leading-none opacity-70">{item.icon}</span>
                  {item.label}
                </span>

                {/* Review: show amber dot if overdue */}
                {isReview && reviewOverdue && (
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-accent-amber' : 'bg-accent-amber/70'}`} />
                )}

                {/* Others: numeric badge */}
                {!isReview && count !== null && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-surface-0 text-gray-300' : 'bg-surface-2 text-gray-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="px-5 py-4 border-t border-surface-3 flex items-center justify-between">
          <span className="text-xs text-gray-600">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', month: 'short', day: 'numeric'
            })}
          </span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className={mainClass}>
        {children}
      </main>
    </div>
  )
}
