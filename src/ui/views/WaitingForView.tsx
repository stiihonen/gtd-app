import { useState } from 'react'
import { useStore } from '../../store'
import type { WaitingFor } from '../../domain/entities/WaitingFor'
import type { CreateWaitingForInput } from '../../application/commands/waitingFor'
import { getWaitingForState } from '../../domain/state-machines/waitingFor'
import { formatDistanceToNow, format } from 'date-fns'

const STATE_STYLES = {
  open: 'text-gray-400 bg-surface-2 border-surface-3',
  escalated: 'text-accent-amber bg-accent-amber/10 border-accent-amber/20',
  resolved: 'text-gray-600 bg-surface-2 border-surface-2',
}

export function WaitingForView() {
  const [showForm, setShowForm] = useState(false)
  const [showResolved, setShowResolved] = useState(false)

  const { waitingFor, projects, addWaitingFor, resolve, followUp, deleteWaitingFor } = useStore()

  const open = waitingFor.filter(w => getWaitingForState(w) !== 'resolved')
  const resolved = waitingFor.filter(w => getWaitingForState(w) === 'resolved')

  const sorted = [...open].sort((a, b) => {
    // Escalated first
    const sa = getWaitingForState(a) === 'escalated' ? 0 : 1
    const sb = getWaitingForState(b) === 'escalated' ? 0 : 1
    return sa - sb
  })

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Waiting For</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 bg-accent-blue hover:bg-accent-blue/80 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add
        </button>
      </div>

      {showForm && (
        <WaitingForForm
          projects={projects.filter(p => p.status === 'active')}
          onSave={input => { addWaitingFor(input); setShowForm(false) }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-4xl mb-3 opacity-30">⧖</div>
          <p className="text-sm">Nothing waiting.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(item => (
            <WaitingRow
              key={item.id}
              item={item}
              projectTitle={projects.find(p => p.id === item.project_id)?.title}
              onResolve={() => resolve(item.id)}
              onFollowUp={() => followUp(item.id)}
              onDelete={() => deleteWaitingFor(item.id)}
            />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowResolved(v => !v)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1.5"
          >
            <span>{showResolved ? '▾' : '▸'}</span>
            Resolved ({resolved.length})
          </button>
          {showResolved && (
            <div className="mt-3 space-y-2">
              {resolved.map(item => (
                <WaitingRow
                  key={item.id}
                  item={item}
                  projectTitle={projects.find(p => p.id === item.project_id)?.title}
                  onResolve={() => {}}
                  onFollowUp={() => {}}
                  onDelete={() => deleteWaitingFor(item.id)}
                  dimmed
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function WaitingRow({
  item, projectTitle, onResolve, onFollowUp, onDelete, dimmed
}: {
  item: WaitingFor
  projectTitle?: string
  onResolve: () => void
  onFollowUp: () => void
  onDelete: () => void
  dimmed?: boolean
}) {
  const state = getWaitingForState(item)

  return (
    <div className={`group bg-surface-1 border rounded-xl px-4 py-3 transition-colors ${
      dimmed ? 'border-surface-2 opacity-50' : 'border-surface-2 hover:border-surface-3'
    }`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-200">{item.title}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border capitalize ${STATE_STYLES[state]}`}>
              {state}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-600">
            <span>↳ {item.owner}</span>
            {item.expected_by && (
              <span className={state === 'escalated' ? 'text-accent-amber' : ''}>
                by {format(item.expected_by, 'MMM d')}
              </span>
            )}
            {projectTitle && (
              <span className="px-1.5 py-0.5 bg-surface-2 rounded">{projectTitle}</span>
            )}
            <span>added {formatDistanceToNow(item.created_at, { addSuffix: true })}</span>
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {state !== 'resolved' && (
            <>
              <button
                onClick={onFollowUp}
                className="px-2 py-1 text-xs bg-surface-2 hover:bg-surface-3 text-gray-400 hover:text-gray-200 rounded transition-colors"
              >
                Followed up
              </button>
              <button
                onClick={onResolve}
                className="px-2 py-1 text-xs bg-accent-green/20 hover:bg-accent-green/30 text-accent-green rounded transition-colors"
              >
                Resolve
              </button>
            </>
          )}
          <button
            onClick={onDelete}
            className="px-2 py-1 text-xs text-gray-600 hover:text-accent-red transition-colors"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

function WaitingForForm({
  projects, onSave, onCancel
}: {
  projects: { id: string; title: string }[]
  onSave: (input: CreateWaitingForInput) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [owner, setOwner] = useState('')
  const [expectedBy, setExpectedBy] = useState('')
  const [projectId, setProjectId] = useState('')

  function handleSave() {
    if (!title.trim() || !owner.trim()) return
    onSave({
      title: title.trim(),
      owner: owner.trim(),
      expected_by: expectedBy ? new Date(expectedBy) : undefined,
      project_id: projectId || undefined,
    })
  }

  return (
    <div className="bg-surface-1 border border-accent-blue/30 rounded-xl px-4 py-4 mb-4">
      <h3 className="text-sm font-semibold text-white mb-3">New Waiting For</h3>
      <div className="space-y-3">
        <input
          autoFocus
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What are you waiting for?"
          className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent-blue/60 transition-colors"
        />
        <input
          type="text"
          value={owner}
          onChange={e => setOwner(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          placeholder="From who?"
          className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent-blue/60 transition-colors"
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">Expected by</label>
            <input
              type="date"
              value={expectedBy}
              onChange={e => setExpectedBy(e.target.value)}
              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-1.5 text-xs text-gray-300"
            />
          </div>
          {projects.length > 0 && (
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Project</label>
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
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || !owner.trim()}
            className="px-3 py-1.5 bg-accent-blue hover:bg-accent-blue/80 disabled:opacity-30 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
