import { buildDayResponse, summarizeTags, type DayNote, type TodayResponse } from '@onti/shared'
import { at, BEFORE_CAPTURE, N1, TZ, type FixtureNote } from '@onti/shared/fixtures/jorge-week'

/** Wire ids are UUIDs; the fixture's N# ids stay in the dataset and never reach the UI. */
const uuid = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`

/** C4 stands after Moment 1: N1 exists and was done on Tue 17:00, so it is one of the 11 others. */
const NOTES: FixtureNote[] = [{ ...N1, doneAt: at('2026-10-06 17:00') }, ...BEFORE_CAPTURE]

const WIRE_NOTES = (): DayNote[] =>
  NOTES.map((note, index) => ({
    ...note,
    id: uuid(index + 1),
    tags: note.tags.map((tag) => ({ name: tag, slug: tag })),
  }))

/**
 * The C4 day page (Wed 7, 09:05) as the API would send it, built from Jorge's week; `date`
 * views another day of the same week.
 */
export function c4Response(date?: string): TodayResponse {
  const notes: DayNote[] = NOTES.map((note, index) => ({
    ...note,
    id: uuid(index + 1),
    tags: note.tags.map((tag) => ({ name: tag, slug: tag })),
  }))
  return buildDayResponse({
    notes,
    now: at('2026-10-07 09:05'),
    timezone: TZ,
    ...(date ? { date } : {}),
    tag: null,
    hiddenCount: 0,
    tags: summarizeTags(notes),
  })
}

/** C8 · Thu 8 14:30 filtered by `#client-b`: N6 on the rail, N7-N10 below, 10 notes hidden. */
export function c8Response(): TodayResponse {
  const all = WIRE_NOTES()
  const matching = all.filter((note) => note.tags.some((tag) => tag.slug === 'client-b'))
  return buildDayResponse({
    notes: matching,
    now: at('2026-10-08 14:30'),
    timezone: TZ,
    tag: 'client-b',
    hiddenCount: all.length - matching.length,
    tags: summarizeTags(all),
  })
}
