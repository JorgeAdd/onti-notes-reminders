import { z } from 'zod'
import { TAG_SLUG } from './domain/tag'
import { truncateToMinute } from './domain/time'
import { instant } from './instant'
import { CAPTURE_LIMITS } from './timezone'

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

/** A due instant as the capture request carries it: seconds and milliseconds are dropped (R11). */
const minuteInstant = z.codec(z.iso.datetime(), z.date(), {
  decode: (iso) => truncateToMinute(new Date(iso)),
  encode: (date) => date.toISOString(),
})

/**
 * POST /notes (R11): the structured result of the capture parse. Tag names are NOT sent; the
 * server derives them from the slugs. A past `dueAt` is valid (an explicit "today 09:00").
 */
export const captureRequestSchema = z.object({
  title: z.string().trim().min(1).max(CAPTURE_LIMITS.titleMax),
  tags: z
    .array(z.string().max(CAPTURE_LIMITS.slugMax).regex(TAG_SLUG))
    .max(CAPTURE_LIMITS.tagsMax)
    .refine((slugs) => new Set(slugs).size === slugs.length, 'Tag slugs must be unique'),
  dueAt: minuteInstant.nullable(),
})

export type CaptureRequest = z.output<typeof captureRequestSchema>
