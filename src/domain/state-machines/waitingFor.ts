import type { WaitingFor, WaitingForState } from '../entities/WaitingFor'
import { addDays } from 'date-fns'

export function getWaitingForState(
  item: WaitingFor,
  now: Date = new Date()
): WaitingForState {
  if (item.resolved_at) return 'resolved'

  if (item.expected_by && item.expected_by < now) return 'escalated'

  if (item.last_followup_at) {
    const nextFollowup = addDays(item.last_followup_at, item.followup_interval)
    if (nextFollowup < now) return 'escalated'
  } else {
    // Never followed up — escalate if older than followup_interval
    const nextFollowup = addDays(item.created_at, item.followup_interval)
    if (nextFollowup < now) return 'escalated'
  }

  return 'open'
}
