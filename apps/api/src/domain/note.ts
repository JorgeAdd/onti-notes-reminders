import type { PageNote } from '@onti/shared'

/** A note as the Today page needs it: reminder fields, title, tags and creation time (no body). */
export interface NoteRecord extends PageNote {
  title: string
  tags: { name: string; slug: string }[]
  createdAt: Date
}

/** One note with its body, as the note view reads it (R20: at most 20 000 characters). */
export interface NoteDetail extends NoteRecord {
  body: string
}
