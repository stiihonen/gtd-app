import { useState } from 'react'
import { useStore } from '../../store'
import type { Context, EnergyLevel } from '../../domain/entities/NextAction'
import { CONTEXTS, ENERGY_LABELS } from '../../domain/entities/NextAction'
import { engageEngine, type RankedAction } from '../../domain/engine/engageEngine'
import { formatDistanceToNow } from 'date-fns'

export function FocusView() {
  const [context, setContext] = useState<Context>(CONTEXTS[0])
  const [energy, setEnergy] = useState<EnergyLevel>(2)
  const [availableMinutes, setAvailableMinutes] = useState(30)

  const nextActions = useStore(s => s.nextActions)
  const projects    = useStore(s => s.projects)
  const waitingFor  = useStore(s => s.waitingFor)
  const complete    = useStore(s => s.complete)

  const ranked = engageEngine(
    { context, energy, available_minutes: availableMinutes },
    { nextActions, projects, waitingFor }
  )

  const top3 = ranked.slice(0, 3)

  const energyColors: Record<EnergyLevel, string> = {
    1: 'bg-accent-green text-surface-0',
    2: 'bg-accent-amber text-surface-0',
    3: 'bg-accent-red text-surface-0',
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-white mb-6">◎ Focus</h1>

      {/* Inputs */}
      <div className="bg-surface-1 border border-surface-2 rounded-xl px-5 py-4 mb-6 space-y-4">
        {/* Context */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Context</label>
          <select
            value={context}
            onChange={e => setContext(e.target.value as Context)}
            className="bg-surface-2 border border-surface-3 rounded-lg px-3 py-1.5 text-sm text-gray-200 w-full"
          >
            {CONTEXTS.map(ctx => (
              <option key={ctx} value={ctx}>{ctx}</option>
            ))}
          </select>
        </div>

        {/* Energy */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Energy</label>
          <div className="flex gap-2">
            {([1, 2, 3] as EnergyLevel[]).map(e => (
              <button
                key={e}
                onClick={() => setEnergy(e)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  energy === e
                    ? energyColors[e]
                    : 'bg-surface-2 text-gray-500 hover:text-gray-300'
                }`}
              >
                {ENERGY_LABELS[e]}
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Available time</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={5}
              max={480}
              step={5}
              value={availableMinutes}
              onChange={e => setAvailableMinutes(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 bg-surface-2 border border-surface-3 rounded-lg px-3 py-1.5 text-sm text-gray-200"
            />
            <span className="text-xs text-gray-600">min</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        <h2 className="text-xs font-semibold tracking-widest text-gray-600 uppercase mb-3">
          Top suggestions
        </h2>

        {top3.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <div className="text-4xl mb-3 opacity-30">◎</div>
            <p className="text-sm">No actions match your current context, energy, and time.</p>
            <p className="text-xs mt-1 text-gray-700">Try adjusting the filters above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {top3.map((ranked, i) => (
              <FocusActionRow
                key={ranked.action.id}
                rank={i + 1}
                ranked={ranked}
                projectTitle={projects.find(p => p.id === ranked.action.project_id)?.title}
                onComplete={() => complete(ranked.action.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const RANK_STYLES = [
  'bg-accent-blue text-white',
  'bg-surface-3 text-gray-300',
  'bg-surface-2 text-gray-500',
]

function FocusActionRow({
  rank, ranked, projectTitle, onComplete,
}: {
  rank: number
  ranked: RankedAction
  projectTitle?: string
  onComplete: () => void
}) {
  const { action, breakdown } = ranked
  const energyDotColors: Record<EnergyLevel, string> = {
    1: 'text-accent-green',
    2: 'text-accent-amber',
    3: 'text-accent-red',
  }

  return (
    <div className="flex items-start gap-3 bg-surface-1 border border-surface-2 hover:border-surface-3 rounded-xl px-4 py-3 transition-colors">
      {/* Rank badge */}
      <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 ${RANK_STYLES[rank - 1]}`}>
        {rank}
      </span>

      {/* Checkbox */}
      <button
        onClick={onComplete}
        className="flex-shrink-0 w-4 h-4 mt-0.5 rounded border border-surface-3 hover:border-accent-green transition-colors flex items-center justify-center"
        title="Complete action"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 leading-relaxed">{action.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs font-mono text-gray-500">{action.context}</span>
          <span className={`text-xs ${energyDotColors[action.energy]}`}>
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
        {/* Score breakdown (subtle) */}
        <ScoreHint breakdown={breakdown} />
      </div>
    </div>
  )
}

function ScoreHint({ breakdown }: { breakdown: RankedAction['breakdown'] }) {
  const parts: string[] = []
  if (breakdown.urgency > 0) parts.push(`urgency +${breakdown.urgency}`)
  if (breakdown.projectStaleness > 0) parts.push(`stale +${Math.round(breakdown.projectStaleness)}`)
  if (breakdown.waitingForRisk > 0) parts.push(`blocked +${breakdown.waitingForRisk}`)
  if (breakdown.age > 0) parts.push(`age +${Math.round(breakdown.age)}`)
  if (parts.length === 0) return null
  return (
    <p className="text-xs text-gray-700 mt-1">{parts.join(' · ')}</p>
  )
}
