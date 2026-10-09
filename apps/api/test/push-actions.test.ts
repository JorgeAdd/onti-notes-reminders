import type { ActionClaims } from '@onti/shared'
import { at } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import { ConflictError, NotFoundError } from '../src/application/errors'
import { makeMarkDone } from '../src/application/mark-done'
import { makePushActions } from '../src/application/push-actions'
import { makeSnoozeNote } from '../src/application/snooze-note'
import { ANA, InMemoryNotes, JORGE, noteId, noteRecord, profileReturning } from './fakes'
import { MutableClock } from './push-fakes'

/** Claims for note 1 owned by Jorge, due at `dueAt` (the instant the notification was about). */
const claimsFor = (dueAt: Date, overrides: Partial<ActionClaims> = {}): ActionClaims => ({
  v: 1,
  noteId: noteId(1),
  userId: JORGE.userId,
  dueAt: dueAt.getTime(),
  actions: ['done', 'snooze'],
  exp: Math.floor(dueAt.getTime() / 1000) + 86_400,
  ...overrides,
})

const reminder = (dueAt: Date, extra: Partial<ReturnType<typeof noteRecord>> = {}) =>
  noteRecord(1, { dueAt, originalDueAt: dueAt, ...extra })

function setup(clockAt: Date, ...notes: ReturnType<typeof noteRecord>[]) {
  const clock = new MutableClock(clockAt)
  const store = new InMemoryNotes(notes.map((note) => ({ ownerId: JORGE.userId, note })))
  return { clock, store, actions: makePushActions({ clock, notes: store }) }
}

describe('push actions from a token', () => {
  it('C3 · done stamps the clock time and leaves due_at unchanged', async () => {
    const due = at('2026-10-06 17:00')
    const { store, actions } = setup(due, reminder(due))
    const note = await actions.done(claimsFor(due))
    expect(note.doneAt).toEqual(due)
    expect(note.dueAt).toEqual(due)
    expect(store.get(noteId(1))?.doneAt).toEqual(due)
  })

  it('R9 · done twice keeps the first done_at and writes once', async () => {
    const due = at('2026-10-06 17:00')
    const { clock, store, actions } = setup(due, reminder(due))
    await actions.done(claimsFor(due))
    clock.set(at('2026-10-06 17:30'))
    const note = await actions.done(claimsFor(due))
    expect(note.doneAt).toEqual(due)
    expect(store.writes).toHaveLength(1)
  })

  it('C15 · +1 h at 10:05 gives 11:05, count 2, original Tue 18:00', async () => {
    const due = at('2026-10-07 10:05')
    const original = at('2026-10-06 18:00')
    const { store, actions } = setup(
      due,
      noteRecord(1, { dueAt: due, originalDueAt: original, snoozeCount: 1, notifiedDueAt: due }),
    )
    const note = await actions.snooze(claimsFor(due))
    expect(note.dueAt).toEqual(at('2026-10-07 11:05'))
    expect(note.snoozeCount).toBe(2)
    expect(note.originalDueAt).toEqual(original)
    expect(store.get(noteId(1))).toEqual(note)
  })

  it('C15 · replaying the same token is due_at_changed and changes nothing', async () => {
    const due = at('2026-10-07 10:05')
    const { store, actions } = setup(due, reminder(due))
    const claims = claimsFor(due)
    await actions.snooze(claims)
    const after = store.get(noteId(1))
    await expect(actions.snooze(claims)).rejects.toMatchObject({ reason: 'due_at_changed' })
    await expect(actions.done(claims)).rejects.toBeInstanceOf(ConflictError)
    expect(store.get(noteId(1))).toBe(after)
  })

  it('a note rescheduled after the notification is due_at_changed for both actions', async () => {
    const { store, actions } = setup(at('2026-10-07 10:05'), reminder(at('2026-10-07 12:00')))
    const claims = claimsFor(at('2026-10-07 10:05'))
    await expect(actions.done(claims)).rejects.toMatchObject({ reason: 'due_at_changed' })
    await expect(actions.snooze(claims)).rejects.toMatchObject({ reason: 'due_at_changed' })
    expect(store.writes).toEqual([])
  })

  it('a note without a reminder counts as changed', async () => {
    const { actions } = setup(at('2026-10-07 10:05'), noteRecord(1))
    await expect(actions.done(claimsFor(at('2026-10-07 10:05')))).rejects.toMatchObject({
      reason: 'due_at_changed',
    })
  })

  it('snooze on a done note is not_open; done on it succeeds unchanged', async () => {
    const due = at('2026-10-07 10:05')
    const doneAt = at('2026-10-07 10:00')
    const { store, actions } = setup(due, reminder(due, { doneAt }))
    await expect(actions.snooze(claimsFor(due))).rejects.toMatchObject({ reason: 'not_open' })
    expect((await actions.done(claimsFor(due))).doneAt).toEqual(doneAt)
    expect(store.writes).toEqual([])
  })

  it('an action the token does not allow is NotFound before any note is read', async () => {
    const due = at('2026-10-07 10:05')
    const { store, actions } = setup(due, reminder(due))
    await expect(actions.snooze(claimsFor(due, { actions: ['done'] }))).rejects.toBeInstanceOf(
      NotFoundError,
    )
    await expect(actions.done(claimsFor(due, { actions: ['snooze'] }))).rejects.toBeInstanceOf(
      NotFoundError,
    )
    expect(store.get(noteId(1))).toEqual(reminder(due))
  })

  it('an unknown note and another user note are the same NotFound', async () => {
    const due = at('2026-10-07 10:05')
    const { store, actions } = setup(due, reminder(due))
    await expect(actions.done(claimsFor(due, { noteId: noteId(9) }))).rejects.toBeInstanceOf(
      NotFoundError,
    )
    await expect(actions.snooze(claimsFor(due, { userId: ANA.userId }))).rejects.toBeInstanceOf(
      NotFoundError,
    )
    expect(store.writes).toEqual([])
  })

  it('D3 · +1 h at 01:30 EST lands at 03:30 EDT (07:30Z)', async () => {
    const due = new Date('2026-03-08T05:00:00Z')
    const { actions } = setup(new Date('2026-03-08T06:30:00Z'), reminder(due))
    expect((await actions.snooze(claimsFor(due))).dueAt).toEqual(new Date('2026-03-08T07:30:00Z'))
  })

  it('the token route gives the same note as the JWT route', async () => {
    const due = at('2026-10-07 10:05')
    const viaToken = setup(due, reminder(due))
    const viaJwt = setup(due, reminder(due))
    const profiles = profileReturning({ timezone: 'America/Mexico_City' })
    expect(await viaToken.actions.snooze(claimsFor(due))).toEqual(
      await makeSnoozeNote({ clock: viaJwt.clock, notes: viaJwt.store, profiles })(
        JORGE,
        noteId(1),
        'hour',
      ),
    )
    expect(await viaToken.actions.done(claimsFor(at('2026-10-07 11:05')))).toEqual(
      await makeMarkDone({ clock: viaJwt.clock, notes: viaJwt.store })(JORGE, noteId(1)),
    )
  })
})
