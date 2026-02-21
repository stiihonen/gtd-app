import { differenceInMinutes, format, addDays } from 'date-fns'
import type { WeeklyReview } from '../../../domain/entities/WeeklyReview'
import { WEEKLY_REVIEW_STEP_LABELS, WEEKLY_REVIEW_STEPS } from '../../../domain/entities/WeeklyReview'

interface Props {
  review: WeeklyReview
  onDismiss: () => void
}

export function ReviewComplete({ review, onDismiss }: Props) {
  const finishedAt = review.completed_at ?? new Date()
  const duration = differenceInMinutes(finishedAt, review.started_at)
  const nextReview = addDays(finishedAt, 7)
  const allStepsDone = WEEKLY_REVIEW_STEPS.every(s =>
    review.steps_completed.includes(s)
  )

  return (
    <div className="flex items-center justify-center h-full">
      <div className="max-w-sm w-full text-center px-6 py-12">
        <div className="w-16 h-16 rounded-full bg-accent-green/20 border border-accent-green/30 flex items-center justify-center mx-auto mb-6">
          <span className="text-accent-green text-2xl">✓</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          {allStepsDone ? 'Review Complete' : 'Review Finished'}
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          {format(finishedAt, 'HH:mm')} · {duration} min
          {!allStepsDone && ' · some steps skipped'}
        </p>

        {/* Steps summary */}
        <div className="bg-surface-1 border border-surface-2 rounded-xl px-4 py-4 mb-6 text-left">
          {WEEKLY_REVIEW_STEPS.map(step => {
            const done = review.steps_completed.includes(step)
            return (
              <div
                key={step}
                className={`flex items-center gap-2.5 py-1.5 text-sm ${done ? 'text-gray-300' : 'text-gray-600'}`}
              >
                <span className={`text-xs flex-shrink-0 ${done ? 'text-accent-green' : 'text-gray-700'}`}>
                  {done ? '✓' : '○'}
                </span>
                {WEEKLY_REVIEW_STEP_LABELS[step]}
              </div>
            )
          })}
        </div>

        <p className="text-xs text-gray-600 mb-6">
          Next review: {format(nextReview, 'EEEE, MMM d')}
        </p>

        <button
          onClick={onDismiss}
          className="w-full py-3 bg-accent-blue hover:bg-accent-blue/80 text-white font-medium rounded-xl transition-colors"
        >
          Back to Work
        </button>
      </div>
    </div>
  )
}
