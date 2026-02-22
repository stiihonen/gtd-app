import { create } from 'zustand'
import { supabaseRepo } from '../infrastructure/storage/SupabaseRepository'
import type { InboxItem } from '../domain/entities/InboxItem'
import type { NextAction } from '../domain/entities/NextAction'
import type { Project } from '../domain/entities/Project'
import type { WaitingFor } from '../domain/entities/WaitingFor'
import type { WeeklyReview } from '../domain/entities/WeeklyReview'
import { captureInboxItem, markClarified } from '../application/commands/inbox'
import { createProject, updateProjectStatus, markProjectReviewed } from '../application/commands/projects'
import { createNextAction, completeNextAction, uncompleteNextAction } from '../application/commands/nextActions'
import { createWaitingFor, resolveWaitingFor, markFollowedUp } from '../application/commands/waitingFor'
import { startWeeklyReview, completeReviewStep, finishWeeklyReview } from '../application/commands/weeklyReview'
import { shouldStall } from '../domain/state-machines/project'
import type { CreateProjectInput } from '../application/commands/projects'
import type { CreateNextActionInput } from '../application/commands/nextActions'
import type { CreateWaitingForInput } from '../application/commands/waitingFor'
import type { ProjectStatus } from '../domain/entities/Project'
import type { WeeklyReviewStep } from '../domain/entities/WeeklyReview'

interface GTDState {
  inboxItems: InboxItem[]
  nextActions: NextAction[]
  projects: Project[]
  waitingFor: WaitingFor[]
  weeklyReviews: WeeklyReview[]
  isLoading: boolean

  loadData: () => Promise<void>

  // Inbox
  capture: (content: string) => void
  clarifyAsClarified: (id: string, disposition?: InboxItem['disposition']) => void
  deleteInboxItem: (id: string) => void

  // Projects
  addProject: (input: CreateProjectInput) => Project
  setProjectStatus: (id: string, status: ProjectStatus) => void
  setProjectDueDate: (id: string, dueDate?: Date) => void
  reviewProject: (id: string) => void
  deleteProject: (id: string) => void

  // Next Actions
  addNextAction: (input: CreateNextActionInput) => NextAction
  complete: (id: string) => void
  uncomplete: (id: string) => void
  deleteNextAction: (id: string) => void

  // Waiting For
  addWaitingFor: (input: CreateWaitingForInput) => WaitingFor
  resolve: (id: string) => void
  followUp: (id: string) => void
  deleteWaitingFor: (id: string) => void

  // Weekly Review
  startReview: () => WeeklyReview
  completeStep: (reviewId: string, step: WeeklyReviewStep) => void
  finishReview: (reviewId: string) => void
}

