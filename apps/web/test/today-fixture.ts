import { buildDayPage, todayWindow, type TodayItem, type TodayResponse } from '@onti/shared'
import { at, BEFORE_CAPTURE, N1, TZ, type FixtureNote } from '@onti/shared/fixtures/jorge-week'

/** Wire ids are UUIDs; the fixture's N# ids stay in the dataset and never reach the UI. */
const uuid = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`

/** C4 stands after Moment 1: N1 exists and was done on Tue 17:00, so it is one of the 11 others. */
const NOTES: FixtureNote[] = [{ ...N1, doneAt: at('2026-10-06 17:00') }, ...BEFORE_CAPTURE]

/** The C4 day page (Wed 7, 09:05) as the API would send it, built from Jorge's week. */
export function c4Response(): TodayResponse {
  const now = at('2026-10-07 09:05')
  const page = buildDayPage(NOTES, now, TZ)
  const toItem = (note: FixtureNote): TodayItem => ({
    id: uuid(NOTES.indexOf(note) + 1),
    title: note.title,
    tags: note.tags.map((tag) => ({ name: tag, slug: tag })),
    dueAt: note.dueAt as Date,
    originalDueAt: note.originalDueAt as Date,
    snoozeCount: note.snoozeCount,
    doneAt: note.doneAt,
  })
  return {
    now,
    timezone: TZ,
    window: todayWindow(now, TZ),
    openCount: page.openCount,
    anyDoneToday: page.anyDoneToday,
    otherCount: page.otherCount,
    carried: page.carried.map((group) => ({ day: group.day, items: group.items.map(toItem) })),
    rail: page.rail.map(toItem),
  }
}
