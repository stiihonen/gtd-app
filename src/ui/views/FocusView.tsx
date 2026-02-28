import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import type { Context, EnergyLevel } from '../../domain/entities/NextAction'
import { CONTEXTS, ENERGY_LABELS } from '../../domain/entities/NextAction'
import { engageEngine, type RankedAction } from '../../domain/engine/engageEngine'
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar'
import { formatDistanceToNow, format } from 'date-fns'

export function FocusView() {
  const [contexts, setContexts] = useState<Context[]>(['@computer'])
  const [energy, setEnergy] = useState<EnergyLevel>(2)
  const [availableMinutes, setAvailableMinutes] = useState(30)
  const [calendarSetTime, setCalendarSetTime] = useState(false)

  const nextActions = useStore(s => s.nextActions)
  const projects    = useStore(s => s.projects)
  const waitingFor  = useStore(s => s.waitingFor)
  const complete    = useStore(s => s.complete)

  const { isConnected, events, loading: calLoading, calendarList, selectedCalendarIds, toggleCalendar, signIn, signOut } = useGoogleCalendar()

  // Find the next non-all-day event that starts in the future
  const now = new Date()
  const nextEvent = events.find(e => !e.allDay && e.start > now) ?? null

  // When events load and there is an upcoming event, auto-set available time
  useEffect(() => {
    if (!nextEvent) return
    const minutesUntil = Math.floor((nextEvent.start.getTime() - now.getTime()) / 60000)
    const suggested = Math.max(5, minutesUntil - 5)
    setAvailableMinutes(suggested)
    setCalendarSetTime(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextEvent?.id])

  const toggleContext = (ctx: Context) => {
    setContexts(prev => {
      if (prev.includes(ctx)) {
        // Keep at least one selected
        if (prev.length === 1) return prev
        return prev.filter(c => c !== ctx)
      }
      return [...prev, ctx]
    })
  }

  const ranked = engageEngine(
    { contexts, energy, available_minutes: availableMinutes },
    { nextActions, projects, waitingFor }
  )

  const top3 = ranked.slice(0, 3)
  const upcomingEvents = events.filter(e => !e.allDay && e.start > now).slice(0, 3)
  const allDayEvents = events.filter(e => e.allDay)

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
        {/* Context chips (multi-select) */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Context</label>
          <div className="flex flex-wrap gap-1.5">
            {CONTEXTS.map(ctx => {
              const selected = contexts.includes(ctx)
              return (
                <button
                  key={ctx}
                  onClick={() => toggleContext(ctx)}
                  className={`px-2.5 py-1 rounded-full text-xs font-mono transition-colors ${
                    selected
                      ? 'bg-accent-blue text-white'
                      : 'bg-surface-2 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {ctx}
                </button>
              )
            })}
          </div>
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
              onChange={e => {
                setAvailableMinutes(Math.max(1, parseInt(e.target.value) || 1))
                setCalendarSetTime(false)
              }}
              className="w-24 bg-surface-2 border border-surface-3 rounded-lg px-3 py-1.5 text-sm text-gray-200"
            />
            <span className="text-xs text-gray-600">min</span>
            {calendarSetTime && nextEvent && (
              <span className="text-xs text-gray-500">from calendar</span>
            )}
          </div>
        </div>

        {/* Google Calendar section */}
        <div className="border-t border-surface-2 pt-3">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs text-gray-500">Calendar</label>
            {isConnected && (
              <button
                onClick={signOut}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                disconnect
              </button>
            )}
          </div>

          {!isConnected ? (
            <button
              onClick={signIn}
              className="text-xs px-3 py-1.5 bg-surface-2 border border-surface-3 text-gray-400 hover:text-gray-200 rounded-lg transition-colors"
            >
              Connect Google Calendar
            </button>
          ) : calLoading ? (
            <p className="text-xs text-gray-600">Loading events…</p>
          ) : (
            <>
              {calendarList.length > 1 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {calendarList.map(cal => (
                    <button
                      key={cal.id}
                      onClick={() => toggleCalendar(cal.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-mono transition-colors ${
                        selectedCalendarIds.includes(cal.id)
                          ? 'bg-accent-blue text-white'
                          : 'bg-surface-2 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {cal.summary}
                    </button>
                  ))}
                </div>
              )}
              {upcomingEvents.length === 0 && allDayEvents.length === 0 ? (
                <p className="text-xs text-gray-600">No more events today</p>
              ) : (
                <div className="space-y-1.5">
                  {allDayEvents.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {allDayEvents.map(event => (
                        <span
                          key={event.id}
                          className="text-xs px-2 py-0.5 bg-surface-2 text-gray-500 rounded-full"
                        >
                          {event.title}
                        </span>
                      ))}
                    </div>
                  )}
                  {upcomingEvents.map(event => {
                    const minutesAway = Math.floor((event.start.getTime() - now.getTime()) / 60000)
                    return (
                      <div key={event.id} className="flex items-center gap-2 text-xs">
                        <span className="text-gray-300 truncate flex-1">{event.title}</span>
                        <span className="text-gray-600 flex-shrink-0">{format(event.start, 'HH:mm')}</span>
                        <span className="text-gray-700 flex-shrink-0">in {minutesAway}m</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
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
