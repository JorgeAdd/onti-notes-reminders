import { clockTime, dayLabel } from '../today/format'

const yearOf = (instant: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en', { timeZone, year: 'numeric' }).format(instant)

const monthOf = (instant: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en', { timeZone, month: 'short' }).format(instant)

/**
 * "Tue 6 17:00": when a note is due, in the profile timezone. The month and year appear only when
 * the year differs from `now`, so a date far from today is never ambiguous.
 */
export function dueLabel(dueAt: Date, now: Date, timeZone: string): string {
  const [weekday, day] = dayLabel(dueAt, timeZone).split(' ')
  const time = clockTime(dueAt, timeZone)
  const year = yearOf(dueAt, timeZone)
  return year === yearOf(now, timeZone)
    ? `${weekday} ${day} ${time}`
    : `${weekday} ${day} ${monthOf(dueAt, timeZone)} ${year} ${time}`
}
