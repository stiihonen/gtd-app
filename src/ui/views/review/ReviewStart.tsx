import { differenceInDays } from 'date-fns'
import { useStore } from '../../../store'
import { checkIntegrity } from '../../../domain/invariants'
import type { WeeklyReview } from '../../../domain/entities/WeeklyReview'

interface Props {
  reviews: WeeklyReview[]
  onStart: () => void
}

type HealthState = 'healthy' | 'overdue' | 'critical'

const HEALTH_CONFIG: Record<HealthState, {
  label: string
  sub: string
  color: string
  bg: string
  border: string
}> = {
  healthy: {
    label: '✓ System Healthy',
    sub: "You're in good shape.",
    color: 'text-accent-green',
    bg: 'bg-accent-green/10',
    border: 'border-accent-green/20',
  },
  overdue: {
    label: '⚠ Review Overdue',
    sub: 'Your system needs a review.',
    color: 'text-accent-amber',
    bg: 'bg-accent-amber/10',
    border: 'border-accent-amber/20',
  },
  critical: {
    label: '● Review Critically Overdue',
    sub: 'Your system may be drifting. Do this now.',
    color: 'text-accent-red',
    bg: 'bg-accent-red/10',
    border: 'border-accent-red/20',
  },
}

export function ReviewStart({ reviews, onStart }: Props) {
  const { inboxItems, nextActions, projects, waitingFor } = useStore()
  const now = new Date()

  const lastCompleted = reviews
    .filter(r => r.completed_at)
    .sort((a, b) => b.completed_at!.getTime() - a.completed_at!.getTime())[0]

  const daysSince = lastCompleted
    ? differenceInDays(now, lastCompleted.completed_at!)
    : null

  const health: HealthState =
    daysSince === null || daysSince > 14
      ? 'critical'
      : daysSince > 7
        ? 'overdue'
        : 'healthy'

  const { label, sub, color, bg, border } = HEALTH_CONFIG[health]

  const report = checkIntegrity(
    { inboxItems, nextActions, projects, waitingFor, weeklyReviews: reviews },
    now
  )

  const inProgress = reviews.find(r => !r.completed_at)

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold text-white mb-8">Weekly Review</h1>

      {/* Health banner */}
      <div className={`rounded-2xl border ${bg} ${border} px-6 py-5 mb-6`}>
        <div className={`text-base font-semibold ${color} mb-1`}>{label}</div>
        <div className="text-sm text-gray-400">
          {daysSince !== null
            ? <>Last review <span className="text-gray-200">{daysSince} day{daysSince !== 1 ? 's' : ''} ago</span></>
            : 'No completed review found'}
          <span className="mx-2 text-gray-600">·</span>
          {sub}
        </div>
      </div>

      {/* Issues */}
      {report.violations.length > 0 ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Issues detected
            </h3>
            <span className="text-xs text-gray-600">
              {report.hard.length > 0 && (
                <span className="text-accent-red">{report.hard.length} hard</span>
              )}
              {report.hard.length > 0 && report.soft.length > 0 && (
                <span className="text-gray-600"> · </span>
              )}
              {report.soft.length > 0 && (
                <span className="text-gray-500">{report.soft.length} soft</span>
              )}
            </span>
          </div>
          <div className="space-y-1.5">
            {report.violations.slice(0, 8).map((v, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 text-sm px-3 py-2.5 rounded-lg border ${
                  v.severity === 'hard'
                    ? 'bg-accent-red/5 border-accent-red/20 text-red-300'
                    : 'bg-surface-1 border-surface-2 text-gray-400'
                }`}
              >
                <span className={`flex-shrink-0 mt-0.5 text-xs ${v.severity === 'hard' ? 'text-accent-red' : 'text-gray-600'}`}>
                  {v.severity === 'hard' ? '●' : '○'}
                </span>
                <span className="leading-relaxed">{v.message}</span>
              </div>
            ))}
            {report.violations.length > 8 && (
              <p className="text-xs text-gray-600 px-3">
                +{report.violations.length - 8} more — the review will surface them.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-surface-1 border border-surface-2 rounded-xl px-4 py-3 mb-8 text-sm text-gray-500">
          No issues detected. Clean system.
        </div>
      )}

      {/* Start / resume */}
      <button
        onClick={onStart}
        className="w-full py-4 bg-accent-blue hover:bg-accent-blue/80 text-white font-semibold rounded-xl transition-colors text-base"
      >
        {inProgress ? 'Resume Weekly Review' : 'Start Weekly Review'}
      </button>
      <p className="text-center text-xs text-gray-600 mt-3">
        6 steps · typically 15–30 minutes
      </p>
    </div>
  )
}
