import { at } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import { NotFoundError } from '../src/application/errors'
import type { Clock } from '../src/application/ports'
import { makeUpdateNote } from '../src/application/update-note'
import { ANA, InMemoryNotes, JORGE, noteId, noteRecord, profileReturning } from './fakes'

const NOW = at('2026-10-07 09:05')
const CLOCK: Clock = { now: () => NOW }

const SNOOZED = noteRecord(1, {
  title: 'Ask Luis',
  tags: [{ slug: 'client-a', name: 'Client A' }],
  dueAt: at('2026-10-07 10:05'),
  originalDueAt: at('2026-10-06 18:00'),
  snoozeCount: 2,
  notifiedDueAt: at('2026-10-06 18:00'),
})
const DONE = noteRecord(2, {
  title: 'Done thing',
  dueAt: at('2026-10-06 16:00'),
  originalDueAt: at('2026-10-06 16:00'),
  doneAt: at('2026-10-06 17:00'),
})
const PLAIN = noteRecord(3, { title: 'Plain', tags: [{ slug: 'ideas', name: 'Ideas Board' }] })
const ANA_NOTE = noteRecord(4, { title: 'Ana only' })

function world() {
  const notes = new InMemoryNotes([
    { ownerId: JORGE.userId, note: SNOOZED, body: 'old body' },
    { ownerId: JORGE.userId, note: DONE },
    { ownerId: JORGE.userId, note: PLAIN },
    { ownerId: ANA.userId, note: ANA_NOTE, body: 'ana body' },
  ])
  const updateNote = makeUpdateNote({
    clock: CLOCK,
    notes,
    profiles: profileReturning({ timezone: 'America/Mexico_City' }),
  })
  return { notes, updateNote }
}

