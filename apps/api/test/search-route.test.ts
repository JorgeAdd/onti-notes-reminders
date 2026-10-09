import { notesListResponseSchema, tagNameFromSlug } from '@onti/shared'
import { at, BEFORE_CAPTURE, N1 } from '@onti/shared/fixtures/jorge-week'
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
import { ANA, InMemoryNotes, JORGE, noteRecord, profileReturning } from './fakes'

const verifier: TokenVerifier = {
  verify(token) {
    if (token === 'valid-token') return Promise.resolve(JORGE)
    if (token === 'ana-token') return Promise.resolve(ANA)
    return Promise.reject(new UnauthorizedError())
  },
}
const clock: Clock = { now: () => at('2026-10-07 09:05') }
const profiles = profileReturning({ timezone: 'America/Mexico_City' })

/** Jorge's 15 notes; N8's body holds "Staging" so the body is searched too. */
const JORGE_NOTES = [N1, ...BEFORE_CAPTURE].map((fixture, index) => ({
  ownerId: JORGE.userId,
  body: fixture.id === 'N8' ? 'Staging: https://staging.client-b.example' : '',
  createdAt: new Date(Date.UTC(2026, 9, 1, 0, 15 - index)),
  note: noteRecord(index, {
    title: fixture.title,
    tags: fixture.tags.map((slug) => ({ slug, name: tagNameFromSlug(slug) })),
    dueAt: fixture.dueAt,
    originalDueAt: fixture.originalDueAt,
  }),
}))

const failingNotes: NoteRepository = {
  createOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
  listOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
  mutateReminder: () => Promise.reject(new Error('connection refused: postgres://secret')),
  searchOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
  findOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
  updateOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
  deleteOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
}

function server(notes: NoteRepository = new InMemoryNotes(JORGE_NOTES)) {
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

const get = (url: string, authorization: string | null = 'Bearer valid-token', app = server()) =>
  app.inject({ method: 'GET', url, headers: authorization ? { authorization } : {} })

describe('GET /notes', () => {
  it('returns the caller`s notes in the shared wire shape, newest first', async () => {
    const res = await get('/notes')
    expect(res.statusCode).toBe(200)
    const page = notesListResponseSchema.parse(res.json())
    expect(page.total).toBe(15)
    expect(page.notes).toHaveLength(15)
    expect(page.notes[0]!.title).toBe(N1.title)
    expect(page.timezone).toBe('America/Mexico_City')
    expect(page.now).toEqual(at('2026-10-07 09:05'))
    expect(res.json<{ now: string }>().now).toBe('2026-10-07T15:05:00.000Z')
  })

  it('narrows by q and keeps the total (C9)', async () => {
    const page = notesListResponseSchema.parse((await get('/notes?q=staging')).json())
    expect(page.notes.map((n) => n.title)).toEqual([
      'Reply to Marta about the staging deploy window',
      'Staging URL and test accounts',
    ])
    expect(page.notes[1]!.excerpt).toBe('Staging: https://staging.client-b.example')
    expect(page.total).toBe(15)
  })

  it('treats an empty or blank q as no filter', async () => {
    const all = (await get('/notes')).json<unknown>()
    expect((await get('/notes?q=')).json()).toEqual(all)
    expect((await get('/notes?q=%20%20')).json()).toEqual(all)
  })

  it('answers 200 for hostile input and ignores unknown parameters', async () => {
    const hostile = encodeURIComponent(`staging' | !:* (`)
    const res = await get(`/notes?q=${hostile}&limit=999`)
    expect(res.statusCode).toBe(200)
    expect(notesListResponseSchema.parse(res.json()).notes).toHaveLength(2)
  })

  it.each([
    ['no Authorization header', null],
    ['a non-bearer scheme', 'Basic abc'],
    ['a forged token', 'Bearer forged'],
  ])('returns 401 with %s (C11)', async (_label, authorization) => {
    const res = await get('/notes', authorization)
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ error: 'unauthorized' })
  })

  it('lists 0 of Jorge`s notes for Ana (C11, R15)', async () => {
    const res = await get('/notes', 'Bearer ana-token')
    expect(res.statusCode).toBe(200)
    expect(notesListResponseSchema.parse(res.json())).toMatchObject({ total: 0, notes: [] })
    const searched = await get('/notes?q=staging', 'Bearer ana-token')
    expect(notesListResponseSchema.parse(searched.json())).toMatchObject({ total: 0, notes: [] })
  })

  it('returns 400 for a q over 200 characters and for a repeated q', async () => {
    const tooLong = await get(`/notes?q=${'a'.repeat(201)}`)
    expect(tooLong.statusCode).toBe(400)
    expect(tooLong.json()).toEqual({ error: 'validation_error' })
    expect((await get(`/notes?q=${'a'.repeat(200)}`)).statusCode).toBe(200)
    expect((await get('/notes?q=a&q=b')).statusCode).toBe(400)
  })

  it('checks the token before the query (401 wins over 400)', async () => {
    expect((await get('/notes?q=a&q=b', null)).statusCode).toBe(401)
  })

  it('hides internal errors', async () => {
    const res = await get('/notes', 'Bearer valid-token', server(failingNotes))
    expect(res.statusCode).toBe(500)
    expect(res.body).not.toContain('secret')
    expect(res.json()).toEqual({ error: 'internal_error' })
  })

  it('narrows by tag, alone and with q, and keeps the total', async () => {
    const byTag = notesListResponseSchema.parse((await get('/notes?tag=client-b')).json())
    expect(byTag.notes).toHaveLength(5)
    expect(byTag.total).toBe(15)
    const both = notesListResponseSchema.parse((await get('/notes?q=staging&tag=client-b')).json())
    expect(both.notes.map((n) => n.title)).toEqual(['Staging URL and test accounts'])
  })

  it('answers an empty list for an unknown tag and 400 for a malformed or repeated tag', async () => {
    const unknown = await get('/notes?tag=nope')
    expect(unknown.statusCode).toBe(200)
    expect(notesListResponseSchema.parse(unknown.json())).toMatchObject({ notes: [], total: 15 })
    for (const url of ['/notes?tag=Client%20B', '/notes?tag=', '/notes?tag=a&tag=b']) {
      expect((await get(url)).statusCode).toBe(400)
    }
    expect((await get('/notes?tag=client-b', 'Bearer ana-token')).json()).toMatchObject({
      notes: [],
      total: 0,
    })
  })

  it('allows GET from the web origin (CORS preflight)', async () => {
    const res = await server().inject({
      method: 'OPTIONS',
      url: '/notes',
      headers: {
        origin: 'https://app.example',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'authorization',
      },
    })
    expect(res.statusCode).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('https://app.example')
    expect(res.headers['access-control-allow-methods']).toContain('GET')
  })
})
