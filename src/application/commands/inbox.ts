import { v4 as uuidv4 } from 'uuid'
import type { InboxItem } from '../../domain/entities/InboxItem'

export function captureInboxItem(content: string): InboxItem {
  return {
    id: uuidv4(),
    content: content.trim(),
    captured_at: new Date(),
    clarified: false,
  }
}

export function markClarified(
  item: InboxItem,
  disposition?: InboxItem['disposition']
): InboxItem {
  return {
    ...item,
    clarified: true,
    clarified_at: new Date(),
    ...(disposition ? { disposition } : {}),
  }
}
