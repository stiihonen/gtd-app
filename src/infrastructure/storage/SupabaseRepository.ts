import { supabase } from '../supabase'
import type { InboxItem } from '../../domain/entities/InboxItem'
import type { NextAction } from '../../domain/entities/NextAction'
import type { Project } from '../../domain/entities/Project'
import type { WaitingFor } from '../../domain/entities/WaitingFor'
import type { WeeklyReview } from '../../domain/entities/WeeklyReview'

export interface AppState {
  inboxItems: InboxItem[]
  nextActions: NextAction[]
  projects: Project[]
  waitingFor: WaitingFor[]
  weeklyReviews: WeeklyReview[]
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

function parseInboxItem(row: Record<string, unknown>): InboxItem {
  return {
    id: row.id as string,
    content: row.content as string,
    captured_at: new Date(row.captured_at as string),
    clarified: row.clarified as boolean,
    clarified_at: row.clarified_at ? new Date(row.clarified_at as string) : undefined,
    disposition: row.disposition as InboxItem['disposition'],
  }
}

function parseProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    title: row.title as string,
    outcome_statement: row.outcome_statement as string,
    status: row.status as Project['status'],
    review_interval: row.review_interval as number,
    notes: row.notes as string | undefined,
    due_date: row.due_date ? new Date(row.due_date as string) : undefined,
    created_at: new Date(row.created_at as string),
    completed_at: row.completed_at ? new Date(row.completed_at as string) : undefined,
    last_reviewed_at: row.last_reviewed_at ? new Date(row.last_reviewed_at as string) : undefined,
  }
}

function parseNextAction(row: Record<string, unknown>): NextAction {
  return {
    id: row.id as string,
    title: row.title as string,
    context: row.context as NextAction['context'],
    energy: row.energy as NextAction['energy'],
    time_estimate: row.time_estimate as number,
    project_id: row.project_id as string | undefined,
    due_date: row.due_date ? new Date(row.due_date as string) : undefined,
    start_date: row.start_date ? new Date(row.start_date as string) : undefined,
    notes: row.notes as string | undefined,
    created_at: new Date(row.created_at as string),
    completed_at: row.completed_at ? new Date(row.completed_at as string) : undefined,
    last_reviewed_at: row.last_reviewed_at ? new Date(row.last_reviewed_at as string) : undefined,
  }
}

function parseWaitingFor(row: Record<string, unknown>): WaitingFor {
  return {
    id: row.id as string,
    title: row.title as string,
    owner: row.owner as string,
    expected_by: row.expected_by ? new Date(row.expected_by as string) : undefined,
    project_id: row.project_id as string | undefined,
    followup_interval: row.followup_interval as number,
    notes: row.notes as string | undefined,
    created_at: new Date(row.created_at as string),
    last_followup_at: row.last_followup_at ? new Date(row.last_followup_at as string) : undefined,
    resolved_at: row.resolved_at ? new Date(row.resolved_at as string) : undefined,
  }
}

function parseWeeklyReview(row: Record<string, unknown>): WeeklyReview {
  return {
    id: row.id as string,
    started_at: new Date(row.started_at as string),
    completed_at: row.completed_at ? new Date(row.completed_at as string) : undefined,
    steps_completed: row.steps_completed as WeeklyReview['steps_completed'],
  }
}

