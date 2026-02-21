export interface WaitingFor {
  id: string
  title: string
  owner: string
  expected_by?: Date
  project_id?: string
  /** Days between follow-up reminders */
  followup_interval: number
  notes?: string
  created_at: Date
  last_followup_at?: Date
  resolved_at?: Date
}

export type WaitingForState = 'open' | 'escalated' | 'resolved'
