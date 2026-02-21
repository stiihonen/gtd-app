import { v4 as uuidv4 } from 'uuid'
import type { NextAction, Context, EnergyLevel } from '../../domain/entities/NextAction'

export interface CreateNextActionInput {
  title: string
  context: Context
  energy: EnergyLevel
  time_estimate: number
  project_id?: string
  due_date?: Date
  start_date?: Date
  notes?: string
}

export function createNextAction(input: CreateNextActionInput): NextAction {
  return {
    id: uuidv4(),
    title: input.title,
    context: input.context,
    energy: input.energy,
    time_estimate: input.time_estimate,
    project_id: input.project_id,
    due_date: input.due_date,
    start_date: input.start_date,
    notes: input.notes,
    created_at: new Date(),
  }
}

export function completeNextAction(action: NextAction): NextAction {
  return { ...action, completed_at: new Date() }
}

export function uncompleteNextAction(action: NextAction): NextAction {
  return { ...action, completed_at: undefined }
}

export function markActionReviewed(action: NextAction): NextAction {
  return { ...action, last_reviewed_at: new Date() }
}
