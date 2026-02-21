import type { InboxItem } from '../../domain/entities/InboxItem'
import type { NextAction } from '../../domain/entities/NextAction'
import type { Project } from '../../domain/entities/Project'
import type { WaitingFor } from '../../domain/entities/WaitingFor'
import type { WeeklyReview } from '../../domain/entities/WeeklyReview'
import { deserializeList, serializeList } from './serialization'

const KEYS = {
  inboxItems: 'gtd:inbox',
  nextActions: 'gtd:actions',
  projects: 'gtd:projects',
  waitingFor: 'gtd:waiting',
  weeklyReviews: 'gtd:reviews',
} as const

function load<T>(key: string, entityType: string): T[] {
  const raw = localStorage.getItem(key)
  if (!raw) return []
  try {
    return deserializeList<T>(raw, entityType)
  } catch {
    console.error(`Failed to parse ${key} from localStorage`)
    return []
  }
}

function save<T>(key: string, items: T[]): void {
  localStorage.setItem(key, serializeList(items))
}

export interface AppState {
  inboxItems: InboxItem[]
  nextActions: NextAction[]
  projects: Project[]
  waitingFor: WaitingFor[]
  weeklyReviews: WeeklyReview[]
}

export const repository = {
  load(): AppState {
    return {
      inboxItems: load<InboxItem>(KEYS.inboxItems, 'InboxItem'),
      nextActions: load<NextAction>(KEYS.nextActions, 'NextAction'),
      projects: load<Project>(KEYS.projects, 'Project'),
      waitingFor: load<WaitingFor>(KEYS.waitingFor, 'WaitingFor'),
      weeklyReviews: load<WeeklyReview>(KEYS.weeklyReviews, 'WeeklyReview'),
    }
  },

  saveInboxItems(items: InboxItem[]): void {
    save(KEYS.inboxItems, items)
  },

  saveNextActions(actions: NextAction[]): void {
    save(KEYS.nextActions, actions)
  },

  saveProjects(projects: Project[]): void {
    save(KEYS.projects, projects)
  },

  saveWaitingFor(items: WaitingFor[]): void {
    save(KEYS.waitingFor, items)
  },

  saveWeeklyReviews(reviews: WeeklyReview[]): void {
    save(KEYS.weeklyReviews, reviews)
  },
}
