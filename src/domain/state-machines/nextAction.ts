import type { NextAction, NextActionState } from '../entities/NextAction'

export function getNextActionState(
  action: NextAction,
  now: Date = new Date()
): NextActionState {
  if (action.completed_at) return 'completed'
  if (action.start_date && action.start_date > now) return 'deferred'
  return 'available'
}

export function isEligible(
  action: NextAction,
  opts: { contexts: string[]; energy: number; availableMinutes: number },
  now: Date = new Date()
): boolean {
  if (getNextActionState(action, now) !== 'available') return false
  if (!opts.contexts.includes(action.context)) return false
  if (action.energy > opts.energy) return false
  if (action.time_estimate > opts.availableMinutes) return false
  return true
}
