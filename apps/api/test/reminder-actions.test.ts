import { at } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import { ConflictError, NotFoundError } from '../src/application/errors'
import { makeMarkDone } from '../src/application/mark-done'
import type { Clock } from '../src/application/ports'
import { makeSnoozeNote } from '../src/application/snooze-note'
import { makeUndoDone } from '../src/application/undo-done'
import {
  ANA,
  InMemoryNotes,
  InMemoryProfiles,
  JORGE,
  noteId,
  noteRecord,
  profileReturning,
} from './fakes'

const clockAt = (instant: Date): Clock => ({ now: () => instant })
const MEXICO = profileReturning({ timezone: 'America/Mexico_City' })

/** Wed 7 09:05 (C4/C5/C6): the late item N3-like, due Tue 18:00. */
const WED_0905 = at('2026-10-07 09:05')
const lateItem = () =>
  noteRecord(1, { dueAt: at('2026-10-06 18:00'), originalDueAt: at('2026-10-06 18:00') })

function repo(...notes: ReturnType<typeof noteRecord>[]) {
  return new InMemoryNotes(notes.map((note) => ({ ownerId: JORGE.userId, note })))
}

describe('snoozeNote', () => {
  it('C5 · +1 h from 09:05 is 10:05, count 1, original due unchanged', async () => {
    const notes = repo(lateItem())
    const note = await makeSnoozeNote({ clock: clockAt(WED_0905), notes, profiles: MEXICO })(
      JORGE,
      noteId(1),
      'hour',
    )
    expect(note.dueAt).toEqual(at('2026-10-07 10:05'))
    expect(note.snoozeCount).toBe(1)
    expect(note.originalDueAt).toEqual(at('2026-10-06 18:00'))
    expect(notes.get(noteId(1))).toEqual(note)
  })

  it('+1 h truncates the clock to the minute before adding the hour (R7)', async () => {
    const notes = repo(lateItem())
    const clock = clockAt(new Date(WED_0905.getTime() + 41_500))
    const note = await makeSnoozeNote({ clock, notes, profiles: MEXICO })(JORGE, noteId(1), 'hour')
    expect(note.dueAt).toEqual(at('2026-10-07 10:05'))
  })

  it('C6 · Tomorrow 9:00 from Wed 09:05 is Thu 09:00, count 1', async () => {
    const notes = repo(lateItem())
    const note = await makeSnoozeNote({ clock: clockAt(WED_0905), notes, profiles: MEXICO })(
      JORGE,
      noteId(1),
      'tomorrow',
    )
    expect(note.dueAt).toEqual(at('2026-10-08 09:00'))
    expect(note.snoozeCount).toBe(1)
  })

  it('two snoozes in a row count twice and keep the first original due', async () => {
    const notes = repo(lateItem())
    const snooze = makeSnoozeNote({ clock: clockAt(WED_0905), notes, profiles: MEXICO })
    await snooze(JORGE, noteId(1), 'hour')
    const note = await snooze(JORGE, noteId(1), 'hour')
    expect(note.snoozeCount).toBe(2)
    expect(note.originalDueAt).toEqual(at('2026-10-06 18:00'))
  })

  it('D3 · +1 h at 01:30 EST lands at 03:30 EDT (07:30Z)', async () => {
    const notes = repo(
      noteRecord(1, {
        dueAt: new Date('2026-03-08T05:00:00Z'),
        originalDueAt: new Date('2026-03-08T05:00:00Z'),
      }),
    )
    const profiles = profileReturning({ timezone: 'America/New_York' })
    const clock = clockAt(new Date('2026-03-08T06:30:00Z'))
    const note = await makeSnoozeNote({ clock, notes, profiles })(JORGE, noteId(1), 'hour')
    expect(note.dueAt?.toISOString()).toBe('2026-03-08T07:30:00.000Z')
  })

  it('D4 · Tomorrow 9:00 from Sat 22:00 EST is Sun 09:00 EDT (13:00Z), in the profile zone', async () => {
    const notes = repo(
      noteRecord(1, {
        dueAt: new Date('2026-03-08T05:00:00Z'),
        originalDueAt: new Date('2026-03-08T05:00:00Z'),
      }),
    )
    const profiles = InMemoryProfiles.of({ [JORGE.userId]: 'America/New_York' })
    const clock = clockAt(new Date('2026-03-08T03:00:00Z'))
    const note = await makeSnoozeNote({ clock, notes, profiles })(JORGE, noteId(1), 'tomorrow')
    expect(note.dueAt?.toISOString()).toBe('2026-03-08T13:00:00.000Z')
  })

  it('falls back to UTC for Tomorrow 9:00 while the profile row is missing', async () => {
    const notes = repo(lateItem())
    const note = await makeSnoozeNote({
      clock: clockAt(new Date('2026-10-07T15:05:00Z')),
      notes,
      profiles: profileReturning(null),
    })(JORGE, noteId(1), 'tomorrow')
    expect(note.dueAt?.toISOString()).toBe('2026-10-08T09:00:00.000Z')
  })

  it('a done note answers ConflictError(not_open) and stays untouched', async () => {
    const done = noteRecord(1, { ...lateItem(), doneAt: at('2026-10-06 18:05') })
    const notes = repo(done)
    const snooze = makeSnoozeNote({ clock: clockAt(WED_0905), notes, profiles: MEXICO })
    const error = await snooze(JORGE, noteId(1), 'hour').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ConflictError)
    expect((error as ConflictError).reason).toBe('not_open')
    expect(notes.get(noteId(1))).toEqual(done)
    expect(notes.writes).toEqual([])
  })

  it('a note without a reminder answers ConflictError(no_reminder)', async () => {
    const notes = repo(noteRecord(1))
    const snooze = makeSnoozeNote({ clock: clockAt(WED_0905), notes, profiles: MEXICO })
    const error = await snooze(JORGE, noteId(1), 'tomorrow').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ConflictError)
    expect((error as ConflictError).reason).toBe('no_reminder')
  })

  it.each([
    ['an unknown id', noteId(99), JORGE],
    ["another user's note (R15)", noteId(1), ANA],
  ])('%s is NotFoundError', async (_label, id, who) => {
    const notes = repo(lateItem())
    const snooze = makeSnoozeNote({ clock: clockAt(WED_0905), notes, profiles: MEXICO })
    await expect(snooze(who, id, 'hour')).rejects.toBeInstanceOf(NotFoundError)
    expect(notes.writes).toEqual([])
  })
})

