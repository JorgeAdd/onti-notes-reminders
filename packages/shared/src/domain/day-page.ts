import { isOpen, type Reminder } from './reminder'
import { startOfLocalDay, todayWindow } from './time'

export interface PageNote extends Reminder {
  id: string
}

export interface CarriedGroup<T> {
  /** Local midnight of the day these items were due. */
  day: Date
  items: T[]
}

export interface DayPage<T> {
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

/** R3–R5 · today's page for any list of notes. */
export function buildDayPage<T extends PageNote>(
  notes: T[],
  now: Date,
  timeZone: string,
): DayPage<T> {
  const today = todayWindow(now, timeZone)
  const inToday = (due: Date) => due >= today.start && due < today.end

  const carriedItems = notes.filter((n) => isOpen(n) && n.dueAt < today.start).sort(byDueAt)
  const rail = notes.filter((n) => n.dueAt !== null && inToday(n.dueAt)).sort(byDueAt)

  const groups = new Map<number, CarriedGroup<T>>()
  for (const note of carriedItems) {
    const day = startOfLocalDay(note.dueAt as Date, timeZone)
    const group = groups.get(day.getTime()) ?? { day, items: [] }
    group.items.push(note)
    groups.set(day.getTime(), group)
  }

  const pageSize = carriedItems.length + rail.length
  return {
    carried: [...groups.values()],
    rail,
    openCount: carriedItems.length + rail.filter((n) => n.doneAt === null).length,
    anyDoneToday: rail.some((n) => n.doneAt !== null),
    otherCount: notes.length - pageSize,
  }
}
