import { useState, useRef } from 'react'
import { useStore } from '../../store'
import { ClarifyModal } from '../components/ClarifyModal'
import type { InboxItem } from '../../domain/entities/InboxItem'
import { getInboxItemState } from '../../domain/state-machines/inbox'
import { formatDistanceToNow } from 'date-fns'

export function InboxView() {
  const [input, setInput] = useState('')
  const [clarifying, setClarifying] = useState<InboxItem | null>(null)
  const [showClarified, setShowClarified] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { inboxItems, capture, deleteInboxItem } = useStore()

  function handleCapture() {
    const trimmed = input.trim()
    if (!trimmed) return
    capture(trimmed)
    setInput('')
    inputRef.current?.focus()
  }

  const unclarified = inboxItems.filter(i => getInboxItemState(i) === 'captured')
  const clarified = inboxItems.filter(i => getInboxItemState(i) === 'clarified')

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Inbox</h1>
        {unclarified.length > 0 ? (
          <p className="text-sm text-gray-500 mt-1">
            {unclarified.length} item{unclarified.length !== 1 ? 's' : ''} need clarification
          </p>
        ) : (
          <p className="text-sm text-accent-green mt-1">Inbox zero</p>
        )}
      </div>

      {/* Capture bar */}
      <div className="flex gap-2 mb-8">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCapture() }}
          placeholder="What's on your mind? (Enter to capture)"
          autoFocus
          className="flex-1 bg-surface-1 border border-surface-3 focus:border-accent-blue/60 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors"
        />
        <button
          onClick={handleCapture}
          disabled={!input.trim()}
          className="px-4 py-3 bg-accent-blue hover:bg-accent-blue/80 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
        >
          Capture
        </button>
      </div>

      {/* Unclarified items */}
      {unclarified.length > 0 && (
        <section className="mb-8">
          <div className="space-y-2">
            {unclarified.map(item => (
              <InboxItemRow
                key={item.id}
                item={item}
                onClarify={() => setClarifying(item)}
                onDelete={() => deleteInboxItem(item.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {unclarified.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <div className="text-4xl mb-3 opacity-30">○</div>
          <p className="text-sm">Nothing to clarify.</p>
          <p className="text-xs mt-1">Capture something above.</p>
        </div>
      )}

      {/* Clarified items toggle */}
      {clarified.length > 0 && (
        <div>
          <button
            onClick={() => setShowClarified(v => !v)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1.5"
          >
            <span>{showClarified ? '▾' : '▸'}</span>
            Clarified ({clarified.length})
          </button>

          {showClarified && (
            <div className="mt-3 space-y-2">
              {clarified.map(item => (
                <InboxItemRow
                  key={item.id}
                  item={item}
                  onClarify={() => {}}
                  onDelete={() => deleteInboxItem(item.id)}
                  dimmed
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clarify modal */}
      {clarifying && (
        <ClarifyModal item={clarifying} onClose={() => setClarifying(null)} />
      )}
    </div>
  )
}

function InboxItemRow({
  item, onClarify, onDelete, dimmed
}: {
  item: InboxItem
  onClarify: () => void
  onDelete: () => void
  dimmed?: boolean
}) {
  const age = formatDistanceToNow(item.captured_at, { addSuffix: true })
  const isClarified = getInboxItemState(item) === 'clarified'

  return (
    <div
      className={`group flex items-start gap-3 bg-surface-1 border rounded-xl px-4 py-3 transition-colors ${
        dimmed
          ? 'border-surface-2 opacity-50'
          : 'border-surface-2 hover:border-surface-3'
      }`}
    >
      {/* Status dot */}
      <div className="flex-shrink-0 mt-0.5">
        {isClarified ? (
          <span className="w-4 h-4 flex items-center justify-center text-accent-green text-xs">✓</span>
        ) : (
          <span className="w-4 h-4 rounded-full border border-surface-3 mt-0.5 block" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-relaxed ${isClarified ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
          {item.content}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-600">{age}</span>
          {item.disposition && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-gray-500 capitalize">
              {item.disposition}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isClarified && (
          <button
            onClick={onClarify}
            className="px-2.5 py-1 text-xs bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue rounded-md transition-colors"
          >
            Clarify
          </button>
        )}
        <button
          onClick={onDelete}
          className="px-2 py-1 text-xs text-gray-600 hover:text-accent-red transition-colors rounded-md"
        >
          ×
        </button>
      </div>
    </div>
  )
}
