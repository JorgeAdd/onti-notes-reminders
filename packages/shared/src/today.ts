import { z } from 'zod'
import { parseCalendarDate } from './domain/calendar-date'
import { TAG_SLUG } from './domain/tag'
import { instant } from './instant'

/** A real calendar date `YYYY-MM-DD` from 2000-01-01 to 2099-12-31 (R1). */
const calendarDate = z.string().refine((value) => parseCalendarDate(value) !== null, {
  message: 'Expected a calendar date YYYY-MM-DD between 2000 and 2099',
})

const tagSlug = z.string().max(40).regex(TAG_SLUG)

/** GET /today query: the viewed day and the tag filter. Unknown keys are ignored. */
export const dayQuerySchema = z.object({
  date: calendarDate.optional(),
  tag: tagSlug.optional(),
})

export type DayQuery = z.output<typeof dayQuerySchema>

const todayItemSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  tags: z.array(z.object({ name: z.string().min(1), slug: z.string().min(1) })),
  dueAt: instant,
  originalDueAt: instant,
  snoozeCount: z.number().int().nonnegative(),
  doneAt: instant.nullable(),
})

/** A filtered view's "other notes": matches not on the page; undated notes have no dates. */
const otherItemSchema = todayItemSchema.extend({
  dueAt: instant.nullable(),
  originalDueAt: instant.nullable(),
})

/** GET /today — the day page as the server decides it (R1–R5); the client decides how time reads. */
export const todayResponseSchema = z.object({
  now: instant,
  timezone: z.string().min(1),
  /** The viewed local day (`window` is that day's window, not necessarily today's). */
  date: calendarDate,
  isToday: z.boolean(),
  /** The active tag filter, or `null`. */
  tag: tagSlug.nullable(),
  /** Every tag of the account, sorted by slug, so the tag bar can cycle while filtered. */
  tags: z.array(z.object({ slug: z.string().min(1), name: z.string().min(1) })),
  /** R12 · notes hidden by the filter (0 when unfiltered). */
  hiddenCount: z.number().int().nonnegative(),
  /** R12 · filtered only: matching notes that are not on the page. Empty when unfiltered. */
  others: z.array(otherItemSchema),
  window: z.object({ start: instant, end: instant }),
  openCount: z.number().int().nonnegative(),
  anyDoneToday: z.boolean(),
  otherCount: z.number().int().nonnegative(),
  carried: z.array(z.object({ day: instant, items: z.array(todayItemSchema) })),
  rail: z.array(todayItemSchema),
})

export type TodayItem = z.output<typeof todayItemSchema>
export type OtherItem = z.output<typeof otherItemSchema>
export type TodayResponse = z.output<typeof todayResponseSchema>
