export type WeeklyReviewStep =
  | 'empty_inbox'
  | 'review_projects'
  | 'check_waiting_for'
  | 'review_calendar_past'
  | 'review_calendar_future'
  | 'review_someday_maybe'

export const WEEKLY_REVIEW_STEPS: WeeklyReviewStep[] = [
  'empty_inbox',
  'review_projects',
  'check_waiting_for',
  'review_calendar_past',
  'review_calendar_future',
  'review_someday_maybe',
]

export const WEEKLY_REVIEW_STEP_LABELS: Record<WeeklyReviewStep, string> = {
  empty_inbox: 'Empty Inbox',
  review_projects: 'Review Projects',
  check_waiting_for: 'Check Waiting For',
  review_calendar_past: 'Review Past Calendar',
  review_calendar_future: 'Review Future Calendar',
  review_someday_maybe: 'Review Someday/Maybe',
}

export interface WeeklyReview {
  id: string
  started_at: Date
  completed_at?: Date
  steps_completed: WeeklyReviewStep[]
}

export type WeeklyReviewSystemState = 'healthy' | 'overdue'
