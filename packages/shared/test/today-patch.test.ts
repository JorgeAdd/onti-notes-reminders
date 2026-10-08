/**
 * Design Decision 8 · the client's optimistic patch must land where the server's next /today would.
 * Parity: apply the change with the helper, and apply it to the full note list then build the page
 * exactly as `getToday` does (buildDayPage + window); both must be equal.
 */
import { describe, expect, it } from 'vitest'
import {
  applyReminderChange,
  buildDayPage,
  markDone,
  snoozeOneHour,
  snoozeTomorrow,
  todayWindow,
  undoDone,
  type NoteResponse,
  type ReminderChange,
  type TodayItem,
  type TodayResponse,
} from '../src'
import { at, BEFORE_CAPTURE, replace, TZ, type FixtureNote } from './fixtures/jorge-week'

const NOW = at('2026-10-07 09:05')

const toItem = (note: FixtureNote): TodayItem => ({
  id: note.id,
  title: note.title,
  tags: note.tags.map((tag) => ({ name: tag, slug: tag })),
  dueAt: note.dueAt as Date,
  originalDueAt: note.originalDueAt as Date,
  snoozeCount: note.snoozeCount,
  doneAt: note.doneAt,
})

/** The assembly `makeGetToday` performs, over a full note list. */
function respond(notes: FixtureNote[], now = NOW): TodayResponse {
  const page = buildDayPage(notes, now, TZ)
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

const fixtureNote = (id: string, title: string, due: string | null): FixtureNote => {
  const dueAt = due ? at(due) : null
  return {
    id,
    title,
    tags: ['client-a'],
    body: '',
    createdAt: NOW,
    dueAt,
    originalDueAt: dueAt,
    snoozeCount: 0,
    doneAt: null,
    notifiedDueAt: null,
  }
}

const toResponse = (note: FixtureNote): NoteResponse => ({
  id: note.id,
  title: note.title,
  tags: note.tags.map((tag) => ({ name: tag, slug: tag })),
  dueAt: note.dueAt,
  originalDueAt: note.originalDueAt,
  snoozeCount: note.snoozeCount,
  doneAt: note.doneAt,
})

/** What the server does to the full list for one change. */
function serverApply(
  notes: FixtureNote[],
  change: Exclude<ReminderChange, { type: 'insert' }>,
): FixtureNote[] {
  const target = notes.find((n) => n.id === change.id)
  if (!target) throw new Error(`No note ${change.id}`)
  const next =
    change.type === 'snooze'
      ? change.preset === 'hour'
        ? snoozeOneHour(target, NOW)
        : snoozeTomorrow(target, NOW, TZ)
      : change.type === 'done'
        ? markDone(target, NOW)
        : undoDone(target)
  return replace(notes, { ...target, ...next })
}

const N4_DONE = replace(BEFORE_CAPTURE, {
  ...BEFORE_CAPTURE.find((n) => n.id === 'N4')!,
  doneAt: at('2026-10-07 09:00'),
})

describe('applyReminderChange · parity with the server page (jorge-week, Wed 7 09:05)', () => {
  it.each<[string, FixtureNote[], Exclude<ReminderChange, { type: 'insert' }>]>([
    [
      '+1 h on a carried item moves it onto the rail',
      BEFORE_CAPTURE,
      { type: 'snooze', id: 'N2', preset: 'hour' },
    ],
    [
      '+1 h on a rail item reorders it',
      BEFORE_CAPTURE,
      { type: 'snooze', id: 'N4', preset: 'hour' },
    ],
    [
      'Tomorrow 9:00 on a rail item leaves the page',
      BEFORE_CAPTURE,
      { type: 'snooze', id: 'N5', preset: 'tomorrow' },
    ],
    [
      'Tomorrow 9:00 on a carried item leaves the page',
      BEFORE_CAPTURE,
      { type: 'snooze', id: 'N3', preset: 'tomorrow' },
    ],
    ['done on a rail item keeps it struck on the rail', BEFORE_CAPTURE, { type: 'done', id: 'N4' }],
    ['done on a carried item leaves the page', BEFORE_CAPTURE, { type: 'done', id: 'N2' }],
    ['undo on a done rail item reopens it', N4_DONE, { type: 'undo', id: 'N4' }],
    ['done on a done item keeps the first done_at', N4_DONE, { type: 'done', id: 'N4' }],
  ])('%s', (_name, notes, change) => {
    expect(applyReminderChange(respond(notes), change, NOW)).toEqual(
      respond(serverApply(notes, change)),
    )
  })

  it('a plain note adds one to the other count', () => {
    const created = fixtureNote('NX', 'Idea', null)
    const patched = applyReminderChange(
      respond(BEFORE_CAPTURE),
      { type: 'insert', note: toResponse(created) },
      NOW,
    )
    expect(patched).toEqual(respond([...BEFORE_CAPTURE, created]))
    expect(patched.otherCount).toBe(respond(BEFORE_CAPTURE).otherCount + 1)
  })

  it.each([
    ['later today', '2026-10-07 17:00'],
    ['yesterday (carried)', '2026-10-06 10:00'],
    ['tomorrow (other)', '2026-10-08 10:00'],
  ])('an inserted reminder due %s lands where the server puts it', (_name, due) => {
    const created = fixtureNote('NX', 'Call back', due)
    const patched = applyReminderChange(
      respond(BEFORE_CAPTURE),
      { type: 'insert', note: toResponse(created) },
      NOW,
    )
    expect(patched).toEqual(respond([...BEFORE_CAPTURE, created]))
  })

  it.each([
    ['timed', '2026-10-07 17:00'],
    ['plain', null],
  ])('replacing a %s temp insert with the server note does not double count', (_name, due) => {
    const real = fixtureNote('NX', 'Call back', due)
    const temp = { ...toResponse(real), id: 'temp-1' }
    const withTemp = applyReminderChange(
      respond(BEFORE_CAPTURE),
      { type: 'insert', note: temp },
      NOW,
    )
    const settled = applyReminderChange(
      withTemp,
      { type: 'insert', note: toResponse(real), replacesId: 'temp-1' },
      NOW,
    )
    expect(settled).toEqual(respond([...BEFORE_CAPTURE, real]))
  })
})

describe('applyReminderChange · edges', () => {
  it('an id that is not on the page changes nothing', () => {
    const today = respond(BEFORE_CAPTURE)
    expect(applyReminderChange(today, { type: 'done', id: 'missing' }, NOW)).toEqual(today)
  })

  it('+1 h on a done item changes nothing (the server answers 409)', () => {
    const today = respond(N4_DONE)
    expect(applyReminderChange(today, { type: 'snooze', id: 'N4', preset: 'hour' }, NOW)).toEqual(
      today,
    )
  })

  it('does not mutate its input', () => {
    const today = respond(BEFORE_CAPTURE)
    const before = structuredClone(today)
    applyReminderChange(today, { type: 'done', id: 'N4' }, NOW)
    expect(today).toEqual(before)
  })
})
