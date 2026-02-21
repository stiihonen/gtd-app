import { useState, useRef, useEffect, type ReactNode, type RefObject } from 'react'
import type { InboxItem } from '../../domain/entities/InboxItem'
import type { Context, EnergyLevel } from '../../domain/entities/NextAction'
import { CONTEXTS, ENERGY_LABELS } from '../../domain/entities/NextAction'
import { useStore } from '../../store'

interface Props {
  item: InboxItem
  onClose: () => void
}

type Step =
  | 'actionable'        // Is it actionable?
  | 'disposition'       // Trash / Someday / Reference
  | 'outcome'           // Desired outcome
  | 'next_action'       // Physical next action text
  | 'project_check'     // Does it need more than 1 action?
  | 'who'               // Me or someone else?
  | 'waiting_details'   // Owner / expected_by
  | 'action_details'    // Context / energy / time

interface FormState {
  outcome: string
  nextActionTitle: string
  isProject: boolean
  who: 'me' | 'someone_else' | null
  waitingOwner: string
  waitingExpectedBy: string
  context: Context
  energy: EnergyLevel
  timeEstimate: string
}

const INITIAL_FORM: FormState = {
  outcome: '',
  nextActionTitle: '',
  isProject: false,
  who: null,
  waitingOwner: '',
  waitingExpectedBy: '',
  context: '@computer',
  energy: 2,
  timeEstimate: '30',
}

