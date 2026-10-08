import { z } from 'zod'
import { instant } from './instant'

/** `excerptMax` is in UTF-16 code units, the unit `z.string().max()` counts. */
export const SEARCH_LIMITS = { qMax: 200, resultsMax: 50, excerptMax: 120 } as const

/** Query string of GET /notes. */
export const notesQuerySchema = z.object({ q: z.string().max(SEARCH_LIMITS.qMax).optional() })

export const noteListItemSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  tags: z.array(z.object({ name: z.string().min(1), slug: z.string().min(1) })),
  dueAt: instant.nullable(),
  doneAt: instant.nullable(),
  excerpt: z.string().max(SEARCH_LIMITS.excerptMax),
})

/**
 * GET /notes: the caller's notes, newest first, at most 50. `total` counts ALL the caller's notes,
 * never narrowed by `q`. `now` and `timezone` let the web format due times without a second call.
 */
export const notesListResponseSchema = z.object({
  now: instant,
  timezone: z.string().min(1),
  total: z.number().int().nonnegative(),
  notes: z.array(noteListItemSchema).max(SEARCH_LIMITS.resultsMax),
})

export type NotesQuery = z.output<typeof notesQuerySchema>
export type NoteListItem = z.output<typeof noteListItemSchema>
export type NotesListResponse = z.output<typeof notesListResponseSchema>
