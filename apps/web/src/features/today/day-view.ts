import { addCalendarDays, dayQuerySchema, parseCalendarDate } from '@onti/shared'

/** The viewed day (`null` is today, so it keeps following midnight) and the tag filter. */
export interface DayView {
  date: string | null
  tag: string | null
}

export const TODAY_VIEW: DayView = { date: null, tag: null }

/** The prefix of every day page in the cache: a write settles by invalidating all of it. */
export const DAY_KEYS = ['day'] as const

/** The one place a day query key is built (Decision 7). */
export const dayKey = (view: DayView) => ['day', view.date ?? 'today', view.tag] as const

const DATE_PARAM = 'd'
const TAG_PARAM = 'tag'

/** One param, valid only when it appears once and passes the shared `dayQuerySchema`. */
function readParam(params: URLSearchParams, name: string, field: 'date' | 'tag'): string | null {
  const values = params.getAll(name)
  if (values.length !== 1) return null
  const parsed = dayQuerySchema.safeParse({ [field]: values[0] })
  return parsed.success ? (parsed.data[field] ?? null) : null
}

/**
 * Decision 8 · the view in `?d=&tag=`. A syntax error is dropped here, so it never reaches the
 * server; unknown params are not part of the view.
 */
export function readView(search: string): DayView {
  const params = new URLSearchParams(search)
  return { date: readParam(params, DATE_PARAM, 'date'), tag: readParam(params, TAG_PARAM, 'tag') }
}

/** The query string for `view`, keeping every param that is not the view's own. */
export function writeView(search: string, view: DayView): string {
  const params = new URLSearchParams(search)
  for (const [name, value] of [
    [DATE_PARAM, view.date],
    [TAG_PARAM, view.tag],
  ] as const) {
    if (value === null) params.delete(name)
    else params.set(name, value)
  }
  const written = params.toString()
  return written === '' ? '' : `?${written}`
}

/**
 * `[` and `]`: the view `delta` calendar days from the viewed date (today when there is none).
 * `null` past the navigable range; today's own date becomes the no-date view.
 */
export function stepView(view: DayView, delta: 1 | -1, todayDate: string): DayView | null {
  const next = addCalendarDays(view.date ?? todayDate, delta)
  if (parseCalendarDate(next) === null) return null
  return { ...view, date: next === todayDate ? null : next }
}