export function ClarifyModal({ item, onClose }: Props) {
  const [step, setStep] = useState<Step>('actionable')
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  const { clarifyAsClarified, deleteInboxItem, addProject, addNextAction, addWaitingFor } = useStore()

  useEffect(() => {
    // Auto-focus text inputs when step changes
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [step])

  function patch(partial: Partial<FormState>) {
    setForm(f => ({ ...f, ...partial }))
  }

  // --- Disposition (non-actionable) ---
  function handleDisposition(disposition: InboxItem['disposition']) {
    clarifyAsClarified(item.id, disposition)
    if (disposition === 'trash') deleteInboxItem(item.id)
    onClose()
  }

  // --- Final commit ---
  function commit() {
    const { outcome, nextActionTitle, isProject, who, waitingOwner, waitingExpectedBy,
            context, energy, timeEstimate } = form

    let projectId: string | undefined

    if (isProject) {
      const project = addProject({
        title: outcome,
        outcome_statement: outcome,
      })
      projectId = project.id
    }

    if (who === 'me' || !who) {
      addNextAction({
        title: nextActionTitle,
        context,
        energy,
        time_estimate: parseInt(timeEstimate) || 30,
        project_id: projectId,
      })
    } else {
      addWaitingFor({
        title: nextActionTitle || outcome,
        owner: waitingOwner,
        expected_by: waitingExpectedBy ? new Date(waitingExpectedBy) : undefined,
        project_id: projectId,
      })
    }

    clarifyAsClarified(item.id)
    onClose()
  }

  const STEP_TOTAL = 6
  const STEP_NUMBERS: Partial<Record<Step, number>> = {
    actionable: 1,
    outcome: 2,
    next_action: 3,
    project_check: 4,
    who: 5,
    action_details: 6,
    waiting_details: 6,
  }
  const currentStepNum = STEP_NUMBERS[step] ?? 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg bg-surface-1 rounded-2xl shadow-2xl border border-surface-3 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-surface-3">
          <div className="flex items-start justify-between gap-4 mb-4">
            <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 flex-1">
              {item.content}
            </p>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0 text-lg leading-none"
            >
              ×
            </button>
          </div>
          {/* Progress bar */}
          <div className="flex gap-1">
            {Array.from({ length: STEP_TOTAL }).map((_, i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 rounded-full transition-colors ${
                  i < currentStepNum ? 'bg-accent-blue' : 'bg-surface-3'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 min-h-[220px]">
          {step === 'actionable' && (
            <StepActionable onYes={() => setStep('outcome')} onNo={() => setStep('disposition')} />
          )}

          {step === 'disposition' && (
            <StepDisposition onSelect={handleDisposition} />
          )}

          {step === 'outcome' && (
            <StepOutcome
              value={form.outcome}
              onChange={v => patch({ outcome: v })}
              onNext={() => setStep('next_action')}
              inputRef={inputRef as RefObject<HTMLTextAreaElement>}
            />
          )}

          {step === 'next_action' && (
            <StepNextAction
              value={form.nextActionTitle}
              onChange={v => patch({ nextActionTitle: v })}
              onNext={() => setStep('project_check')}
              inputRef={inputRef as RefObject<HTMLInputElement>}
            />
          )}

          {step === 'project_check' && (
            <StepProjectCheck
              onYes={() => { patch({ isProject: true }); setStep('who') }}
              onNo={() => { patch({ isProject: false }); setStep('who') }}
            />
          )}

          {step === 'who' && (
            <StepWho
              onMe={() => { patch({ who: 'me' }); setStep('action_details') }}
              onSomeoneElse={() => { patch({ who: 'someone_else' }); setStep('waiting_details') }}
            />
          )}

          {step === 'waiting_details' && (
            <StepWaitingDetails
              owner={form.waitingOwner}
              expectedBy={form.waitingExpectedBy}
              onChange={(owner, expectedBy) => patch({ waitingOwner: owner, waitingExpectedBy: expectedBy })}
              onCommit={commit}
              inputRef={inputRef as RefObject<HTMLInputElement>}
            />
          )}

          {step === 'action_details' && (
            <StepActionDetails
              context={form.context}
              energy={form.energy}
              timeEstimate={form.timeEstimate}
              onChange={(context, energy, timeEstimate) =>
                patch({ context, energy, timeEstimate })
              }
              onCommit={commit}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step sub-components ──────────────────────────────────────────────────────

function StepActionable({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">Is this actionable?</h2>
      <p className="text-sm text-gray-500 mb-6">Does this require you to do something?</p>
      <div className="flex gap-3">
        <BigButton onClick={onYes} variant="primary">Yes</BigButton>
        <BigButton onClick={onNo} variant="ghost">No</BigButton>
      </div>
    </div>
  )
}

function StepDisposition({ onSelect }: { onSelect: (d: InboxItem['disposition']) => void }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">What should happen to it?</h2>
      <p className="text-sm text-gray-500 mb-6">Non-actionable items belong in one of these places.</p>
      <div className="flex gap-3">
        <BigButton onClick={() => onSelect('trash')} variant="danger">Trash</BigButton>
        <BigButton onClick={() => onSelect('someday')} variant="ghost">Someday</BigButton>
        <BigButton onClick={() => onSelect('reference')} variant="ghost">Reference</BigButton>
      </div>
    </div>
  )
}

function StepOutcome({
  value, onChange, onNext, inputRef
}: {
  value: string
  onChange: (v: string) => void
  onNext: () => void
  inputRef: RefObject<HTMLTextAreaElement>
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">What's the desired outcome?</h2>
      <p className="text-sm text-gray-500 mb-4">Describe what "done" looks like. One sentence.</p>
      <textarea
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && value.trim()) { e.preventDefault(); onNext() } }}
        placeholder="The project is done when..."
        rows={3}
        className="w-full bg-surface-2 border border-surface-3 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:border-accent-blue/60 transition-colors"
      />
      <div className="mt-3 flex justify-end">
        <ActionButton onClick={onNext} disabled={!value.trim()}>Continue →</ActionButton>
      </div>
    </div>
  )
}

function StepNextAction({
  value, onChange, onNext, inputRef
}: {
  value: string
  onChange: (v: string) => void
  onNext: () => void
  inputRef: RefObject<HTMLInputElement>
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">What's the very next physical action?</h2>
      <p className="text-sm text-gray-500 mb-4">Start with a verb. Be specific.</p>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && value.trim()) onNext() }}
        placeholder="e.g. Call John about the proposal"
        className="w-full bg-surface-2 border border-surface-3 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-accent-blue/60 transition-colors"
      />
      <div className="mt-3 flex justify-end">
        <ActionButton onClick={onNext} disabled={!value.trim()}>Continue →</ActionButton>
      </div>
    </div>
  )
}

function StepProjectCheck({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">Does this require more than one action?</h2>
      <p className="text-sm text-gray-500 mb-6">If yes, it's a project — you'll track it separately.</p>
      <div className="flex gap-3">
        <BigButton onClick={onYes} variant="ghost">Yes — it's a project</BigButton>
        <BigButton onClick={onNo} variant="primary">No — just one action</BigButton>
      </div>
    </div>
  )
}

function StepWho({ onMe, onSomeoneElse }: { onMe: () => void; onSomeoneElse: () => void }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">Who does this?</h2>
      <p className="text-sm text-gray-500 mb-6">If someone else, it becomes a Waiting For item.</p>
      <div className="flex gap-3">
        <BigButton onClick={onMe} variant="primary">Me</BigButton>
        <BigButton onClick={onSomeoneElse} variant="ghost">Someone else</BigButton>
      </div>
    </div>
  )
}

