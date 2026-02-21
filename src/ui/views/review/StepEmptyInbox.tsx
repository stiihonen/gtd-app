import { useState } from 'react'
import { differenceInHours, formatDistanceToNow } from 'date-fns'
import { useStore } from '../../../store'
import { ClarifyModal } from '../../components/ClarifyModal'
import type { InboxItem } from '../../../domain/entities/InboxItem'
import { StepShell } from './StepShell'

interface Props {
  onComplete: () => void
}

export function StepEmptyInbox({ onComplete }: Props) {
  const [clarifying, setClarifying] = useState<InboxItem | null>(null)

  const { inboxItems, clarifyAsClarified, deleteInboxItem } = useStore()
  const unclarified = inboxItems.filter(i => !i.clarified)
  const now = new Date()

  function quickTrash(item: InboxItem) {
    clarifyAsClarified(item.id, 'trash')
    deleteInboxItem(item.id)
  }

  function quickSomeday(item: InboxItem) {
    clarifyAsClarified(item.id, 'someday')
  }

  const staleCount = unclarified.filter(
    i => differenceInHours(now, i.captured_at) > 48
  ).length

  return (
    <StepShell
      title="Empty your inbox"
      description="Process every item to zero. Each one gets clarified, trashed, or deferred."
      issueCount={unclarified.length}
      issueSummary={
        staleCount > 0
          ? `${staleCount} item${staleCount !== 1 ? 's' : ''} older than 48h`
          : `${unclarified.length} item${unclarified.length !== 1 ? 's' : ''} to process`
      }
      onComplete={onComplete}
      completeLabel={unclarified.length === 0 ? 'Inbox is empty — next →' : 'Complete step anyway →'}
    >
      {unclarified.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <div className="text-3xl mb-3 opacity-40">○</div>
          <p className="text-sm">Inbox is empty.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {unclarified.map(item => {
            const ageHours = differenceInHours(now, item.captured_at)
            const isStale = ageHours > 48

            return (
              <div
                key={item.id}
                className={`group bg-surface-1 border rounded-xl px-4 py-3.5 transition-colors ${
                  isStale
                    ? 'border-accent-amber/30 bg-accent-amber/5'
                    : 'border-surface-2 hover:border-surface-3'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 leading-relaxed">{item.content}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-xs ${isStale ? 'text-accent-amber' : 'text-gray-600'}`}>
                        {isStale ? '⚠ ' : ''}
                        {formatDistanceToNow(item.captured_at, { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-1.5">
                    <button
                      onClick={() => setClarifying(item)}
                      className="px-2.5 py-1.5 text-xs bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue rounded-lg transition-colors font-medium"
                    >
                      Clarify
                    </button>
                    <button
                      onClick={() => quickSomeday(item)}
                      className="px-2.5 py-1.5 text-xs bg-surface-2 hover:bg-surface-3 text-gray-400 hover:text-gray-200 rounded-lg transition-colors"
                    >
                      Someday
                    </button>
                    <button
                      onClick={() => quickTrash(item)}
                      className="px-2 py-1.5 text-xs text-gray-600 hover:text-accent-red transition-colors rounded-lg"
                    >
                      Trash
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {clarifying && (
        <ClarifyModal item={clarifying} onClose={() => setClarifying(null)} />
      )}
    </StepShell>
  )
}
