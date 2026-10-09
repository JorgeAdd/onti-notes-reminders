import { noteDetailResponseSchema } from '@onti/shared'
import { at } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import { makeCaptureNote } from '../src/application/capture-note'
import { makeDeleteNote } from '../src/application/delete-note'
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
import { makeUpdateNote } from '../src/application/update-note'
import { buildServer } from '../src/infrastructure/http/server'
import { ANA, InMemoryNotes, JORGE, noteId, noteRecord, profileReturning } from './fakes'

/** PATCH and DELETE /notes/:id (R20, R8, R15, C11) through Fastify inject over the fake. */
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
  snoozeCount: 1,
  doneAt: at('2026-10-07 08:00'),
  notifiedDueAt: at('2026-10-07 17:00'),
  createdAt: new Date('2026-10-07T14:50:00.000Z'),
})

const failingNotes: NoteRepository = {
  createOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
  listOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
  mutateReminder: () => Promise.reject(new Error('connection refused: postgres://secret')),
  searchOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
  findOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
  updateOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
  deleteOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
}

const freshNotes = () =>
  new InMemoryNotes([{ ownerId: JORGE.userId, note: N1, body: 'Ana needs **admin** access' }])

function server(notes: NoteRepository = freshNotes()) {
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
      updateNote: makeUpdateNote({ clock, notes, profiles }),
      deleteNote: makeDeleteNote({ notes }),
    },
    corsOrigins: ['https://app.example'],
    searchNotes: makeSearchNotes({ clock, notes, profiles }),
    getNote: makeGetNote({ clock, notes, profiles }),
  })
}

interface PatchOptions {
  id?: string
  auth?: string | null
  app?: ReturnType<typeof server>
}

const patch = (
  payload: object,
  { id = N1.id, auth = 'Bearer valid-token', app = server() }: PatchOptions = {},
) =>
  app.inject({
    method: 'PATCH',
    url: `/notes/${id}`,
    headers: auth ? { authorization: auth } : {},
    payload,
  })
const del = (id = N1.id, auth: string | null = 'Bearer valid-token', app = server()) =>
  app.inject({
    method: 'DELETE',
    url: `/notes/${id}`,
    headers: auth ? { authorization: auth } : {},
  })
const get = (app: ReturnType<typeof server>, id = N1.id) =>
  app.inject({
    method: 'GET',
    url: `/notes/${id}`,
    headers: { authorization: 'Bearer valid-token' },
  })

