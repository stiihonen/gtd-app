import type { InboxItem } from '../entities/InboxItem'
import type { NextAction } from '../entities/NextAction'
import type { Project } from '../entities/Project'
import type { WaitingFor } from '../entities/WaitingFor'
import type { WeeklyReview } from '../entities/WeeklyReview'
import { getNextActionState } from '../state-machines/nextAction'
import { getWaitingForState } from '../state-machines/waitingFor'
import { isReviewCriticallyOverdue } from '../state-machines/weeklyReview'
import { differenceInHours, differenceInDays } from 'date-fns'

export type ViolationSeverity = 'hard' | 'soft'

export interface DomainViolation {
  severity: ViolationSeverity
  entity_type: 'project' | 'next_action' | 'waiting_for' | 'inbox_item' | 'weekly_review'
  entity_id: string
  rule: string
  message: string
}

export interface IntegrityReport {
  violations: DomainViolation[]
  hard: DomainViolation[]
  soft: DomainViolation[]
  clean: boolean
}

export function checkIntegrity(
  state: {
    inboxItems: InboxItem[]
    nextActions: NextAction[]
    projects: Project[]
    waitingFor: WaitingFor[]
    weeklyReviews: WeeklyReview[]
  },
  now: Date = new Date()
): IntegrityReport {
  const violations: DomainViolation[] = []

  const { inboxItems, nextActions, projects, waitingFor, weeklyReviews } = state

  // --- Hard: Active project without next action or waiting-for ---
  projects
    .filter(p => p.status === 'active')
    .forEach(p => {
      const hasAction = nextActions
        .filter(a => a.project_id === p.id)
        .some(a => getNextActionState(a, now) === 'available')
      const hasWaiting = waitingFor
        .filter(w => w.project_id === p.id)
        .some(w => getWaitingForState(w, now) !== 'resolved')

      if (!hasAction && !hasWaiting) {
        violations.push({
          severity: 'hard',
          entity_type: 'project',
          entity_id: p.id,
          rule: 'active_project_must_have_next_action_or_waiting_for',
          message: `Project "${p.title}" is active but has no available next action or open waiting-for.`,
        })
      }
    })

  // --- Hard: NextAction linked to non-active project ---
  nextActions
    .filter(a => a.project_id && getNextActionState(a, now) === 'available')
    .forEach(a => {
      const project = projects.find(p => p.id === a.project_id)
      if (project && project.status !== 'active') {
        violations.push({
          severity: 'hard',
          entity_type: 'next_action',
          entity_id: a.id,
          rule: 'action_must_belong_to_active_project',
          message: `Action "${a.title}" is linked to project "${project.title}" which is not active (${project.status}).`,
        })
      }
    })

  // --- Hard: Weekly review critically overdue (>14 days) ---
  if (isReviewCriticallyOverdue(weeklyReviews, now)) {
    violations.push({
      severity: 'hard',
      entity_type: 'weekly_review',
      entity_id: 'system',
      rule: 'weekly_review_not_critically_overdue',
      message: 'Weekly review is more than 14 days overdue.',
    })
  }

  // --- Soft: Inbox item older than 48 hours ---
  inboxItems
    .filter(i => !i.clarified)
    .forEach(i => {
      if (differenceInHours(now, i.captured_at) > 48) {
        violations.push({
          severity: 'soft',
          entity_type: 'inbox_item',
          entity_id: i.id,
          rule: 'inbox_item_clarified_within_48h',
          message: `Inbox item "${i.content.slice(0, 40)}" is unclarified for more than 48 hours.`,
        })
      }
    })

  // --- Soft: Waiting-for needing follow-up ---
  waitingFor
    .filter(w => getWaitingForState(w, now) === 'escalated')
    .forEach(w => {
      violations.push({
        severity: 'soft',
        entity_type: 'waiting_for',
        entity_id: w.id,
        rule: 'waiting_for_followed_up_within_interval',
        message: `Waiting on "${w.owner}" for "${w.title}" needs follow-up.`,
      })
    })

  // --- Soft: Project not reviewed within interval ---
  projects
    .filter(p => p.status === 'active' || p.status === 'stalled')
    .forEach(p => {
      const lastReview = p.last_reviewed_at ?? p.created_at
      if (differenceInDays(now, lastReview) > p.review_interval) {
        violations.push({
          severity: 'soft',
          entity_type: 'project',
          entity_id: p.id,
          rule: 'project_reviewed_within_interval',
          message: `Project "${p.title}" has not been reviewed in ${p.review_interval}+ days.`,
        })
      }
    })

  // --- Soft: Action not reviewed in 30 days ---
  nextActions
    .filter(a => getNextActionState(a, now) === 'available')
    .forEach(a => {
      const lastReview = a.last_reviewed_at ?? a.created_at
      if (differenceInDays(now, lastReview) > 30) {
        violations.push({
          severity: 'soft',
          entity_type: 'next_action',
          entity_id: a.id,
          rule: 'action_reviewed_within_30_days',
          message: `Action "${a.title}" has not been reviewed in 30+ days.`,
        })
      }
    })

  const hard = violations.filter(v => v.severity === 'hard')
  const soft = violations.filter(v => v.severity === 'soft')

  return { violations, hard, soft, clean: violations.length === 0 }
}
