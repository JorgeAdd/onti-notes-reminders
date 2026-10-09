import { at } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import { NotFoundError } from '../src/application/errors'
import { makeGetNote } from '../src/application/get-note'
import type { Clock, Profile } from '../src/application/ports'
import { ANA, InMemoryNotes, JORGE, noteId, noteRecord, profileReturning } from './fakes'

const NOW = at('2026-10-07 09:05')
const BODY = 'Ana needs to move **admin** permissions on `client-a/web`.\n\n- Repo settings'
const CREATED = at('2026-10-07 08:50')

const N1 = noteRecord(1, {
  title: 'Ask Luis for the admin permissions',
  tags: [{ slug: 'client-a', name: 'Client A' }],
  dueAt: at('2026-10-07 17:00'),
  originalDueAt: at('2026-10-07 17:00'),
  snoozeCount: 1,
  createdAt: CREATED,
})

function getter(profile: Profile | null = { timezone: 'America/Mexico_City' }) {
  let reads = 0
  const clock: Clock = {
    now: () => {
      reads += 1
      return NOW
    },
  }
  const notes = new InMemoryNotes([
    { ownerId: JORGE.userId, note: N1, body: BODY },
    { ownerId: JORGE.userId, note: noteRecord(2, { title: 'Plain note' }) },
  ])
  return {
    getNote: makeGetNote({ clock, notes, profiles: profileReturning(profile) }),
    reads: () => reads,
  }
}

describe('getNote (C11, R15)', () => {
  it('returns the note with its body, tags, reminder state and creation time', async () => {
    const response = await getter().getNote(JORGE, N1.id)
    expect(response.note).toEqual({
      id: N1.id,
      title: N1.title,
      tags: [{ slug: 'client-a', name: 'Client A' }],
      dueAt: N1.dueAt,
      originalDueAt: N1.originalDueAt,
      snoozeCount: 1,
      doneAt: null,
      createdAt: CREATED,
      body: BODY,
    })
  })

  it('does not leak the notification bookkeeping into the response', async () => {
    const { note } = await getter().getNote(JORGE, N1.id)
    expect(note).not.toHaveProperty('notifiedDueAt')
  })

  it('gives an empty body for a note without one', async () => {
    const { note } = await getter().getNote(JORGE, noteId(2))
    expect(note.body).toBe('')
  })

  it('carries now and the profile timezone, reading the clock once', async () => {
    const withProfile = getter()
    const response = await withProfile.getNote(JORGE, N1.id)
    expect(response.now).toEqual(NOW)
    expect(response.timezone).toBe('America/Mexico_City')
    expect(withProfile.reads()).toBe(1)
  })

  it('uses UTC while the profile row is missing', async () => {
    expect((await getter(null).getNote(JORGE, N1.id)).timezone).toBe('UTC')
  })

  it("is NotFound for another user's note (C11: Ana asks for Jorge's N1)", async () => {
    await expect(getter().getNote(ANA, N1.id)).rejects.toBeInstanceOf(NotFoundError)
  })

  it('is NotFound for an id nobody owns', async () => {
    await expect(getter().getNote(JORGE, noteId(999))).rejects.toBeInstanceOf(NotFoundError)
  })
})