export const supabaseRepo = {
  async load(): Promise<AppState> {
    const userId = await getUserId()

    const [inboxRes, projectsRes, actionsRes, waitingRes, reviewsRes] = await Promise.all([
      supabase.from('inbox_items').select('*').eq('user_id', userId).order('captured_at', { ascending: false }),
      supabase.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('next_actions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('waiting_for').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('weekly_reviews').select('*').eq('user_id', userId).order('started_at', { ascending: false }),
    ])

    return {
      inboxItems: (inboxRes.data || []).map(parseInboxItem),
      projects: (projectsRes.data || []).map(parseProject),
      nextActions: (actionsRes.data || []).map(parseNextAction),
      waitingFor: (waitingRes.data || []).map(parseWaitingFor),
      weeklyReviews: (reviewsRes.data || []).map(parseWeeklyReview),
    }
  },

  async insertInboxItem(item: InboxItem): Promise<void> {
    const userId = await getUserId()
    await supabase.from('inbox_items').insert({
      id: item.id,
      user_id: userId,
      content: item.content,
      captured_at: item.captured_at.toISOString(),
      clarified: item.clarified,
      clarified_at: item.clarified_at?.toISOString(),
      disposition: item.disposition,
    })
  },

  async updateInboxItem(id: string, updates: Partial<InboxItem>): Promise<void> {
    const userId = await getUserId()
    const payload: Record<string, unknown> = {}
    if (updates.content !== undefined) payload.content = updates.content
    if (updates.clarified !== undefined) payload.clarified = updates.clarified
    if (updates.clarified_at !== undefined) payload.clarified_at = updates.clarified_at?.toISOString()
    if (updates.disposition !== undefined) payload.disposition = updates.disposition
    await supabase.from('inbox_items').update(payload).eq('id', id).eq('user_id', userId)
  },

  async deleteInboxItem(id: string): Promise<void> {
    const userId = await getUserId()
    await supabase.from('inbox_items').delete().eq('id', id).eq('user_id', userId)
  },

  async insertProject(p: Project): Promise<void> {
    const userId = await getUserId()
    await supabase.from('projects').insert({
      id: p.id,
      user_id: userId,
      title: p.title,
      outcome_statement: p.outcome_statement,
      status: p.status,
      review_interval: p.review_interval,
      notes: p.notes,
      due_date: p.due_date?.toISOString(),
      created_at: p.created_at.toISOString(),
      completed_at: p.completed_at?.toISOString(),
      last_reviewed_at: p.last_reviewed_at?.toISOString(),
    })
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    const userId = await getUserId()
    const payload: Record<string, unknown> = {}
    if (updates.title !== undefined) payload.title = updates.title
    if (updates.outcome_statement !== undefined) payload.outcome_statement = updates.outcome_statement
    if (updates.status !== undefined) payload.status = updates.status
    if (updates.review_interval !== undefined) payload.review_interval = updates.review_interval
    if (updates.notes !== undefined) payload.notes = updates.notes
    if (updates.due_date !== undefined) payload.due_date = updates.due_date?.toISOString() ?? null
    if (updates.completed_at !== undefined) payload.completed_at = updates.completed_at?.toISOString()
    if (updates.last_reviewed_at !== undefined) payload.last_reviewed_at = updates.last_reviewed_at?.toISOString()
    await supabase.from('projects').update(payload).eq('id', id).eq('user_id', userId)
  },

  async deleteProject(id: string): Promise<void> {
    const userId = await getUserId()
    await supabase.from('projects').delete().eq('id', id).eq('user_id', userId)
  },

  async insertNextAction(a: NextAction): Promise<void> {
    const userId = await getUserId()
    await supabase.from('next_actions').insert({
      id: a.id,
      user_id: userId,
      title: a.title,
      context: a.context,
      energy: a.energy,
      time_estimate: a.time_estimate,
      project_id: a.project_id,
      due_date: a.due_date?.toISOString(),
      start_date: a.start_date?.toISOString(),
      notes: a.notes,
      created_at: a.created_at.toISOString(),
      completed_at: a.completed_at?.toISOString(),
      last_reviewed_at: a.last_reviewed_at?.toISOString(),
    })
  },

  async updateNextAction(id: string, updates: Partial<NextAction>): Promise<void> {
    const userId = await getUserId()
    const payload: Record<string, unknown> = {}
    if (updates.title !== undefined) payload.title = updates.title
    if (updates.context !== undefined) payload.context = updates.context
    if (updates.energy !== undefined) payload.energy = updates.energy
    if (updates.time_estimate !== undefined) payload.time_estimate = updates.time_estimate
    if (updates.project_id !== undefined) payload.project_id = updates.project_id
    if (updates.due_date !== undefined) payload.due_date = updates.due_date?.toISOString()
    if (updates.start_date !== undefined) payload.start_date = updates.start_date?.toISOString()
    if (updates.notes !== undefined) payload.notes = updates.notes
    if (updates.completed_at !== undefined) payload.completed_at = updates.completed_at?.toISOString()
    if (updates.last_reviewed_at !== undefined) payload.last_reviewed_at = updates.last_reviewed_at?.toISOString()
    await supabase.from('next_actions').update(payload).eq('id', id).eq('user_id', userId)
  },

  async deleteNextAction(id: string): Promise<void> {
    const userId = await getUserId()
    await supabase.from('next_actions').delete().eq('id', id).eq('user_id', userId)
  },

  async insertWaitingFor(w: WaitingFor): Promise<void> {
    const userId = await getUserId()
    await supabase.from('waiting_for').insert({
      id: w.id,
      user_id: userId,
      title: w.title,
      owner: w.owner,
      expected_by: w.expected_by?.toISOString(),
      project_id: w.project_id,
      followup_interval: w.followup_interval,
      notes: w.notes,
      created_at: w.created_at.toISOString(),
      last_followup_at: w.last_followup_at?.toISOString(),
      resolved_at: w.resolved_at?.toISOString(),
    })
  },

  async updateWaitingFor(id: string, updates: Partial<WaitingFor>): Promise<void> {
    const userId = await getUserId()
    const payload: Record<string, unknown> = {}
    if (updates.title !== undefined) payload.title = updates.title
    if (updates.owner !== undefined) payload.owner = updates.owner
    if (updates.expected_by !== undefined) payload.expected_by = updates.expected_by?.toISOString()
    if (updates.project_id !== undefined) payload.project_id = updates.project_id
    if (updates.followup_interval !== undefined) payload.followup_interval = updates.followup_interval
    if (updates.notes !== undefined) payload.notes = updates.notes
    if (updates.last_followup_at !== undefined) payload.last_followup_at = updates.last_followup_at?.toISOString()
    if (updates.resolved_at !== undefined) payload.resolved_at = updates.resolved_at?.toISOString()
    await supabase.from('waiting_for').update(payload).eq('id', id).eq('user_id', userId)
  },

  async deleteWaitingFor(id: string): Promise<void> {
    const userId = await getUserId()
    await supabase.from('waiting_for').delete().eq('id', id).eq('user_id', userId)
  },

  async insertWeeklyReview(r: WeeklyReview): Promise<void> {
    const userId = await getUserId()
    await supabase.from('weekly_reviews').insert({
      id: r.id,
      user_id: userId,
      started_at: r.started_at.toISOString(),
      completed_at: r.completed_at?.toISOString(),
      steps_completed: r.steps_completed,
    })
  },

  async updateWeeklyReview(id: string, updates: Partial<WeeklyReview>): Promise<void> {
    const userId = await getUserId()
    const payload: Record<string, unknown> = {}
    if (updates.completed_at !== undefined) payload.completed_at = updates.completed_at?.toISOString()
    if (updates.steps_completed !== undefined) payload.steps_completed = updates.steps_completed
    await supabase.from('weekly_reviews').update(payload).eq('id', id).eq('user_id', userId)
  },
}
