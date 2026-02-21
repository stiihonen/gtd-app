import { useState } from 'react'
import { subDays, addDays, isBefore, isAfter, format } from 'date-fns'
import { useStore } from '../../../store'
import { getNextActionState } from '../../../domain/state-machines/nextAction'
import { StepShell } from './StepShell'

interface Props {
  type: 'past' | 'future'
  onComplete: () => void
}

export function StepCalendar({ type, onComplete }: Props) {
  const [confirmed, setConfirmed] = useState(false)
  const { nextActions } = useStore()
  const now = new Date()

  const isPast = type === 'past'

  // Past: actions completed in last 7 days
  const recentlyCompleted = nextActions.filter(a => {
    if (!a.completed_at) return false
    return isAfter(a.completed_at, subDays(now, 7))
  })

  // Future: available actions with due dates in next 14 days
  const upcoming = nextActions.filter(a => {
    if (!a.due_date) return false
    if (getNextActionState(a, now) !== 'available') return false
    return isBefore(a.due_date, addDays(now, 14))
  }).sort((a, b) => a.due_date!.getTime() - b.due_date!.getTime())

  const items = isPast ? recentlyCompleted : upcoming

  return (
    <StepShell
      title={isPast ? 'Review past calendar' : 'Review future calendar'}
      description={isPast
        ? 'Look at what happened last week. Any loose ends? Commitments missed? Things to capture?'
        : "Look ahead. What's coming up? Do you need to prepare for anything?"
      }
      issueCount={0}
      issueSummary={isPast
        ? `${recentlyCompleted.length} action${recentlyCompleted.length !== 1 ? 's' : ''} completed this week`
        : `${upcoming.length} action${upcoming.length !== 1 ? 's' : ''} due in next 14 days`
      }
      onComplete={onComplete}
      completeLabel={confirmed ? (isPast ? 'Past reviewed →' : 'Future reviewed →') : 'Mark complete →'}
    >
      {/* Manual review prompt */}
      <div className="bg-surface-2 border border-surface-3 rounded-xl px-5 py-4 mb-5">
        <p className="text-sm text-gray-400 leading-relaxed">
          {isPast
            ? 'Open your calendar and review the past 7 days. Look for: missed appointments, commitments to follow up on, things that happened that need to be captured.'
            : 'Open your calendar and review the next 14 days. Look for: upcoming deadlines, preparation needed, people to contact in advance.'}
        </p>
        <label className="flex items-center gap-3 mt-4 cursor-pointer group">
          <div
            onClick={() => setConfirmed(v => !v)}
            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
              confirmed
                ? 'bg-accent-green border-accent-green'
                : 'border-surface-3 group-hover:border-gray-500'
            }`}
          >
            {confirmed && <span className="text-surface-0 text-xs font-bold leading-none">✓</span>}
          </div>
          <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
            {isPast
              ? "I've reviewed my past calendar"
              : "I've reviewed my upcoming calendar"}
          </span>
        </label>
      </div>

      {/* Relevant actions from the system */}
      {items.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
            {isPast ? 'Completed this week' : 'Upcoming deadlines'}
          </h3>
          <div className="space-y-1.5">
            {items.map(action => (
              <div
                key={action.id}
                className="flex items-center gap-3 px-3 py-2 bg-surface-1 border border-surface-2 rounded-lg"
              >
                <span className={`text-xs flex-shrink-0 ${isPast ? 'text-accent-green' : 'text-accent-amber'}`}>
                  {isPast ? '✓' : '↗'}
                </span>
                <span className="text-sm text-gray-400 flex-1 truncate">{action.title}</span>
                <span className="text-xs text-gray-600 flex-shrink-0 font-mono">
                  {isPast
                    ? format(action.completed_at!, 'EEE MMM d')
                    : format(action.due_date!, 'EEE MMM d')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-sm text-gray-600 text-center py-4">
          {isPast ? 'No actions completed this week.' : 'No actions with due dates in the next 14 days.'}
        </div>
      )}
    </StepShell>
  )
}
