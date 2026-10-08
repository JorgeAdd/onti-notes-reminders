import { buildDayResponse, summarizeTags, type DayNote } from './day-response'
import {
  hasReminder,
  isOpen,
  markDone,
  snoozeOneHour,
  snoozeTomorrow,
  undoDone,
} from './domain/reminder'
import type { NoteResponse, SnoozePreset } from './notes'
import type { OtherItem, TodayItem, TodayResponse } from './today'

/** One write the client predicts before the server answers (design Decision 8). */
export type ReminderChange =
  | { type: 'snooze'; id: string; preset: SnoozePreset }
  | { type: 'done'; id: string }
  | { type: 'undo'; id: string }
  /** `replacesId`: the optimistic temp row this server note settles. */
  | { type: 'insert'; note: NoteResponse; replacesId?: string }

const lift = (item: TodayItem | OtherItem): DayNote => ({ ...item, notifiedDueAt: null })

function applyToNote(note: DayNote, change: ReminderChange, now: Date, timeZone: string): DayNote {
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
 * Applies one change to a cached day page (any viewed day, filtered or not) with the same shared
 * assembly the server uses, so the optimistic page equals the next `/today` (parity-tested).
 *
 * The notes it knows are the page items plus `others`. Unfiltered, the rest of the account stays
 * inside `otherCount`; filtered, every match is known, and an inserted note without the active
 * tag only adds one to `hiddenCount` (not again when it settles with `replacesId`).
 */
export function applyReminderChange(
  page: TodayResponse,
  change: ReminderChange,
  now: Date,
): TodayResponse {
  const known = [...page.carried.flatMap((group) => group.items), ...page.rail, ...page.others].map(
    lift,
  )
  const filtered = page.tag !== null

  let notes: DayNote[]
  let hiddenCount = page.hiddenCount
  let added = 0 // notes the page cannot see (unfiltered: they raise `otherCount`)
  let tags = page.tags
  if (change.type === 'insert') {
    const { note, replacesId } = change
    const incoming: DayNote = { ...note, notifiedDueAt: null }
    const matches = !filtered || note.tags.some((tag) => tag.slug === page.tag)
    notes = known.filter((n) => n.id !== replacesId)
    if (matches) notes.push(incoming)
    else if (replacesId === undefined) hiddenCount += 1
    if (!filtered && replacesId === undefined) added = 1
    tags = summarizeTags([{ tags: page.tags }, incoming])
  } else {
    notes = known.map((n) => (n.id === change.id ? applyToNote(n, change, now, page.timezone) : n))
  }

  const rebuilt = buildDayResponse({
    notes,
    now,
    timezone: page.timezone,
    date: page.date,
    tag: page.tag,
    hiddenCount,
    tags,
  })
  if (filtered) return rebuilt
  // Unfiltered: the page only knows its own items, the rest of the account stays "other".
  const totalAfter = known.length + page.otherCount + added
  return { ...rebuilt, otherCount: rebuilt.otherCount + (totalAfter - notes.length) }
}
