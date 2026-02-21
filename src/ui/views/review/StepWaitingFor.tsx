import { differenceInDays, format, formatDistanceToNow } from 'date-fns'
import { useStore } from '../../../store'
import { getWaitingForState } from '../../../domain/state-machines/waitingFor'
import { StepShell } from './StepShell'

interface Props {
  onComplete: () => void
}

export function StepWaitingFor({ onComplete }: Props) {
  const { waitingFor, projects, resolve, followUp, deleteWaitingFor } = useStore()
  const now = new Date()

  const open = waitingFor.filter(w => !w.resolved_at)
  const escalated = open.filter(w => getWaitingForState(w, now) === 'escalated')

  // Escalated first, then oldest first
  const sorted = [...open].sort((a, b) => {
    const sa = getWaitingForState(a, now) === 'escalated' ? 0 : 1
    const sb = getWaitingForState(b, now) === 'escalated' ? 0 : 1
    if (sa !== sb) return sa - sb
    return a.created_at.getTime() - b.created_at.getTime()
  })

  return (
    <StepShell
      title="Check waiting for"
      description="Review everything you're waiting on. Follow up on anything overdue."
      issueCount={escalated.length}
      issueSummary={escalated.length > 0
        ? `${escalated.length} item${escalated.length !== 1 ? 's' : ''} need follow-up`
        : open.length > 0
          ? `${open.length} open item${open.length !== 1 ? 's' : ''}`
          : 'Nothing waiting'
      }
      onComplete={onComplete}
      completeLabel={escalated.length > 0 ? 'Complete step anyway →' : 'Waiting for reviewed →'}
    >
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <div className="text-3xl mb-3 opacity-40">⧖</div>
          <p className="text-sm">Nothing waiting.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(item => {
            const state = getWaitingForState(item, now)
            const isEscalated = state === 'escalated'
            const daysWaiting = differenceInDays(now, item.created_at)
            const project = projects.find(p => p.id === item.project_id)

            return (
              <div
                key={item.id}
                className={`group bg-surface-1 border rounded-xl px-4 py-3.5 transition-colors ${
                  isEscalated
                    ? 'border-accent-amber/40 bg-accent-amber/5'
                    : 'border-surface-2 hover:border-surface-3'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-medium text-gray-200">{item.title}</span>
                      {isEscalated && (
                        <span className="text-xs px-1.5 py-0.5 rounded border bg-accent-amber/10 text-accent-amber border-accent-amber/20">
                          Follow up
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span>↳ <span className="text-gray-300">{item.owner}</span></span>
                      <span className={isEscalated ? 'text-accent-amber' : ''}>
                        {daysWaiting} day{daysWaiting !== 1 ? 's' : ''} waiting
                      </span>
                      {item.expected_by && (
                        <span className={item.expected_by < now ? 'text-accent-red' : 'text-gray-600'}>
                          due {format(item.expected_by, 'MMM d')}
                          {item.expected_by < now && ' (overdue)'}
                        </span>
                      )}
                      {item.last_followup_at && (
                        <span className="text-gray-700">
                          last follow-up {formatDistanceToNow(item.last_followup_at, { addSuffix: true })}
                        </span>
                      )}
                      {project && (
                        <span className="px-1.5 py-0.5 bg-surface-2 rounded text-gray-600">
                          {project.title}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-1.5">
                    <button
                      onClick={() => followUp(item.id)}
                      className="px-2.5 py-1.5 text-xs bg-surface-2 hover:bg-surface-3 text-gray-400 hover:text-gray-200 rounded-lg transition-colors"
                    >
                      Followed up
                    </button>
                    <button
                      onClick={() => resolve(item.id)}
                      className="px-2.5 py-1.5 text-xs bg-accent-green/20 hover:bg-accent-green/30 text-accent-green rounded-lg transition-colors"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => deleteWaitingFor(item.id)}
                      className="px-2 py-1.5 text-xs text-gray-700 hover:text-accent-red transition-colors rounded-lg"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </StepShell>
  )
}