describe('markDone', () => {
  it('C3 · sets done_at to the clock and leaves the due time alone', async () => {
    const due = at('2026-10-06 17:00')
    const notes = repo(noteRecord(1, { dueAt: due, originalDueAt: due }))
    const note = await makeMarkDone({ clock: clockAt(at('2026-10-06 17:00')), notes })(
      JORGE,
      noteId(1),
    )
    expect(note.doneAt).toEqual(at('2026-10-06 17:00'))
    expect(note.dueAt).toEqual(due)
  })

  it('done on a done note is a no-op that keeps the first done_at (R9)', async () => {
    const first = at('2026-10-06 17:00')
    const done = noteRecord(1, { ...lateItem(), doneAt: first })
    const notes = repo(done)
    const note = await makeMarkDone({ clock: clockAt(WED_0905), notes })(JORGE, noteId(1))
    expect(note.doneAt).toEqual(first)
    expect(notes.writes).toEqual([])
  })

  it('done on a note without a reminder answers ConflictError(no_reminder)', async () => {
    const notes = repo(noteRecord(1))
    const error = await makeMarkDone({ clock: clockAt(WED_0905), notes })(JORGE, noteId(1)).catch(
      (e: unknown) => e,
    )
    expect(error).toBeInstanceOf(ConflictError)
    expect((error as ConflictError).reason).toBe('no_reminder')
    expect(notes.writes).toEqual([])
  })

  it.each([
    ['an unknown id', noteId(99), JORGE],
    ["another user's note (R15)", noteId(1), ANA],
  ])('%s is NotFoundError', async (_label, id, who) => {
    const notes = repo(lateItem())
    await expect(makeMarkDone({ clock: clockAt(WED_0905), notes })(who, id)).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })
})

describe('undoDone', () => {
  it('reopens a done note, due time untouched (R9)', async () => {
    const notes = repo(noteRecord(1, { ...lateItem(), doneAt: at('2026-10-06 18:05') }))
    const note = await makeUndoDone({ notes })(JORGE, noteId(1))
    expect(note.doneAt).toBeNull()
    expect(note.dueAt).toEqual(at('2026-10-06 18:00'))
    expect(notes.writes).toEqual([noteId(1)])
  })

  it('undo on an open note is a no-op', async () => {
    const notes = repo(lateItem())
    const note = await makeUndoDone({ notes })(JORGE, noteId(1))
    expect(note.doneAt).toBeNull()
    expect(note.dueAt).toEqual(at('2026-10-06 18:00'))
    expect(notes.writes).toEqual([])
  })

  it('undo on a note without a reminder is a no-op, not an error', async () => {
    const notes = repo(noteRecord(1))
    const note = await makeUndoDone({ notes })(JORGE, noteId(1))
    expect(note.dueAt).toBeNull()
    expect(notes.writes).toEqual([])
  })

  it.each([
    ['an unknown id', noteId(99), JORGE],
    ["another user's note (R15)", noteId(1), ANA],
  ])('%s is NotFoundError', async (_label, id, who) => {
    const notes = repo(lateItem())
    await expect(makeUndoDone({ notes })(who, id)).rejects.toBeInstanceOf(NotFoundError)
  })
})
