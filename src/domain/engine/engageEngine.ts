import type { NextAction, EnergyLevel, Context } from '../entities/NextAction'
import type { Project } from '../entities/Project'
import type { WaitingFor } from '../entities/WaitingFor'
import { isEligible } from '../state-machines/nextAction'
import { getWaitingForState } from '../state-machines/waitingFor'

export interface EngageInput {
  available_minutes: number
  energy: EnergyLevel
  contexts: Context[]
}

export interface EngageState {
  nextActions: NextAction[]
  projects: Project[]
  waitingFor: WaitingFor[]
}

export interface ScoreBreakdown {
  urgency: number
  projectStaleness: number
  waitingForRisk: number
  age: number
}

export interface RankedAction {
  action: NextAction
  score: number
  breakdown: ScoreBreakdown
}

export function urgencyScore(action: NextAction, now: Date): number {
  if (!action.due_date) return 0
  const msPerDay = 1000 * 60 * 60 * 24
  const daysUntilDue = (action.due_date.getTime() - now.getTime()) / msPerDay
  if (daysUntilDue < 0) return 80
  if (daysUntilDue <= 1) return 60
  if (daysUntilDue <= 3) return 40
  if (daysUntilDue <= 7) return 25
  return 10
}

export function projectStalenessScore(
  action: NextAction,
  projects: Project[],
  now: Date
): number {
  if (!action.project_id) return 0
  const project = projects.find(p => p.id === action.project_id)
  if (!project) return 0
  if (!project.last_reviewed_at) return 20
  const msPerDay = 1000 * 60 * 60 * 24
  const daysSinceReview = (now.getTime() - project.last_reviewed_at.getTime()) / msPerDay
  return Math.min(daysSinceReview / project.review_interval * 30, 30)
}

export function waitingForRiskScore(
  action: NextAction,
  waitingFor: WaitingFor[],
  now: Date
): number {
  if (!action.project_id) return 0
  const escalatedCount = waitingFor.filter(
    w => w.project_id === action.project_id && getWaitingForState(w, now) === 'escalated'
  ).length
  return Math.min(escalatedCount * 15, 30)
}

export function ageScore(action: NextAction, now: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  const daysSinceCreation = (now.getTime() - action.created_at.getTime()) / msPerDay
  return Math.min(daysSinceCreation / 30 * 20, 20)
}

export function engageEngine(
  input: EngageInput,
  state: EngageState,
  now: Date = new Date()
): RankedAction[] {
  const eligible = state.nextActions.filter(action =>
    isEligible(
      action,
      { contexts: input.contexts, energy: input.energy, availableMinutes: input.available_minutes },
      now
    )
  )

  const ranked = eligible.map(action => {
    const breakdown: ScoreBreakdown = {
      urgency: urgencyScore(action, now),
      projectStaleness: projectStalenessScore(action, state.projects, now),
      waitingForRisk: waitingForRiskScore(action, state.waitingFor, now),
      age: ageScore(action, now),
    }
    const score = breakdown.urgency + breakdown.projectStaleness + breakdown.waitingForRisk + breakdown.age
    return { action, score, breakdown }
  })

  return ranked.sort((a, b) => b.score - a.score)
}
