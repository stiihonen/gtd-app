import type { InboxItem, InboxItemState } from '../entities/InboxItem'

export function getInboxItemState(item: InboxItem): InboxItemState {
  return item.clarified ? 'clarified' : 'captured'
}

export function canClarify(item: InboxItem): boolean {
  return !item.clarified
}
