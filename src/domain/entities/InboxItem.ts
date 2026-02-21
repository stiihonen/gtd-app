export interface InboxItem {
  id: string
  content: string
  captured_at: Date
  clarified: boolean
  clarified_at?: Date
  /** Set when the item is resolved non-actionably */
  disposition?: 'trash' | 'someday' | 'reference'
}

export type InboxItemState = 'captured' | 'clarified'
