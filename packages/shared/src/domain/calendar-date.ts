import { TZDate } from '@date-fns/tz'
import type { Window } from './time'

/** Navigable calendar dates (R1). */
export const MIN_CALENDAR_DATE = '2000-01-01'
export const MAX_CALENDAR_DATE = '2099-12-31'

export interface CalendarDateParts {
  year: number
  month: number
  day: number
}

const SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/

const pad = (n: number, width: number) => String(n).padStart(width, '0')

function format({ year, month, day }: CalendarDateParts): string {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`
}

/** Strict `YYYY-MM-DD`: a real calendar date from 2000-01-01 to 2099-12-31, else `null`. */
export function parseCalendarDate(value: string): CalendarDateParts | null {
  const match = SHAPE.exec(value)
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])] as [
    number,
    number,
    number,
  ]
  if (year < 2000 || year > 2099) return null
  const real = new Date(Date.UTC(year, month - 1, day))
  if (real.getUTCMonth() !== month - 1 || real.getUTCDate() !== day) return null
  return { year, month, day }
}

/** Calendar arithmetic on a date string (never "+24 h"). The result may leave the navigable range. */
export function addCalendarDays(date: string, days: number): string {
  const parts = parseCalendarDate(date)
  if (!parts) throw new Error(`Not a calendar date: ${date}`)
  const moved = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days))
  return format({
    year: moved.getUTCFullYear(),
    month: moved.getUTCMonth() + 1,
    day: moved.getUTCDate(),
  })
}

/** The local calendar date of `instant` in `timeZone`. */
export function localCalendarDate(instant: Date, timeZone: string): string {
  const local = new TZDate(instant, timeZone)
  return format({ year: local.getFullYear(), month: local.getMonth() + 1, day: local.getDate() })
}

function localMidnight({ year, month, day }: CalendarDateParts, timeZone: string): Date {
  return new Date(new TZDate(year, month - 1, day, timeZone).getTime())
}

/** The day after `parts`, by calendar arithmetic; the last navigable day ends in 2100. */
function nextDay({ year, month, day }: CalendarDateParts): CalendarDateParts {
  const moved = new Date(Date.UTC(year, month - 1, day + 1))
  return { year: moved.getUTCFullYear(), month: moved.getUTCMonth() + 1, day: moved.getUTCDate() }
}

/** R1 · [local midnight of `date`, local midnight of the next date). 23 h or 25 h on DST days. */
export function dayWindow(date: string, timeZone: string): Window {
  const parts = parseCalendarDate(date)
  if (!parts) throw new Error(`Not a calendar date: ${date}`)
  return { start: localMidnight(parts, timeZone), end: localMidnight(nextDay(parts), timeZone) }
}
