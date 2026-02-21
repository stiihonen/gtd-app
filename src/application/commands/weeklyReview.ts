import { v4 as uuidv4 } from 'uuid'
import type { WeeklyReview, WeeklyReviewStep } from '../../domain/entities/WeeklyReview'

export function startWeeklyReview(): WeeklyReview {
  return {
    id: uuidv4(),
    started_at: new Date(),
    steps_completed: [],
  }
}

export function completeReviewStep(
  review: WeeklyReview,
  step: WeeklyReviewStep
): WeeklyReview {
  if (review.steps_completed.includes(step)) return review
  return { ...review, steps_completed: [...review.steps_completed, step] }
}

export function finishWeeklyReview(review: WeeklyReview): WeeklyReview {
  return { ...review, completed_at: new Date() }
}
