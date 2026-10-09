import { z } from 'zod'
import { TAG_SLUG } from './domain/tag'
import { truncateToMinute } from './domain/time'
import { instant } from './instant'
import { CAPTURE_LIMITS } from './timezone'

/** R20: the longest body, in UTF-16 code units (the unit `z.string().max()` counts). */
export const NOTE_LIMITS = { bodyMax: 20000 } as const

/** A note as the write endpoints answer: full reminder state, no body. `null` dates = plain note. */
export const noteResponseSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  tags: z.array(z.object({ name: z.string().min(1), slug: z.string().min(1) })),
  dueAt: instant.nullable(),
  originalDueAt: instant.nullable(),
  snoozeCount: z.number().int().nonnegative(),
  doneAt: instant.nullable(),
  /** Required: the optimistic undated list (R19) orders by it, so a forgotten select must fail. */
  createdAt: instant,
})

export type NoteResponse = z.output<typeof noteResponseSchema>

/** One note with its body, as GET /notes/:id answers (R20 limits the body to `bodyMax`). */
export const noteDetailSchema = noteResponseSchema.extend({
  body: z.string().max(NOTE_LIMITS.bodyMax),
})

/** GET /notes/:id: `now` and `timezone` let the view format due times without a second call. */
export const noteDetailResponseSchema = z.object({
  now: instant,
  timezone: z.string().min(1),
  note: noteDetailSchema,
})

export type NoteDetail = z.output<typeof noteDetailSchema>
export type NoteDetailResponse = z.output<typeof noteDetailResponseSchema>

/** POST /notes/:id/snooze (R7): presets only, the client never sends a time. */
export const snoozeRequestSchema = z.object({ preset: z.enum(['hour', 'tomorrow']) })

export type SnoozeRequest = z.infer<typeof snoozeRequestSchema>
export type SnoozePreset = SnoozeRequest['preset']

/** A due instant as the capture request carries it: seconds and milliseconds are dropped (R11). */
const minuteInstant = z.codec(z.iso.datetime(), z.date(), {
  decode: (iso) => truncateToMinute(new Date(iso)),
  encode: (date) => date.toISOString(),
})

const slugList = z
  .array(z.string().max(CAPTURE_LIMITS.slugMax).regex(TAG_SLUG))
  .max(CAPTURE_LIMITS.tagsMax)
  .refine((slugs) => new Set(slugs).size === slugs.length, 'Tag slugs must be unique')

/**
 * POST /notes (R11): the structured result of the capture parse. Tag names are NOT sent; the
 * server derives them from the slugs. A past `dueAt` is valid (an explicit "today 09:00").
 */
export const captureRequestSchema = z.object({
  title: z.string().trim().min(1).max(CAPTURE_LIMITS.titleMax),
  tags: slugList,
  dueAt: minuteInstant.nullable(),
})

export type CaptureRequest = z.output<typeof captureRequestSchema>

/** Postgres `text` cannot store U+0000, so it must be a 400 here instead of a 500 there. */
const hasNoNul = (value: string) => !value.includes('\u0000')

/**
 * PATCH /notes/:id (R20, R8): every field optional, at least one required. `dueAt` has three
 * states: absent = unchanged, `null` = remove the reminder, a value = reschedule. Tag names are
 * not accepted (R11: the server derives them) and zod strips them as unknown keys.
 */
export const noteUpdateRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(CAPTURE_LIMITS.titleMax).refine(hasNoNul),
    /** R20: a body may be empty; only the title may not. */
    body: z.string().max(NOTE_LIMITS.bodyMax).refine(hasNoNul),
    tags: slugList,
    dueAt: minuteInstant.nullable(),
  })
  .partial()
  .refine(
    (patch) => Object.values(patch).some((value) => value !== undefined),
    'At least one field is required',
  )

export type NoteUpdateRequest = z.output<typeof noteUpdateRequestSchema>
