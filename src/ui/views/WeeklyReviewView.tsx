import { useState } from 'react'
import { differenceInDays } from 'date-fns'
import { useStore } from '../../store'
import { WEEKLY_REVIEW_STEPS, WEEKLY_REVIEW_STEP_LABELS } from '../../domain/entities/WeeklyReview'
import type { WeeklyReview, WeeklyReviewStep } from '../../domain/entities/WeeklyReview'
import { getWeeklyReviewSystemState } from '../../domain/state-machines/weeklyReview'
import { getNextActionState } from '../../domain/state-machines/nextAction'
import { getWaitingForState } from '../../domain/state-machines/waitingFor'
import { ReviewStart } from './review/ReviewStart'
import { ReviewComplete } from './review/ReviewComplete'
import { StepEmptyInbox } from './review/StepEmptyInbox'
import { StepProjects } from './review/StepProjects'
import { StepWaitingFor } from './review/StepWaitingFor'
import { StepCalendar } from './review/StepCalendar'
import { StepSomeday } from './review/StepSomeday'

// ─── Issue count per step ─────────────────────────────────────────────────────

function useStepIssueCounts(): Record<WeeklyReviewStep, number> {
  const inboxItems = useStore(s => s.inboxItems)
  const nextActions = useStore(s => s.nextActions)
  const projects = useStore(s => s.projects)
  const waitingFor = useStore(s => s.waitingFor)
  const now = new Date()

  const inboxIssues = inboxItems.filter(i => !i.clarified).length

  const projectIssues = projects.filter(p => {
    if (p.status !== 'active' && p.status !== 'stalled') return false
    const hasAction = nextActions.some(
      a => a.project_id === p.id && getNextActionState(a, now) === 'available'
    )
    const hasWaiting = waitingFor.some(
      w => w.project_id === p.id && getWaitingForState(w, now) !== 'resolved'
    )
    const stale = differenceInDays(now, p.last_reviewed_at ?? p.created_at) > 14
    return !hasAction || !hasWaiting || stale || p.status === 'stalled'
  }).length

  const waitingIssues = waitingFor.filter(
    w => getWaitingForState(w, now) === 'escalated'
  ).length

  const somedayCount = projects.filter(p => p.status === 'someday').length

  return {
    empty_inbox: inboxIssues,
    review_projects: projectIssues,
    check_waiting_for: waitingIssues,
    review_calendar_past: 0,
    review_calendar_future: 0,
    review_someday_maybe: somedayCount,
  }
}

// ─── Step content router ──────────────────────────────────────────────────────

function StepContent({ stepId, onComplete }: { stepId: WeeklyReviewStep; onComplete: () => void }) {
  switch (stepId) {
    case 'empty_inbox':         return <StepEmptyInbox onComplete={onComplete} />
    case 'review_projects':     return <StepProjects onComplete={onComplete} />
    case 'check_waiting_for':   return <StepWaitingFor onComplete={onComplete} />
    case 'review_calendar_past':    return <StepCalendar type="past" onComplete={onComplete} />
    case 'review_calendar_future':  return <StepCalendar type="future" onComplete={onComplete} />
    case 'review_someday_maybe':    return <StepSomeday onComplete={onComplete} />
  }
}

// ─── Step nav indicator ───────────────────────────────────────────────────────

