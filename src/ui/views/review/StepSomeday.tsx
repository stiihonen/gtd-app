import { formatDistanceToNow } from 'date-fns'
import { useStore } from '../../../store'
import { StepShell } from './StepShell'

interface Props {
  onComplete: () => void
}

export function StepSomeday({ onComplete }: Props) {
  const { projects, setProjectStatus, deleteProject } = useStore()
  const someday = projects.filter(p => p.status === 'someday')

  return (
    <StepShell
      title="Review Someday / Maybe"
      description="Scan your Someday list. Is there anything you're ready to commit to now?"
      issueCount={0}
      issueSummary={`${someday.length} item${someday.length !== 1 ? 's' : ''} on the list`}
      onComplete={onComplete}
      completeLabel="Someday reviewed →"
    >
      {someday.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <div className="text-3xl mb-3 opacity-40">◈</div>
          <p className="text-sm">Someday list is empty.</p>
          <p className="text-xs mt-1 text-gray-700">
            Add projects here if you're not ready to commit but don't want to forget.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-6">
            {someday.map(project => (
              <div
                key={project.id}
                className="group bg-surface-1 border border-surface-2 hover:border-surface-3 rounded-xl px-4 py-3.5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-300">{project.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5 truncate">
                      {project.outcome_statement}
                    </p>
                    <p className="text-xs text-gray-700 mt-1">
                      Added {formatDistanceToNow(project.created_at, { addSuffix: true })}
                    </p>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setProjectStatus(project.id, 'active')}
                      className="px-2.5 py-1.5 text-xs bg-accent-green/20 hover:bg-accent-green/30 text-accent-green rounded-lg transition-colors font-medium"
                    >
                      Activate
                    </button>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="px-2 py-1.5 text-xs text-gray-700 hover:text-accent-red transition-colors rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-surface-1 border border-surface-2 rounded-xl px-4 py-3 text-sm text-gray-500">
            Anything new to add to Someday? Capture it in the inbox after the review.
          </div>
        </>
      )}
    </StepShell>
  )
}
