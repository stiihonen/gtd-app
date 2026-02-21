import { useState, type ReactNode } from 'react'
import { differenceInDays, formatDistanceToNow } from 'date-fns'
import { useStore } from '../../../store'
import { getNextActionState } from '../../../domain/state-machines/nextAction'
import { getWaitingForState } from '../../../domain/state-machines/waitingFor'
import { NextActionForm } from '../ActionsView'
import type { Project } from '../../../domain/entities/Project'
import type { NextAction } from '../../../domain/entities/NextAction'
import type { WaitingFor } from '../../../domain/entities/WaitingFor'
import { StepShell } from './StepShell'

interface Props {
  onComplete: () => void
}

interface ProjectFlags {
  noNextAction: boolean
  stale: boolean
  stalled: boolean
}

function getProjectFlags(
  project: Project,
  nextActions: NextAction[],
  waitingFor: WaitingFor[],
  now: Date
): ProjectFlags {
  const hasAvailableAction = nextActions.some(
    a => a.project_id === project.id && getNextActionState(a, now) === 'available'
  )
  const hasOpenWaiting = waitingFor.some(
    w => w.project_id === project.id && getWaitingForState(w, now) !== 'resolved'
  )
  const lastReview = project.last_reviewed_at ?? project.created_at
  const stale = differenceInDays(now, lastReview) > 14

  return {
    noNextAction: !hasAvailableAction && !hasOpenWaiting,
    stale,
    stalled: project.status === 'stalled',
  }
}

export function StepProjects({ onComplete }: Props) {
  const [addingFor, setAddingFor] = useState<string | null>(null)

  const { projects, nextActions, waitingFor, addNextAction, setProjectStatus, reviewProject, deleteProject } = useStore()
  const now = new Date()

  const reviewable = projects.filter(
    p => p.status === 'active' || p.status === 'stalled'
  )

  const flaggedCount = reviewable.filter(p => {
    const f = getProjectFlags(p, nextActions, waitingFor, now)
    return f.noNextAction || f.stale || f.stalled
  }).length

  // Flagged first (highest score), then rest
  const sorted = [...reviewable].sort((a, b) => {
    const fa = getProjectFlags(a, nextActions, waitingFor, now)
    const fb = getProjectFlags(b, nextActions, waitingFor, now)
    const scoreA = (fa.noNextAction ? 4 : 0) + (fa.stalled ? 2 : 0) + (fa.stale ? 1 : 0)
    const scoreB = (fb.noNextAction ? 4 : 0) + (fb.stalled ? 2 : 0) + (fb.stale ? 1 : 0)
    return scoreB - scoreA
  })

  return (
    <StepShell
      title="Review your projects"
      description="Every active project needs a next action. Stalled ones need a decision."
      issueCount={flaggedCount}
      issueSummary={
        flaggedCount > 0
          ? `${flaggedCount} project${flaggedCount !== 1 ? 's' : ''} need attention`
          : 'All projects have next actions'
      }
      onComplete={onComplete}
      completeLabel={flaggedCount > 0 ? 'Complete step anyway →' : 'Projects reviewed →'}
    >
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <div className="text-3xl mb-3 opacity-40">◈</div>
          <p className="text-sm">No active projects.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(project => {
            const flags = getProjectFlags(project, nextActions, waitingFor, now)
            const hasFlaw = flags.noNextAction || flags.stale || flags.stalled
            const lastReview = project.last_reviewed_at ?? project.created_at
            const daysSinceReview = differenceInDays(now, lastReview)
            const projectActions = nextActions.filter(
              a => a.project_id === project.id && getNextActionState(a) === 'available'
            )

            return (
              <div
                key={project.id}
                className={`bg-surface-1 border rounded-xl px-4 py-4 ${
                  hasFlaw ? 'border-accent-amber/30' : 'border-surface-2'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-medium text-gray-200">{project.title}</span>
                      {flags.noNextAction && (
                        <Flag color="red">No next action</Flag>
                      )}
                      {flags.stalled && !flags.noNextAction && (
                        <Flag color="orange">Stalled</Flag>
                      )}
                      {flags.stale && (
                        <Flag color="amber">Not reviewed in {daysSinceReview}d</Flag>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 truncate">{project.outcome_statement}</p>
                  </div>
                  <span className="text-xs text-gray-700 flex-shrink-0">
                    {formatDistanceToNow(lastReview, { addSuffix: true })}
                  </span>
                </div>

                {/* Existing next actions (up to 2) */}
                {projectActions.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {projectActions.slice(0, 2).map(a => (
                      <div key={a.id} className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="text-accent-green opacity-70 flex-shrink-0">▷</span>
                        <span className="truncate">{a.title}</span>
                        <span className="font-mono text-gray-700 flex-shrink-0">{a.context}</span>
                      </div>
                    ))}
                    {projectActions.length > 2 && (
                      <p className="text-xs text-gray-700">+{projectActions.length - 2} more</p>
                    )}
                  </div>
                )}

                {/* Inline add-action form */}
                {addingFor === project.id && (
                  <div className="mb-3">
                    <NextActionForm
                      projects={[]}
                      onSave={input => {
                        addNextAction({ ...input, project_id: project.id })
                        reviewProject(project.id)
                        setAddingFor(null)
                      }}
                      onCancel={() => setAddingFor(null)}
                    />
                  </div>
                )}

                {/* Quick actions */}
                <div className="flex gap-1.5 flex-wrap">
                  {addingFor !== project.id && (
                    <ActionBtn onClick={() => setAddingFor(project.id)} color="blue">
                      + Add next action
                    </ActionBtn>
                  )}
                  <ActionBtn onClick={() => reviewProject(project.id)} color="gray">
                    Mark reviewed
                  </ActionBtn>
                  <ActionBtn onClick={() => setProjectStatus(project.id, 'someday')} color="gray">
                    → Someday
                  </ActionBtn>
                  <ActionBtn onClick={() => setProjectStatus(project.id, 'completed')} color="gray">
                    ✓ Complete
                  </ActionBtn>
                  <ActionBtn onClick={() => deleteProject(project.id)} color="danger">
                    Delete
                  </ActionBtn>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </StepShell>
  )
}

function Flag({ color, children }: { color: 'red' | 'orange' | 'amber'; children: ReactNode }) {
  const styles = {
    red: 'bg-accent-red/10 text-accent-red border-accent-red/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    amber: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border ${styles[color]}`}>
      {children}
    </span>
  )
}

function ActionBtn({
  onClick,
  color,
  children,
}: {
  onClick: () => void
  color: 'blue' | 'gray' | 'danger'
  children: ReactNode
}) {
  const styles = {
    blue: 'bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30',
    gray: 'bg-surface-2 text-gray-400 hover:bg-surface-3 hover:text-gray-200',
    danger: 'text-gray-700 hover:text-accent-red',
  }
  return (
    <button onClick={onClick} className={`px-2.5 py-1 text-xs rounded-md transition-colors ${styles[color]}`}>
      {children}
    </button>
  )
}
