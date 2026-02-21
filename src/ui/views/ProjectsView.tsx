import { useState, type ReactNode } from 'react'
import { useStore } from '../../store'
import type { Project, ProjectStatus } from '../../domain/entities/Project'
import type { CreateProjectInput } from '../../application/commands/projects'
import { getNextActionState } from '../../domain/state-machines/nextAction'
import { getWaitingForState } from '../../domain/state-machines/waitingFor'

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  stalled: 'Stalled',
  someday: 'Someday',
  completed: 'Completed',
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: 'text-accent-green bg-accent-green/10 border-accent-green/20',
  stalled: 'text-accent-amber bg-accent-amber/10 border-accent-amber/20',
  someday: 'text-gray-400 bg-surface-2 border-surface-3',
  completed: 'text-gray-600 bg-surface-2 border-surface-2',
}

export function ProjectsView() {
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('active')

  const { projects, nextActions, waitingFor, addProject, setProjectStatus, deleteProject } = useStore()

  const visible = filter === 'all'
    ? projects
    : projects.filter(p => p.status === filter)

  const sorted = [...visible].sort((a, b) => {
    const order: ProjectStatus[] = ['stalled', 'active', 'someday', 'completed']
    return order.indexOf(a.status) - order.indexOf(b.status)
  })

  function getActionCount(projectId: string) {
    return nextActions.filter(
      a => a.project_id === projectId && getNextActionState(a) === 'available'
    ).length
  }

  function getWaitingCount(projectId: string) {
    return waitingFor.filter(
      w => w.project_id === projectId && getWaitingForState(w) !== 'resolved'
    ).length
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Projects</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 bg-accent-blue hover:bg-accent-blue/80 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Project
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-surface-1 p-1 rounded-lg w-fit">
        {(['all', 'active', 'stalled', 'someday', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-surface-3 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* New project form */}
      {showForm && (
        <ProjectForm
          onSave={input => { addProject(input); setShowForm(false) }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Project list */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-4xl mb-3 opacity-30">◈</div>
          <p className="text-sm">No projects here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              actionCount={getActionCount(project.id)}
              waitingCount={getWaitingCount(project.id)}
              onSetStatus={status => setProjectStatus(project.id, status)}
              onDelete={() => deleteProject(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({
  project, actionCount, waitingCount, onSetStatus, onDelete
}: {
  project: Project
  actionCount: number
  waitingCount: number
  onSetStatus: (s: ProjectStatus) => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-surface-1 border border-surface-2 hover:border-surface-3 rounded-xl transition-colors">
      <div
        className="px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-200">{project.title}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_COLORS[project.status]}`}>
                {STATUS_LABELS[project.status]}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5 truncate">{project.outcome_statement}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 text-xs text-gray-600">
            {actionCount > 0 && <span className="text-accent-green">▷ {actionCount}</span>}
            {waitingCount > 0 && <span className="text-accent-amber">⧖ {waitingCount}</span>}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3 border-t border-surface-2 pt-3">
          <p className="text-xs text-gray-500 mb-3">{project.outcome_statement}</p>
          <div className="flex gap-1.5 flex-wrap">
            {project.status !== 'active' && (
              <StatusBtn onClick={() => onSetStatus('active')} color="green">Activate</StatusBtn>
            )}
            {project.status !== 'someday' && project.status !== 'completed' && (
              <StatusBtn onClick={() => onSetStatus('someday')} color="gray">Someday</StatusBtn>
            )}
            {project.status !== 'completed' && (
              <StatusBtn onClick={() => onSetStatus('completed')} color="gray">Complete</StatusBtn>
            )}
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="px-2.5 py-1 text-xs text-gray-600 hover:text-accent-red transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBtn({ onClick, color, children }: {
  onClick: () => void
  color: 'green' | 'gray'
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
        color === 'green'
          ? 'bg-accent-green/20 text-accent-green hover:bg-accent-green/30'
          : 'bg-surface-2 text-gray-400 hover:bg-surface-3 hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

export function ProjectForm({
  onSave, onCancel
}: {
  onSave: (input: CreateProjectInput) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [outcome, setOutcome] = useState('')

  function handleSubmit() {
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      outcome_statement: outcome.trim() || title.trim(),
    })
  }

  return (
    <div className="bg-surface-1 border border-accent-blue/30 rounded-xl px-4 py-4 mb-4">
      <h3 className="text-sm font-semibold text-white mb-3">New Project</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Title</label>
          <input
            autoFocus
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="Project name"
            className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent-blue/60 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Outcome statement</label>
          <textarea
            value={outcome}
            onChange={e => setOutcome(e.target.value)}
            placeholder="This project is done when..."
            rows={2}
            className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:border-accent-blue/60 transition-colors"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="px-3 py-1.5 bg-accent-blue hover:bg-accent-blue/80 disabled:opacity-30 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  )
}
