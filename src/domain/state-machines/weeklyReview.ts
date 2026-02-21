import type { WeeklyReview, WeeklyReviewSystemState } from '../entities/WeeklyReview'
import { differenceInDays } from 'date-fns'

export function getWeeklyReviewSystemState(
  reviews: WeeklyReview[],
  now: Date = new Date()
): WeeklyReviewSystemState {
  const lastCompleted = reviews
    .filter(r => r.completed_at)
    .sort((a, b) => b.completed_at!.getTime() - a.completed_at!.getTime())[0]

  if (!lastCompleted) return 'overdue'

  const daysSince = differenceInDays(now, lastCompleted.completed_at!)
  return daysSince > 7 ? 'overdue' : 'healthy'
}

export function isReviewCriticallyOverdue(
  reviews: WeeklyReview[],
  now: Date = new Date()
): boolean {
  const lastCompleted = reviews
    .filter(r => r.completed_at)
    .sort((a, b) => b.completed_at!.getTime() - a.completed_at!.getTime())[0]

  if (!lastCompleted) return true

  return differenceInDays(now, lastCompleted.completed_at!) > 14
}
