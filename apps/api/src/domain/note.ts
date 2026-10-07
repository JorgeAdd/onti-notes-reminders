import type { PageNote } from '@onti/shared'

/** A note as the Today page needs it: reminder fields, title and tags (no body). */
export interface NoteRecord extends PageNote {
  title: string
  tags: { name: string; slug: string }[]
}
