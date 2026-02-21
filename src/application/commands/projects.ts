import { v4 as uuidv4 } from 'uuid'
import type { Project, ProjectStatus } from '../../domain/entities/Project'

export interface CreateProjectInput {
  title: string
  outcome_statement: string
  review_interval?: number
  notes?: string
}

export function createProject(input: CreateProjectInput): Project {
  return {
    id: uuidv4(),
    title: input.title,
    outcome_statement: input.outcome_statement,
    status: 'active',
    review_interval: input.review_interval ?? 7,
    notes: input.notes,
    created_at: new Date(),
  }
}

export function updateProjectStatus(
  project: Project,
  status: ProjectStatus
): Project {
  return {
    ...project,
    status,
    ...(status === 'completed' ? { completed_at: new Date() } : {}),
  }
}

export function markProjectReviewed(project: Project): Project {
  return { ...project, last_reviewed_at: new Date() }
}