describe('PATCH /notes/:id', () => {
  it('answers 200 with the updated detail in the shared wire shape', async () => {
    const res = await patch({ title: '  New title  ', body: 'new **body**' })
    expect(res.statusCode).toBe(200)
    const detail = noteDetailResponseSchema.parse(res.json())
    expect(detail.note).toMatchObject({ id: N1.id, title: 'New title', body: 'new **body**' })
    expect(detail.note.tags).toEqual([{ slug: 'client-a', name: 'Client A' }])
    expect(detail.note.dueAt).toEqual(N1.dueAt)
    expect(detail.timezone).toBe('America/Mexico_City')
    expect(res.json()).not.toHaveProperty('note.notifiedDueAt')
  })

  it('an empty body is a valid edit (R20)', async () => {
    const res = await patch({ body: '' })
    expect(res.statusCode).toBe(200)
    expect(res.json<{ note: { body: string } }>().note.body).toBe('')
  })

  it('replaces tags, deriving names on the server and ignoring client-sent names (R11)', async () => {
    const res = await patch({ tags: ['client-b'], tagNames: ['Evil'] })
    expect(res.json<{ note: { tags: unknown } }>().note.tags).toEqual([
      { slug: 'client-b', name: 'Client B' },
    ])
  })

  it('reschedules (R8): to the minute, reopening the done note, count reset', async () => {
    const res = await patch({ dueAt: '2026-10-09T15:30:45.000Z' })
    expect(res.json<{ note: object }>().note).toMatchObject({
      dueAt: '2026-10-09T15:30:00.000Z',
      originalDueAt: '2026-10-09T15:30:00.000Z',
      snoozeCount: 0,
      doneAt: null,
    })
  })

  it('removes the reminder with null (R8, R19)', async () => {
    const res = await patch({ dueAt: null })
    expect(res.json<{ note: object }>().note).toMatchObject({
      dueAt: null,
      originalDueAt: null,
      snoozeCount: 0,
      doneAt: null,
    })
  })

  it.each([
    ['an empty object', {}],
    ['a blank title', { title: '   ' }],
    ['a title over the limit', { title: 'x'.repeat(201) }],
    ['a body over the limit', { body: 'x'.repeat(20001) }],
    ['an invalid slug', { tags: ['Not A Slug'] }],
    ['a NUL character', { title: 'a\u0000b' }],
    ['a bad due time', { dueAt: 'tomorrow' }],
  ])('answers 400 for %s and leaves the note unchanged', async (_label, payload) => {
    const app = server()
    const res = await patch(payload, { app })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'validation_error' })
    const after = noteDetailResponseSchema.parse((await get(app)).json())
    expect(after.note).toMatchObject({ title: N1.title, body: 'Ana needs **admin** access' })
  })

  it('answers 400 for malformed JSON', async () => {
    const res = await server().inject({
      method: 'PATCH',
      url: `/notes/${N1.id}`,
      headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json' },
      payload: '{nope',
    })
    expect(res.statusCode).toBe(400)
  })

  it("C11: Ana patching Jorge's note gets 404 and the note is untouched", async () => {
    const app = server()
    const res = await patch({ title: 'hijack' }, { auth: 'Bearer ana-token', app })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'not_found' })
    expect(res.body).not.toContain(N1.title)
    expect(noteDetailResponseSchema.parse((await get(app)).json()).note.title).toBe(N1.title)
  })

  it('answers the same 404 for an unknown uuid and for a non-uuid id', async () => {
    const unknown = await patch({ title: 'x' }, { id: noteId(999) })
    expect(unknown.statusCode).toBe(404)
    for (const id of ['N1', 'not-a-uuid']) {
      const res = await patch({ title: 'x' }, { id })
      expect(res.statusCode).toBe(404)
      expect(res.json()).toEqual(unknown.json())
    }
  })

  it.each([
    ['no Authorization header', null],
    ['a non-bearer scheme', 'Basic abc'],
    ['a forged token', 'Bearer forged'],
  ])('answers 401 for %s, before the id and the body are looked at', async (_label, auth) => {
    expect((await patch({ title: 'x' }, { auth })).statusCode).toBe(401)
    expect((await patch({}, { auth, id: 'not-a-uuid' })).statusCode).toBe(401)
  })

  it('last write wins: two patches in sequence leave the second title', async () => {
    const app = server()
    await patch({ title: 'First' }, { app })
    await patch({ title: 'Second' }, { app })
    expect(noteDetailResponseSchema.parse((await get(app)).json()).note.title).toBe('Second')
  })

  it('answers 500 without leaking the failure when the repository breaks', async () => {
    const res = await patch({ title: 'x' }, { app: server(failingNotes) })
    expect(res.statusCode).toBe(500)
    expect(res.json()).toEqual({ error: 'internal_error' })
    expect(res.body).not.toContain('secret')
  })
})

describe('DELETE /notes/:id', () => {
  it('answers 204 with an empty body, then 404 on GET and on a repeat', async () => {
    const app = server()
    const res = await del(N1.id, 'Bearer valid-token', app)
    expect(res.statusCode).toBe(204)
    expect(res.body).toBe('')
    expect((await get(app)).statusCode).toBe(404)
    expect((await del(N1.id, 'Bearer valid-token', app)).statusCode).toBe(404)
  })

  it("C11: Ana deleting Jorge's note gets 404 and the note survives", async () => {
    const app = server()
    const res = await del(N1.id, 'Bearer ana-token', app)
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'not_found' })
    expect((await get(app)).statusCode).toBe(200)
  })

  it('answers the same 404 for an unknown uuid and for a non-uuid id', async () => {
    const unknown = await del(noteId(999))
    expect(unknown.statusCode).toBe(404)
    const bad = await del('not-a-uuid')
    expect(bad.statusCode).toBe(404)
    expect(bad.json()).toEqual(unknown.json())
  })

  it.each([
    ['no Authorization header', null],
    ['a forged token', 'Bearer forged'],
  ])('answers 401 for %s', async (_label, auth) => {
    const app = server()
    expect((await del(N1.id, auth, app)).statusCode).toBe(401)
    expect((await get(app)).statusCode).toBe(200)
  })

  it('answers 500 without leaking the failure when the repository breaks', async () => {
    const res = await del(N1.id, 'Bearer valid-token', server(failingNotes))
    expect(res.statusCode).toBe(500)
    expect(res.body).not.toContain('secret')
  })
})
