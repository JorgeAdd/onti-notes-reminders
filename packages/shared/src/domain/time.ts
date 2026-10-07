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

/** `hours:minutes` local time on the local day of `instant` plus `days`. */
export function localTimeOn(
  instant: Date,
  timeZone: string,
  days: number,
  hours: number,
  minutes: number,
): Date {
  const day = addDays(startOfDay(new TZDate(instant, timeZone)), days)
  day.setHours(hours, minutes, 0, 0)
  return new Date(day.getTime())
}

export function truncateToMinute(instant: Date): Date {
  return new Date(Math.floor(instant.getTime() / 60_000) * 60_000)
}