describe('updateNote (R20, R8, R11, R15)', () => {
  it('changes title and body only: tags and reminder stay untouched', async () => {
    const { updateNote, notes } = world()
    const response = await updateNote(JORGE, SNOOZED.id, { title: 'New title', body: 'new body' })
    expect(response.note).toMatchObject({
      id: SNOOZED.id,
      title: 'New title',
      body: 'new body',
      tags: [{ slug: 'client-a', name: 'Client A' }],
      dueAt: SNOOZED.dueAt,
      originalDueAt: SNOOZED.originalDueAt,
      snoozeCount: 2,
    })
    expect(notes.get(SNOOZED.id)?.notifiedDueAt).toEqual(SNOOZED.notifiedDueAt)
  })

  it('carries now and the profile timezone and hides the notification bookkeeping', async () => {
    const response = await world().updateNote(JORGE, SNOOZED.id, { title: 'x' })
    expect(response.now).toEqual(NOW)
    expect(response.timezone).toBe('America/Mexico_City')
    expect(response.note).not.toHaveProperty('notifiedDueAt')
  })

  it('accepts an empty body (R20) and the title stays', async () => {
    const response = await world().updateNote(JORGE, SNOOZED.id, { body: '' })
    expect(response.note.body).toBe('')
    expect(response.note.title).toBe('Ask Luis')
  })

  it('leaves the body alone when only the title changes', async () => {
    const response = await world().updateNote(JORGE, SNOOZED.id, { title: 'Other' })
    expect(response.note.body).toBe('old body')
  })

  describe('tags', () => {
    it('replaces the set and derives names from the slugs (R11)', async () => {
      const response = await world().updateNote(JORGE, SNOOZED.id, {
        tags: ['client-b', 'new-one'],
      })
      expect(response.note.tags).toEqual([
        { slug: 'client-b', name: 'Client B' },
        { slug: 'new-one', name: 'New One' },
      ])
    })

    it('keeps the stored name of a tag the caller already has', async () => {
      const response = await world().updateNote(JORGE, SNOOZED.id, { tags: ['ideas'] })
      expect(response.note.tags).toEqual([{ slug: 'ideas', name: 'Ideas Board' }])
    })

    it('an empty list removes every tag', async () => {
      const response = await world().updateNote(JORGE, SNOOZED.id, { tags: [] })
      expect(response.note.tags).toEqual([])
    })

    it('does not touch the reminder', async () => {
      const response = await world().updateNote(JORGE, SNOOZED.id, { tags: ['x'] })
      expect(response.note.snoozeCount).toBe(2)
      expect(response.note.originalDueAt).toEqual(SNOOZED.originalDueAt)
    })
  })

  describe('reminder (R8)', () => {
    it('rescheduling a snoozed note sets due = original, count 0, and keeps notifiedDueAt (R10)', async () => {
      const { updateNote, notes } = world()
      const due = at('2026-10-09 10:00')
      const { note } = await updateNote(JORGE, SNOOZED.id, { dueAt: due })
      expect(note).toMatchObject({ dueAt: due, originalDueAt: due, snoozeCount: 0, doneAt: null })
      expect(notes.get(SNOOZED.id)?.notifiedDueAt).toEqual(SNOOZED.notifiedDueAt)
    })

    it('rescheduling a done note reopens it', async () => {
      const due = at('2026-10-09 10:00')
      const { note } = await world().updateNote(JORGE, DONE.id, { dueAt: due })
      expect(note).toMatchObject({ dueAt: due, doneAt: null })
    })

    it('rescheduling a note with no reminder gives it one', async () => {
      const due = at('2026-10-09 10:00')
      const { note } = await world().updateNote(JORGE, PLAIN.id, { dueAt: due })
      expect(note).toMatchObject({ dueAt: due, originalDueAt: due, snoozeCount: 0 })
    })

    it('applies R8 even when the value equals the current one (a done note reopens)', async () => {
      const { note } = await world().updateNote(JORGE, DONE.id, { dueAt: DONE.dueAt })
      expect(note.doneAt).toBeNull()
    })

    it('null removes every reminder field: the note is undated again (R19)', async () => {
      const { updateNote, notes } = world()
      const { note } = await updateNote(JORGE, SNOOZED.id, { dueAt: null })
      expect(note).toMatchObject({
        dueAt: null,
        originalDueAt: null,
        snoozeCount: 0,
        doneAt: null,
      })
      expect(notes.get(SNOOZED.id)?.notifiedDueAt).toBeNull()
    })

    it('an absent dueAt leaves the reminder as it was', async () => {
      const { note } = await world().updateNote(JORGE, DONE.id, { title: 'Renamed' })
      expect(note.doneAt).toEqual(DONE.doneAt)
      expect(note.dueAt).toEqual(DONE.dueAt)
    })
  })

  describe('ownership (R15, C11)', () => {
    it("is NotFound for another user's note and changes nothing", async () => {
      const { updateNote, notes } = world()
      await expect(updateNote(ANA, SNOOZED.id, { title: 'hijack' })).rejects.toBeInstanceOf(
        NotFoundError,
      )
      expect(notes.get(SNOOZED.id)?.title).toBe('Ask Luis')
    })

    it('is NotFound for an unknown id', async () => {
      await expect(world().updateNote(JORGE, noteId(999), { title: 'x' })).rejects.toBeInstanceOf(
        NotFoundError,
      )
    })
  })
})

describe('InMemoryNotes.updateOwn (the contract the Postgres adapter must keep)', () => {
  it('a throw inside the reminder step rolls back every field of the patch', async () => {
    const { notes } = world()
    await expect(
      notes.updateOwn(JORGE, SNOOZED.id, {
        title: 'half written',
        body: 'half written',
        tags: [{ slug: 'x', name: 'X' }],
        reminder: () => {
          throw new Error('boom')
        },
      }),
    ).rejects.toThrow('boom')
    const stored = await notes.findOwn(JORGE, SNOOZED.id)
    expect(stored).toMatchObject({ title: 'Ask Luis', body: 'old body', tags: SNOOZED.tags })
  })

  it('a patch that changes nothing writes nothing', async () => {
    const { notes } = world()
    await notes.updateOwn(JORGE, SNOOZED.id, { title: 'Ask Luis' })
    expect(notes.writes).toEqual([])
  })
})