function StepWaitingDetails({
  owner, expectedBy, onChange, onCommit, inputRef
}: {
  owner: string
  expectedBy: string
  onChange: (owner: string, expectedBy: string) => void
  onCommit: () => void
  inputRef: RefObject<HTMLInputElement>
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">Who are you waiting on?</h2>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Person / party</label>
          <input
            ref={inputRef}
            type="text"
            value={owner}
            onChange={e => onChange(e.target.value, expectedBy)}
            onKeyDown={e => { if (e.key === 'Enter' && owner.trim()) onCommit() }}
            placeholder="e.g. John, Legal team"
            className="w-full bg-surface-2 border border-surface-3 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-accent-blue/60 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Expected by (optional)</label>
          <input
            type="date"
            value={expectedBy}
            onChange={e => onChange(owner, e.target.value)}
            className="w-full bg-surface-2 border border-surface-3 rounded-lg px-4 py-2.5 text-sm text-white focus:border-accent-blue/60 transition-colors"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <ActionButton onClick={onCommit} disabled={!owner.trim()}>Add to System</ActionButton>
      </div>
    </div>
  )
}

function StepActionDetails({
  context, energy, timeEstimate, onChange, onCommit
}: {
  context: Context
  energy: EnergyLevel
  timeEstimate: string
  onChange: (context: Context, energy: EnergyLevel, timeEstimate: string) => void
  onCommit: () => void
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">Action details</h2>
      <div className="space-y-4">
        {/* Context */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Context</label>
          <div className="flex flex-wrap gap-1.5">
            {CONTEXTS.map(ctx => (
              <button
                key={ctx}
                onClick={() => onChange(ctx, energy, timeEstimate)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                  context === ctx
                    ? 'bg-accent-blue text-white'
                    : 'bg-surface-2 text-gray-400 hover:bg-surface-3 hover:text-gray-200'
                }`}
              >
                {ctx}
              </button>
            ))}
          </div>
        </div>

        {/* Energy */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Energy required</label>
          <div className="flex gap-2">
            {([1, 2, 3] as EnergyLevel[]).map(e => (
              <button
                key={e}
                onClick={() => onChange(context, e, timeEstimate)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  energy === e
                    ? 'bg-accent-green text-surface-0'
                    : 'bg-surface-2 text-gray-400 hover:bg-surface-3 hover:text-gray-200'
                }`}
              >
                {ENERGY_LABELS[e]}
              </button>
            ))}
          </div>
        </div>

        {/* Time estimate */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Time estimate (minutes)</label>
          <div className="flex gap-1.5 flex-wrap">
            {['5', '15', '30', '60', '90', '120'].map(t => (
              <button
                key={t}
                onClick={() => onChange(context, energy, t)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  timeEstimate === t
                    ? 'bg-accent-purple text-white'
                    : 'bg-surface-2 text-gray-400 hover:bg-surface-3 hover:text-gray-200'
                }`}
              >
                {t}m
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <ActionButton onClick={onCommit}>Add to System</ActionButton>
      </div>
    </div>
  )
}

// ─── Shared button components ─────────────────────────────────────────────────

function BigButton({
  onClick, variant, children
}: {
  onClick: () => void
  variant: 'primary' | 'ghost' | 'danger'
  children: ReactNode
}) {
  const styles = {
    primary: 'bg-accent-blue hover:bg-accent-blue/80 text-white',
    ghost: 'bg-surface-2 hover:bg-surface-3 text-gray-200',
    danger: 'bg-accent-red/20 hover:bg-accent-red/30 text-accent-red border border-accent-red/30',
  }
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors ${styles[variant]}`}
    >
      {children}
    </button>
  )
}

function ActionButton({
  onClick, disabled, children
}: {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-5 py-2 bg-accent-blue hover:bg-accent-blue/80 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
    >
      {children}
    </button>
  )
}
