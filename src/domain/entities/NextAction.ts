export type EnergyLevel = 1 | 2 | 3

export type Context =
  | '@computer'
  | '@calls'
  | '@home'
  | '@errands'
  | '@office'
  | '@agenda'
  | '@anywhere'

export const CONTEXTS: Context[] = [
  '@computer',
  '@calls',
  '@home',
  '@errands',
  '@office',
  '@agenda',
  '@anywhere',
]

export const ENERGY_LABELS: Record<EnergyLevel, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
}

export interface NextAction {
  id: string
  title: string
  context: Context
  energy: EnergyLevel
  /** Minutes */
  time_estimate: number
  project_id?: string
  due_date?: Date
  start_date?: Date
  notes?: string
  created_at: Date
  completed_at?: Date
  last_reviewed_at?: Date
}

export type NextActionState = 'available' | 'deferred' | 'completed'
