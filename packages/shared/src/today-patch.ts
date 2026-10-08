import { buildDayPage, type PageNote } from './domain/day-page'
import {
  hasReminder,
  isOpen,
  markDone,
  snoozeOneHour,
  snoozeTomorrow,
  undoDone,
} from './domain/reminder'
import type { NoteResponse, SnoozePreset } from './notes'
import type { TodayItem, TodayResponse } from './today'

/** One write the client predicts before the server answers (design Decision 8). */
export type ReminderChange =
  | { type: 'snooze'; id: string; preset: SnoozePreset }
  | { type: 'done'; id: string }
  | { type: 'undo'; id: string }
  /** `replacesId`: the optimistic temp row this server note settles. */
  | { type: 'insert'; note: NoteResponse; replacesId?: string }

type Lifted = PageNote & Pick<TodayItem, 'title' | 'tags'>

const lift = (item: TodayItem): Lifted => ({ ...item, notifiedDueAt: null })

function toItem(note: Lifted): TodayItem {
  if (note.dueAt === null || note.originalDueAt === null) {
    throw new Error('A note on the day page must have a reminder')
  }
  return {
    id: note.id,
    title: note.title,
    tags: note.tags,
    dueAt: note.dueAt,
    originalDueAt: note.originalDueAt,
    snoozeCount: note.snoozeCount,
    doneAt: note.doneAt,
  }
}

function applyToNote(note: Lifted, change: ReminderChange, now: Date, timeZone: string): Lifted {
  switch (change.type) {
    case 'snooze':
      if (!isOpen(note)) return note // the server answers 409; the rollback restores the page
      return {
        ...note,
        ...(change.preset === 'hour'
          ? snoozeOneHour(note, now)
          : snoozeTomorrow(note, now, timeZone)),
      }
    case 'done':
      return hasReminder(note) ? { ...note, ...markDone(note, now) } : note
    case 'undo':
      return { ...note, ...undoDone(note) }
    case 'insert':
      return note
  }
}

/**
 * Applies one change to the cached day page with the same shared rules the server uses, so the
 * optimistic page equals the next `/today` (parity-tested). Items that leave the page (Tomorrow
 * 9:00, a done carried item) join "other"; a plain note adds one to it.
 */
export function applyReminderChange(
  today: TodayResponse,
  change: ReminderChange,
  now: Date,
): TodayResponse {
  const onPage = [...today.carried.flatMap((group) => group.items), ...today.rail].map(lift)
  const totalBefore = onPage.length + today.otherCount

  let notes: Lifted[]
  let added = 0
  if (change.type === 'insert') {
    const { note, replacesId } = change
    notes = [...onPage.filter((n) => n.id !== replacesId), { ...note, notifiedDueAt: null }]
    added = replacesId === undefined ? 1 : 0
  } else {
    notes = onPage.map((n) =>
      n.id === change.id ? applyToNote(n, change, now, today.timezone) : n,
    )
  }

  const page = buildDayPage(notes, now, today.timezone)
  return {
    ...today,
    openCount: page.openCount,
    anyDoneToday: page.anyDoneToday,
    // The page counts notes in `notes`; the rest of the account stays "other".
    otherCount: page.otherCount + (totalBefore + added - notes.length),
    carried: page.carried.map((group) => ({ day: group.day, items: group.items.map(toItem) })),
    rail: page.rail.map(toItem),
  }
}
