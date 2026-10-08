import { z } from 'zod'
import { instant } from './instant'

/** A note as the write endpoints answer: full reminder state, no body. `null` dates = plain note. */
export const noteResponseSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  tags: z.array(z.object({ name: z.string().min(1), slug: z.string().min(1) })),
  dueAt: instant.nullable(),
  originalDueAt: instant.nullable(),
  snoozeCount: z.number().int().nonnegative(),
  doneAt: instant.nullable(),
})

export type NoteResponse = z.output<typeof noteResponseSchema>

/** POST /notes/:id/snooze (R7): presets only, the client never sends a time. */
export const snoozeRequestSchema = z.object({ preset: z.enum(['hour', 'tomorrow']) })

export type SnoozeRequest = z.infer<typeof snoozeRequestSchema>
export type SnoozePreset = SnoozeRequest['preset']
