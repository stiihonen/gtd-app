import { v4 as uuidv4 } from 'uuid'
import type { WaitingFor } from '../../domain/entities/WaitingFor'

export interface CreateWaitingForInput {
  title: string
  owner: string
  expected_by?: Date
  project_id?: string
  followup_interval?: number
  notes?: string
}

export function createWaitingFor(input: CreateWaitingForInput): WaitingFor {
  return {
    id: uuidv4(),
    title: input.title,
    owner: input.owner,
    expected_by: input.expected_by,
    project_id: input.project_id,
    followup_interval: input.followup_interval ?? 7,
    notes: input.notes,
    created_at: new Date(),
  }
}

export function resolveWaitingFor(item: WaitingFor): WaitingFor {
  return { ...item, resolved_at: new Date() }
}

export function markFollowedUp(item: WaitingFor): WaitingFor {
  return { ...item, last_followup_at: new Date() }
}
