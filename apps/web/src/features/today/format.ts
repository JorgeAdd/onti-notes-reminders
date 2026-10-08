import { relativeTo } from '@onti/shared'
import { messages } from '../../messages'

const LOCALE = 'en'

/** R2/R6 · "late {duration}" / "in {duration}": shared rule, words from messages. */
export function relativeLabel(dueAt: Date, now: Date): string {
  const relative = relativeTo(dueAt, now)
  return relative.kind === 'late'
    ? messages.today.late(relative.duration)
    : messages.today.upcoming(relative.duration)
}

function parts(instant: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  const out: Record<string, string> = {}
  for (const part of new Intl.DateTimeFormat(LOCALE, { timeZone, ...options }).formatToParts(
    instant,
  )) {
    out[part.type] = part.value
  }
  return out
}

/** "Tue 6": weekday and day in the profile timezone. */
export function dayLabel(instant: Date, timeZone: string): string {
  const p = parts(instant, timeZone, { weekday: 'short', day: 'numeric' })
  return `${p.weekday} ${p.day}`
}

/** "09:05": local 24 h clock in the profile timezone. */
export function clockTime(instant: Date, timeZone: string): string {
  const p = parts(instant, timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  return `${p.hour}:${p.minute}`
}

/** Local hour number (0-23) in the profile timezone. */
export function localHour(instant: Date, timeZone: string): number {
  return Number(parts(instant, timeZone, { hour: 'numeric', hourCycle: 'h23' }).hour)
}

/** Date block parts in the profile timezone: "7", "Wednesday", "October 2026". */
export function dateBlock(instant: Date, timeZone: string) {
  const p = parts(instant, timeZone, {
    day: 'numeric',
    weekday: 'long',
    month: 'long',
    year: 'numeric',
  })
  return { day: p.day!, weekday: p.weekday!, month: `${p.month} ${p.year}` }
}