export const useStore = create<GTDState>((set, get) => ({
  inboxItems: [],
  nextActions: [],
  projects: [],
  waitingFor: [],
  weeklyReviews: [],
  isLoading: true,

  async loadData() {
    set({ isLoading: true })
    try {
      const data = await supabaseRepo.load()
      set({
        inboxItems: data.inboxItems,
        nextActions: data.nextActions,
        projects: data.projects,
        waitingFor: data.waitingFor,
        weeklyReviews: data.weeklyReviews,
        isLoading: false,
      })
    } catch (error) {
      console.error('Failed to load data:', error)
      set({ isLoading: false })
    }
  },

  // --- Inbox ---
  capture(content) {
    const item = captureInboxItem(content)
    set(s => {
      const updated = [item, ...s.inboxItems]
      return { inboxItems: updated }
    })
    supabaseRepo.insertInboxItem(item).catch(console.error)
  },

  clarifyAsClarified(id, disposition) {
    set(s => {
      const updated = s.inboxItems.map(i =>
        i.id === id ? markClarified(i, disposition) : i
      )
      return { inboxItems: updated }
    })
    const item = get().inboxItems.find(i => i.id === id)
    if (item) {
      supabaseRepo.updateInboxItem(id, {
        clarified: item.clarified,
        clarified_at: item.clarified_at,
        disposition: item.disposition,
      }).catch(console.error)
    }
  },

  deleteInboxItem(id) {
    set(s => {
      const updated = s.inboxItems.filter(i => i.id !== id)
      return { inboxItems: updated }
    })
    supabaseRepo.deleteInboxItem(id).catch(console.error)
  },

  // --- Projects ---
  addProject(input) {
    const project = createProject(input)
    set(s => {
      const updated = [project, ...s.projects]
      return { projects: updated }
    })
    supabaseRepo.insertProject(project).catch(console.error)
    return project
  },

  setProjectStatus(id, status) {
    set(s => {
      const updated = s.projects.map(p =>
        p.id === id ? updateProjectStatus(p, status) : p
      )
      return { projects: updated }
    })
    const project = get().projects.find(p => p.id === id)
    if (project) {
      supabaseRepo.updateProject(id, { status }).catch(console.error)
    }
  },

  setProjectDueDate(id, dueDate) {
    set(s => ({ projects: s.projects.map(p => p.id === id ? { ...p, due_date: dueDate } : p) }))
    supabaseRepo.updateProject(id, { due_date: dueDate }).catch(console.error)
  },

  reviewProject(id) {
    set(s => {
      const updated = s.projects.map(p =>
        p.id === id ? markProjectReviewed(p) : p
      )
      return { projects: updated }
    })
    const project = get().projects.find(p => p.id === id)
    if (project) {
      supabaseRepo.updateProject(id, { last_reviewed_at: project.last_reviewed_at }).catch(console.error)
    }
  },

  deleteProject(id) {
    set(s => {
      const updated = s.projects.filter(p => p.id !== id)
      return { projects: updated }
    })
    supabaseRepo.deleteProject(id).catch(console.error)
  },

  // --- Next Actions ---
  addNextAction(input) {
    const action = createNextAction(input)
    set(s => {
      const updated = [action, ...s.nextActions]
      return { nextActions: updated }
    })
    supabaseRepo.insertNextAction(action).catch(console.error)
    return action
  },

  complete(id) {
    set(s => {
      const updated = s.nextActions.map(a =>
        a.id === id ? completeNextAction(a) : a
      )
      return { nextActions: updated }
    })
    const action = get().nextActions.find(a => a.id === id)
    if (action) {
      supabaseRepo.updateNextAction(id, { completed_at: action.completed_at }).catch(console.error)
    }
  },

  uncomplete(id) {
    set(s => {
      const updated = s.nextActions.map(a =>
        a.id === id ? uncompleteNextAction(a) : a
      )
      return { nextActions: updated }
    })
    const action = get().nextActions.find(a => a.id === id)
    if (action) {
      supabaseRepo.updateNextAction(id, { completed_at: action.completed_at }).catch(console.error)
    }
  },

  deleteNextAction(id) {
    set(s => {
      const updated = s.nextActions.filter(a => a.id !== id)
      return { nextActions: updated }
    })
    supabaseRepo.deleteNextAction(id).catch(console.error)
  },

  // --- Waiting For ---
  addWaitingFor(input) {
    const item = createWaitingFor(input)
    set(s => {
      const updated = [item, ...s.waitingFor]
      return { waitingFor: updated }
    })
    supabaseRepo.insertWaitingFor(item).catch(console.error)
    return item
  },

  resolve(id) {
    set(s => {
      const updated = s.waitingFor.map(w =>
        w.id === id ? resolveWaitingFor(w) : w
      )
      return { waitingFor: updated }
    })
    const item = get().waitingFor.find(w => w.id === id)
    if (item) {
      supabaseRepo.updateWaitingFor(id, { resolved_at: item.resolved_at }).catch(console.error)
    }
  },

  followUp(id) {
    set(s => {
      const updated = s.waitingFor.map(w =>
        w.id === id ? markFollowedUp(w) : w
      )
      return { waitingFor: updated }
    })
    const item = get().waitingFor.find(w => w.id === id)
    if (item) {
      supabaseRepo.updateWaitingFor(id, { last_followup_at: item.last_followup_at }).catch(console.error)
    }
  },

  deleteWaitingFor(id) {
    set(s => {
      const updated = s.waitingFor.filter(w => w.id !== id)
      return { waitingFor: updated }
    })
    supabaseRepo.deleteWaitingFor(id).catch(console.error)
  },

  // --- Weekly Review ---
  startReview() {
    const review = startWeeklyReview()
    set(s => {
      const updated = [...s.weeklyReviews, review]
      return { weeklyReviews: updated }
    })
    supabaseRepo.insertWeeklyReview(review).catch(console.error)
    return review
  },

  completeStep(reviewId, step) {
    set(s => {
      const updated = s.weeklyReviews.map(r =>
        r.id === reviewId ? completeReviewStep(r, step) : r
      )
      return { weeklyReviews: updated }
    })
    const review = get().weeklyReviews.find(r => r.id === reviewId)
    if (review) {
      supabaseRepo.updateWeeklyReview(reviewId, { steps_completed: review.steps_completed }).catch(console.error)
    }
  },

  finishReview(reviewId) {
    set(s => {
      const updated = s.weeklyReviews.map(r =>
        r.id === reviewId ? finishWeeklyReview(r) : r
      )
      return { weeklyReviews: updated }
    })
    const review = get().weeklyReviews.find(r => r.id === reviewId)
    if (review) {
      supabaseRepo.updateWeeklyReview(reviewId, { completed_at: review.completed_at }).catch(console.error)
    }

    const { projects, nextActions, waitingFor } = get()
    const updatedProjects = projects.map(p => {
      if (p.status === 'active' && shouldStall(p, nextActions, waitingFor)) {
        return updateProjectStatus(p, 'stalled')
      }
      return p
    })
    set({ projects: updatedProjects })

    updatedProjects.forEach(p => {
      const orig = projects.find(op => op.id === p.id)
      if (orig && orig.status !== p.status) {
        supabaseRepo.updateProject(p.id, { status: p.status }).catch(console.error)
      }
    })
  },
}))