function StepIndicator({ index, done, active }: { index: number; done: boolean; active: boolean }) {
  if (done) {
    return (
      <span className="w-5 h-5 rounded-full bg-accent-green/20 border border-accent-green/40 flex items-center justify-center flex-shrink-0">
        <span className="text-accent-green text-xs leading-none">✓</span>
      </span>
    )
  }
  return (
    <span className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 text-xs leading-none ${
      active
        ? 'bg-accent-blue border-accent-blue text-white'
        : 'border-surface-3 text-gray-600'
    }`}>
      {index + 1}
    </span>
  )
}

// ─── Wizard (only mounted while a review is in progress) ─────────────────────

interface WizardProps {
  review: WeeklyReview
  onFinished: (reviewId: string) => void
}

function ReviewWizard({ review, onFinished }: WizardProps) {
  const { completeStep, finishReview, weeklyReviews } = useStore()
  const issueCounts = useStepIssueCounts()

  // Subscribe to live version so steps_completed updates are reflected
  const liveReview = weeklyReviews.find(r => r.id === review.id) ?? review

  const initialIndex = Math.max(
    0,
    WEEKLY_REVIEW_STEPS.findIndex(s => !liveReview.steps_completed.includes(s))
  )
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const currentStepId = WEEKLY_REVIEW_STEPS[currentIndex]

  function handleCompleteStep() {
    completeStep(liveReview.id, currentStepId)

    if (currentIndex < WEEKLY_REVIEW_STEPS.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      finishReview(liveReview.id)
      onFinished(liveReview.id)
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Step sidebar */}
      <div className="w-56 flex-shrink-0 bg-surface-1 border-r border-surface-2 flex flex-col">
        <div className="px-5 py-5 border-b border-surface-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Weekly Review
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {WEEKLY_REVIEW_STEPS.map((step, index) => {
            const isActive = index === currentIndex
            const isDone = liveReview.steps_completed.includes(step)
            const count = issueCounts[step]

            return (
              <button
                key={step}
                onClick={() => setCurrentIndex(index)}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-left
                  ${isActive
                    ? 'bg-surface-3 text-white'
                    : isDone
                      ? 'text-gray-600 hover:bg-surface-2 hover:text-gray-400'
                      : 'text-gray-400 hover:bg-surface-2 hover:text-gray-200'
                  }
                `}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <StepIndicator index={index} done={isDone} active={isActive} />
                  <span className="truncate text-xs leading-tight">
                    {WEEKLY_REVIEW_STEP_LABELS[step]}
                  </span>
                </span>

                {!isDone && count > 0 && (
                  <span className={`text-xs flex-shrink-0 ml-1 px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-surface-0 text-gray-400' : 'bg-surface-2 text-gray-500'
                  }`}>
                    {count}
                  </span>
                )}
                {isDone && (
                  <span className="text-accent-green text-xs flex-shrink-0">✓</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Progress */}
        <div className="px-4 py-4 border-t border-surface-2">
          <div className="flex gap-1 mb-2">
            {WEEKLY_REVIEW_STEPS.map(step => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  liveReview.steps_completed.includes(step) ? 'bg-accent-green' : 'bg-surface-3'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-600">
            {liveReview.steps_completed.length} / {WEEKLY_REVIEW_STEPS.length} complete
          </p>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden flex flex-col bg-surface-0">
        <StepContent stepId={currentStepId} onComplete={handleCompleteStep} />
      </div>
    </div>
  )
}

// ─── Public view ──────────────────────────────────────────────────────────────

export function WeeklyReviewView() {
  const { weeklyReviews, startReview } = useStore()
  const [completedReviewId, setCompletedReviewId] = useState<string | null>(null)

  const systemState = getWeeklyReviewSystemState(weeklyReviews)

  // Most recent in-progress review
  const activeReview = weeklyReviews
    .filter(r => !r.completed_at)
    .sort((a, b) => b.started_at.getTime() - a.started_at.getTime())[0] ?? null

  // Just-finished review for the complete screen
  const completedReview = weeklyReviews.find(r => r.id === completedReviewId) ?? null

  if (completedReview?.completed_at) {
    return (
      <div className="h-full overflow-y-auto">
        <ReviewComplete
          review={completedReview}
          onDismiss={() => setCompletedReviewId(null)}
        />
      </div>
    )
  }

  if (!activeReview) {
    return (
      <div className="overflow-y-auto h-full" data-system-state={systemState}>
        <ReviewStart reviews={weeklyReviews} onStart={startReview} />
      </div>
    )
  }

  return (
    <div className="h-full overflow-hidden">
      <ReviewWizard
        key={activeReview.id}
        review={activeReview}
        onFinished={setCompletedReviewId}
      />
    </div>
  )
}
