export type ProjectStatus = 'active' | 'stalled' | 'someday' | 'completed'

export interface Project {
  id: string
  title: string
  /** One-sentence outcome statement: "The project is done when..." */
  outcome_statement: string
  status: ProjectStatus
  /** How often this project should be reviewed, in days */
  review_interval: number
  notes?: string
  created_at: Date
  completed_at?: Date
  last_reviewed_at?: Date
}
