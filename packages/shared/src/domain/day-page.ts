import { isOpen, type Reminder } from './reminder'
import { dayWindow, localCalendarDate } from './calendar-date'
import { startOfLocalDay, type Window } from './time'

export interface PageNote extends Reminder {
  id: string
}

export interface CarriedGroup<T> {
  /** Local midnight of the day these items were due. */
  day: Date
  items: T[]
}

export interface DayPage<T> {
  /** The viewed local calendar date, `YYYY-MM-DD`. */
  date: string
  /** True when `date` is the local date of `now` (R18: other days have no carried group). */
  isToday: boolean
  /** R1 · the viewed day's window. */
  window: Window
  /** "Still open from {day}": open, due before today, oldest day first. */
  carried: CarriedGroup<T>[]
  /** Due today, in time order; done items stay (struck through). */
  rail: T[]
  /** Open items on the page (R4 header count). */
  openCount: number
  /** True once an item due today is done ("left today" copy). */
  anyDoneToday: boolean
  /** R5 · total notes − items on the page. */
  otherCount: number
}

const byDueAt = (a: Reminder, b: Reminder) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0)

/**
 * R3–R5, R18 · the page of local calendar date `date` (default: today) for any
 * list of notes. Only today carries open items from earlier days.
 */
export function buildDayPage<T extends PageNote>(
  notes: T[],
  now: Date,
  timeZone: string,
  date: string = localCalendarDate(now, timeZone),
): DayPage<T> {
  const window = dayWindow(date, timeZone)
  const isToday = date === localCalendarDate(now, timeZone)
  const inDay = (due: Date) => due >= window.start && due < window.end

  const carriedItems = isToday
    ? notes.filter((n) => isOpen(n) && n.dueAt < window.start).sort(byDueAt)
    : []
  const rail = notes.filter((n) => n.dueAt !== null && inDay(n.dueAt)).sort(byDueAt)

  const groups = new Map<number, CarriedGroup<T>>()
  for (const note of carriedItems) {
    const day = startOfLocalDay(note.dueAt as Date, timeZone)
    const group = groups.get(day.getTime()) ?? { day, items: [] }
    group.items.push(note)
    groups.set(day.getTime(), group)
  }

  const pageSize = carriedItems.length + rail.length
  return {
    date,
    isToday,
    window,
    carried: [...groups.values()],
    rail,
    openCount: carriedItems.length + rail.filter((n) => n.doneAt === null).length,
    anyDoneToday: rail.some((n) => n.doneAt !== null),
    otherCount: notes.length - pageSize,
  }
}
