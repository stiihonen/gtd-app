import type { ReactNode } from 'react'

interface Props {
  title: string
  description: string
  /** Number of items needing action. 0 = clean. */
  issueCount: number
  issueSummary: string
  onComplete: () => void
  completeLabel?: string
  children: ReactNode
}

export function StepShell({
  title,
  description,
  issueCount,
  issueSummary,
  onComplete,
  completeLabel = 'Complete step →',
  children,
}: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Step header */}
      <div className="px-8 pt-8 pb-5 border-b border-surface-2 flex-shrink-0">
        <h2 className="text-xl font-semibold text-white mb-1">{title}</h2>
        <p className="text-sm text-gray-500 mb-4">{description}</p>

        {/* Issue badge */}
        <div className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border ${
          issueCount > 0
            ? 'bg-accent-amber/10 border-accent-amber/20 text-accent-amber'
            : 'bg-surface-1 border-surface-2 text-gray-500'
        }`}>
          <span>{issueCount > 0 ? `⚠ ${issueCount}` : '✓'}</span>
          <span>{issueSummary}</span>
        </div>
      </div>

      {/* Scrollable step content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {children}
      </div>

      {/* Footer with complete button */}
      <div className="px-8 py-5 border-t border-surface-2 flex-shrink-0 flex items-center justify-between">
        <span className="text-xs text-gray-600">
          {issueCount > 0 && 'You can still complete this step with open items.'}
        </span>
        <button
          onClick={onComplete}
          className="px-5 py-2.5 bg-surface-2 hover:bg-surface-3 text-gray-200 hover:text-white text-sm font-medium rounded-lg transition-colors"
        >
          {completeLabel}
        </button>
      </div>
    </div>
  )
}
