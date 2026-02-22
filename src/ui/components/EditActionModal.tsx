import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import type { NextAction, Context, EnergyLevel } from '../../domain/entities/NextAction'
import { CONTEXTS, ENERGY_LABELS } from '../../domain/entities/NextAction'

export function EditActionModal({
  action,
  projects,
  onSave,
  onClose,
}: {
  action: NextAction
  projects: { id: string; title: string }[]
  onSave: (updates: Partial<NextAction>) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(action.title)
  const [context, setContext] = useState<Context>(action.context)
  const [energy, setEnergy] = useState<EnergyLevel>(action.energy)
  const [timeEstimate, setTimeEstimate] = useState(String(action.time_estimate))
  const [dueDate, setDueDate] = useState(
    action.due_date ? format(action.due_date, 'yyyy-MM-dd') : ''
  )
  const [projectId, setProjectId] = useState(action.project_id ?? '')

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleSave() {
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      context,
      energy,
      time_estimate: parseInt(timeEstimate) || 30,
      due_date: dueDate ? new Date(dueDate) : undefined,
      project_id: projectId || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-surface-1 border border-surface-3 rounded-xl px-5 py-5 shadow-xl">
        <h3 className="text-sm font-semibold text-white mb-4">Edit Action</h3>

        <div className="space-y-3">
          {/* Title */}
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
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:border-accent-blue/60 transition-colors"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="px-3 py-1.5 bg-accent-blue hover:bg-accent-blue/80 disabled:opacity-30 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
