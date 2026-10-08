import { TZDate } from '@date-fns/tz'
import { addDays, startOfDay } from 'date-fns'

export interface Window {
  start: Date
  end: Date
}

/** Local midnight of `instant`'s day in `timeZone`, as a UTC instant. */
export function startOfLocalDay(instant: Date, timeZone: string): Date {
  return new Date(startOfDay(new TZDate(instant, timeZone)).getTime())
}

/** Local midnight `days` days after `instant`'s local day (DST-safe: never adds 24 h). */
export function startOfLocalDayPlus(instant: Date, timeZone: string, days: number): Date {
  return new Date(addDays(startOfDay(new TZDate(instant, timeZone)), days).getTime())
}

/** R1 · [local midnight, next local midnight). 23 h or 25 h on DST days. */
export function todayWindow(now: Date, timeZone: string): Window {
  return { start: startOfLocalDay(now, timeZone), end: startOfLocalDayPlus(now, timeZone, 1) }
}

const MINUTE = 60_000

/** Wall-clock reading of `instant` in `timeZone`, as a UTC-based timestamp. */
function wallClock(instant: number, timeZone: string): number {
  return instant - new TZDate(instant, timeZone).getTimezoneOffset() * MINUTE
}

/**
 * `hours:minutes` local time on the local day of `instant` plus `days` (R16).
 * An ambiguous time (DST overlap) resolves to its FIRST occurrence; a
 * nonexistent time (DST gap) resolves to the first valid instant after it.
 */
export function localTimeOn(
  instant: Date,
  timeZone: string,
  days: number,
  hours: number,
  minutes: number,
): Date {
  const dayStart = addDays(startOfDay(new TZDate(instant, timeZone)), days)
  const wall = Date.UTC(
    dayStart.getFullYear(),
    dayStart.getMonth(),
    dayStart.getDate(),
    hours,
    minutes,
  )
  const dayEnd = addDays(dayStart, 1)

  // Candidate instants: the wall time read with each UTC offset in force that day.
  const offsets = new Set(
    [dayStart, dayEnd].map((d) => new TZDate(d.getTime(), timeZone).getTimezoneOffset()),
  )
  const candidates = [...offsets].map((offset) => wall + offset * MINUTE).sort((a, b) => a - b)
  const valid = candidates.find((t) => wallClock(t, timeZone) === wall)
  if (valid !== undefined) return new Date(valid)

  // Gap: bisect (minute resolution) for the earliest instant whose wall time reaches `wall`.
  let lo = (candidates[0] as number) - 24 * 60 * MINUTE
  let hi = (candidates[candidates.length - 1] as number) + 24 * 60 * MINUTE
  while (hi - lo > MINUTE) {
    const mid = lo + Math.floor((hi - lo) / MINUTE / 2) * MINUTE
    if (wallClock(mid, timeZone) >= wall) hi = mid
    else lo = mid
  }
  return new Date(hi)
}

export function truncateToMinute(instant: Date): Date {
  return new Date(Math.floor(instant.getTime() / 60_000) * 60_000)
}
