/**
 * Serializes/deserializes domain entities for localStorage.
 * Dates are stored as ISO strings and parsed back on load.
 */

const DATE_FIELDS: Record<string, string[]> = {
  InboxItem: ['captured_at', 'clarified_at'],
  NextAction: ['due_date', 'start_date', 'created_at', 'completed_at', 'last_reviewed_at'],
  Project: ['created_at', 'completed_at', 'last_reviewed_at'],
  WaitingFor: ['expected_by', 'created_at', 'last_followup_at', 'resolved_at'],
  WeeklyReview: ['started_at', 'completed_at'],
  CalendarItem: ['start_at', 'end_at'],
}

function parseDates<T>(obj: Record<string, unknown>, fields: string[]): T {
  const result = { ...obj }
  for (const field of fields) {
    if (result[field] != null) {
      result[field] = new Date(result[field] as string)
    }
  }
  return result as T
}

export function deserializeList<T>(json: string, entityType: string): T[] {
  const raw: Record<string, unknown>[] = JSON.parse(json)
  const fields = DATE_FIELDS[entityType] ?? []
  return raw.map(item => parseDates<T>(item, fields))
}

export function serializeList<T>(items: T[]): string {
  return JSON.stringify(items)
}
