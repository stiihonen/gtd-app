import type { Project, ProjectStatus } from '../entities/Project'
import type { NextAction } from '../entities/NextAction'
import type { WaitingFor } from '../entities/WaitingFor'
import { getNextActionState } from './nextAction'
import { getWaitingForState } from './waitingFor'

export function getProjectStatus(project: Project): ProjectStatus {
  return project.status
}

/**
 * Derives whether a project should be marked stalled based on its next actions
 * and waiting-for items. Does NOT mutate — caller must apply the transition.
 */
export function shouldStall(
  project: Project,
  nextActions: NextAction[],
  waitingFor: WaitingFor[],
  now: Date = new Date()
): boolean {
  if (project.status !== 'active') return false

  const hasAvailableAction = nextActions
    .filter(a => a.project_id === project.id)
    .some(a => getNextActionState(a, now) === 'available')

  const hasOpenWaiting = waitingFor
    .filter(w => w.project_id === project.id)
    .some(w => getWaitingForState(w, now) !== 'resolved')

  return !hasAvailableAction && !hasOpenWaiting
}

export function canActivate(project: Project): boolean {
  return project.status === 'stalled' || project.status === 'someday'
}

export function canComplete(project: Project): boolean {
  return project.status === 'active' || project.status === 'stalled'
}

export function canDefer(project: Project): boolean {
  return project.status === 'active'
}
