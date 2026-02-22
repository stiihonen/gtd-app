import { useState, type ReactNode } from 'react'
import { useStore } from '../../store'
import type { NextAction, Context, EnergyLevel } from '../../domain/entities/NextAction'
import { CONTEXTS, ENERGY_LABELS } from '../../domain/entities/NextAction'
import type { CreateNextActionInput } from '../../application/commands/nextActions'
import { getNextActionState } from '../../domain/state-machines/nextAction'
import { formatDistanceToNow } from 'date-fns'
import { EditActionModal } from '../components/EditActionModal'

export function ActionsView() {
  const [showForm, setShowForm] = useState(false)
  const [contextFilter, setContextFilter] = useState<Context | 'all'>('all')
  const [showCompleted, setShowCompleted] = useState(false)
  const [editingAction, setEditingAction] = useState<NextAction | null>(null)

  const { nextActions, projects, addNextAction, complete, uncomplete, deleteNextAction, updateNextAction } = useStore()

  const available = nextActions.filter(a => getNextActionState(a) === 'available')
  const completed = nextActions.filter(a => getNextActionState(a) === 'completed')

  const filtered = contextFilter === 'all'
    ? available
    : available.filter(a => a.context === contextFilter)

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {editingAction && (
        <EditActionModal
          action={editingAction}
          projects={projects.filter(p => p.status === 'active')}
          onClose={() => setEditingAction(null)}
          onSave={updates => { updateNextAction(editingAction.id, updates); setEditingAction(null) }}
        />
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Next Actions</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 bg-accent-blue hover:bg-accent-blue/80 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Action
        </button>
      </div>

      {/* Context filter */}
      <div className="flex gap-1.5 mb-6 flex-wrap">
        <ContextChip active={contextFilter === 'all'} onClick={() => setContextFilter('all')}>
          All
        </ContextChip>
        {CONTEXTS.map(ctx => {
          const count = available.filter(a => a.context === ctx).length
          if (count === 0 && contextFilter !== ctx) return null
          return (
            <ContextChip key={ctx} active={contextFilter === ctx} onClick={() => setContextFilter(ctx)}>
              {ctx} {count > 0 && <span className="opacity-60">·{count}</span>}
            </ContextChip>
          )
        })}
      </div>

      {/* New action form */}
      {showForm && (
        <NextActionForm
          projects={projects.filter(p => p.status === 'active')}
          onSave={input => { addNextAction(input); setShowForm(false) }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Action list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-4xl mb-3 opacity-30">▷</div>
          <p className="text-sm">No available actions{contextFilter !== 'all' ? ` for ${contextFilter}` : ''}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(action => (
            <ActionRow
              key={action.id}
              action={action}
              projectTitle={projects.find(p => p.id === action.project_id)?.title}
              onComplete={() => complete(action.id)}
              onDelete={() => deleteNextAction(action.id)}
              onEdit={() => setEditingAction(action)}
            />
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowCompleted(v => !v)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1.5"
          >
            <span>{showCompleted ? '▾' : '▸'}</span>
            Completed ({completed.length})
          </button>
          {showCompleted && (
            <div className="mt-3 space-y-2">
              {completed.map(action => (
                <ActionRow
                  key={action.id}
                  action={action}
                  projectTitle={projects.find(p => p.id === action.project_id)?.title}
                  onComplete={() => uncomplete(action.id)}
                  onDelete={() => deleteNextAction(action.id)}
                  dimmed
                  onEdit={() => setEditingAction(action)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ActionRow({
  action, projectTitle, onComplete, onDelete, onEdit, dimmed
}: {
  action: NextAction
  projectTitle?: string
  onComplete: () => void
  onDelete: () => void
  onEdit?: () => void
  dimmed?: boolean
}) {
  const isDone = !!action.completed_at
  const energyColors: Record<EnergyLevel, string> = {
    1: 'text-accent-green',
    2: 'text-accent-amber',
    3: 'text-accent-red',
  }

  return (
    <div className={`group flex items-start gap-3 bg-surface-1 border rounded-xl px-4 py-3 transition-colors ${
      dimmed ? 'border-surface-2 opacity-50' : 'border-surface-2 hover:border-surface-3'
    }`}>
      {/* Checkbox */}
      <button
        onClick={onComplete}
        className={`flex-shrink-0 w-4 h-4 mt-0.5 rounded border transition-colors flex items-center justify-center ${
          isDone
            ? 'bg-accent-green border-accent-green text-surface-0'
            : 'border-surface-3 hover:border-accent-green'
        }`}
      >
        {isDone && <span className="text-xs leading-none">✓</span>}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-relaxed ${isDone ? 'text-gray-600 line-through' : 'text-gray-200'}`}>
          {action.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs font-mono text-gray-500">{action.context}</span>
          <span className={`text-xs ${energyColors[action.energy]}`}>
            {ENERGY_LABELS[action.energy]}
          </span>
          <span className="text-xs text-gray-600">{action.time_estimate}m</span>
          {projectTitle && (
            <span className="text-xs px-1.5 py-0.5 bg-surface-2 text-gray-500 rounded">
              {projectTitle}
            </span>
          )}
          {action.due_date && (
            <span className="text-xs text-accent-amber">
              due {formatDistanceToNow(action.due_date, { addSuffix: true })}
            </span>
          )}
        </div>
      </div>

      {/* Edit */}
      {onEdit && (
        <button
          onClick={onEdit}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-xs text-gray-600 hover:text-accent-blue transition-all"
        >
          ✎
        </button>
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-xs text-gray-600 hover:text-accent-red transition-all"
      >
        ×
      </button>
    </div>
  )
}

function ContextChip({
  active, onClick, children
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
        active
          ? 'bg-accent-blue text-white'
          : 'bg-surface-1 text-gray-500 hover:bg-surface-2 hover:text-gray-300'
      }`}
    >
      {children}
    </button>
  )
}

export function NextActionForm({
  projects, onSave, onCancel
}: {
  projects: { id: string; title: string }[]
  onSave: (input: CreateNextActionInput) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [context, setContext] = useState<Context>('@computer')
  const [energy, setEnergy] = useState<EnergyLevel>(2)
  const [timeEstimate, setTimeEstimate] = useState('30')
  const [projectId, setProjectId] = useState('')
  const [dueDate, setDueDate] = useState('')

  function handleSave() {
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      context,
      energy,
      time_estimate: parseInt(timeEstimate) || 30,
      project_id: projectId || undefined,
      due_date: dueDate ? new Date(dueDate) : undefined,
    })
  }

  return (
    <div className="bg-surface-1 border border-accent-blue/30 rounded-xl px-4 py-4 mb-4">
      <h3 className="text-sm font-semibold text-white mb-3">New Next Action</h3>
      <div className="space-y-3">
        <input
          autoFocus
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          placeholder="Start with a verb..."
          className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent-blue/60 transition-colors"
        />

        {/* Context */}
        <div className="flex flex-wrap gap-1">
          {CONTEXTS.map(ctx => (
            <button
              key={ctx}
              onClick={() => setContext(ctx)}
              className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                context === ctx ? 'bg-accent-blue text-white' : 'bg-surface-2 text-gray-500 hover:text-gray-300'
              }`}
            >
              {ctx}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          {/* Energy */}
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">Energy</label>
            <div className="flex gap-1">
              {([1, 2, 3] as EnergyLevel[]).map(e => (
                <button
                  key={e}
                  onClick={() => setEnergy(e)}
                  className={`flex-1 py-1 rounded text-xs transition-colors ${
                    energy === e ? 'bg-accent-green text-surface-0' : 'bg-surface-2 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {ENERGY_LABELS[e]}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Minutes</label>
            <select
              value={timeEstimate}
              onChange={e => setTimeEstimate(e.target.value)}
              className="bg-surface-2 border border-surface-3 rounded px-2 py-1 text-xs text-gray-300"
            >
              {['5', '15', '30', '60', '90', '120'].map(t => (
                <option key={t} value={t}>{t}m</option>
              ))}
            </select>
          </div>
        </div>

        {/* Project */}
        {projects.length > 0 && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">Project (optional)</label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-1.5 text-xs text-gray-300"
            >
              <option value="">— none —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Due date */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Due date (optional)</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:border-accent-blue/60 transition-colors" />
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-3 py-1.5 bg-accent-blue hover:bg-accent-blue/80 disabled:opacity-30 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Add Action
          </button>
        </div>
      </div>
    </div>
  )
}
