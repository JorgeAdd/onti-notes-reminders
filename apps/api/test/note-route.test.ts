import { noteDetailResponseSchema } from '@onti/shared'
import { at } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import { makeCaptureNote } from '../src/application/capture-note'
import { UnauthorizedError } from '../src/application/errors'
import { makeGetMe } from '../src/application/get-me'
import { makeGetNote } from '../src/application/get-note'
import { makeGetToday } from '../src/application/get-today'
import { makeMarkDone } from '../src/application/mark-done'
import type { Clock, NoteRepository, TokenVerifier } from '../src/application/ports'
import { makeSearchNotes } from '../src/application/search-notes'
import { makeSetTimezone } from '../src/application/set-timezone'
import { makeSnoozeNote } from '../src/application/snooze-note'
import { makeUndoDone } from '../src/application/undo-done'
import { buildServer } from '../src/infrastructure/http/server'
import { ANA, InMemoryNotes, JORGE, noteId, noteRecord, profileReturning } from './fakes'

const verifier: TokenVerifier = {
  verify(token) {
    if (token === 'valid-token') return Promise.resolve(JORGE)
    if (token === 'ana-token') return Promise.resolve(ANA)
    return Promise.reject(new UnauthorizedError())
  },
}
const clock: Clock = { now: () => at('2026-10-07 09:05') }
const profiles = profileReturning({ timezone: 'America/Mexico_City' })

const N1 = noteRecord(1, {
  title: 'Ask Luis for the admin permissions',
  tags: [{ slug: 'client-a', name: 'Client A' }],
  dueAt: at('2026-10-07 17:00'),
  originalDueAt: at('2026-10-07 17:00'),
  createdAt: new Date('2026-10-07T14:50:00.000Z'),
})
const BODY = 'Ana needs **admin** access'

const failingNotes: NoteRepository = {
  createOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
  listOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
  mutateReminder: () => Promise.reject(new Error('connection refused: postgres://secret')),
  searchOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
  findOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
}

function server(
  notes: NoteRepository = new InMemoryNotes([{ ownerId: JORGE.userId, note: N1, body: BODY }]),
) {
  return buildServer({
    verifier,
    getMe: makeGetMe(profiles),
    setTimezone: makeSetTimezone(profiles),
    getToday: makeGetToday({ clock, notes, profiles }),
    actions: {
      captureNote: makeCaptureNote({ notes }),
      snoozeNote: makeSnoozeNote({ clock, notes, profiles }),
      markDone: makeMarkDone({ clock, notes }),
      undoDone: makeUndoDone({ notes }),
    },
    corsOrigins: ['https://app.example'],
    searchNotes: makeSearchNotes({ clock, notes, profiles }),
    getNote: makeGetNote({ clock, notes, profiles }),
  })
}

const get = (url: string, authorization: string | null = 'Bearer valid-token', app = server()) =>
  app.inject({ method: 'GET', url, headers: authorization ? { authorization } : {} })

describe('GET /notes/:id', () => {
  it('answers 200 with the detail shape: note, body, now and timezone', async () => {
    const res = await get(`/notes/${N1.id}`)
    expect(res.statusCode).toBe(200)
    const detail = noteDetailResponseSchema.parse(res.json())
    expect(detail.note).toMatchObject({ id: N1.id, title: N1.title, body: BODY })
    expect(detail.note.createdAt).toEqual(N1.createdAt)
    expect(detail.timezone).toBe('America/Mexico_City')
    expect(res.json<{ now: string; note: { createdAt: string } }>()).toMatchObject({
      now: '2026-10-07T15:05:00.000Z',
      note: { createdAt: '2026-10-07T14:50:00.000Z' },
    })
  })

  it("C11: Ana asking for Jorge's N1 gets 404 and no hint that it exists", async () => {
    const res = await get(`/notes/${N1.id}`, 'Bearer ana-token')
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'not_found' })
    expect(res.body).not.toContain(N1.title)
  })

  it('answers the same 404 for an unknown uuid and for a non-uuid id', async () => {
    const unknown = await get(`/notes/${noteId(999)}`)
    expect(unknown.statusCode).toBe(404)
    for (const id of ['N1', 'not-a-uuid', '123']) {
      const res = await get(`/notes/${id}`)
      expect(res.statusCode).toBe(404)
      expect(res.json()).toEqual(unknown.json())
    }
  })

  it.each([
    ['no Authorization header', null],
    ['a non-bearer scheme', 'Basic abc'],
    ['a forged token', 'Bearer forged'],
  ])('answers 401 for %s, before looking at the id', async (_label, authorization) => {
    expect((await get(`/notes/${N1.id}`, authorization)).statusCode).toBe(401)
    expect((await get('/notes/not-a-uuid', authorization)).statusCode).toBe(401)
  })

  it('answers 500 without leaking the failure when the repository breaks', async () => {
    const res = await get(`/notes/${N1.id}`, 'Bearer valid-token', server(failingNotes))
    expect(res.statusCode).toBe(500)
    expect(res.json()).toEqual({ error: 'internal_error' })
    expect(res.body).not.toContain('secret')
  })
})
