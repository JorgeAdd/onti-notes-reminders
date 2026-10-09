import {
  meResponseSchema,
  noteResponseSchema,
  todayResponseSchema,
  type MeResponse,
} from '@onti/shared'
import { at, BEFORE_CAPTURE, N1 } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import { UnauthorizedError } from '../src/application/errors'
import { makeGetMe } from '../src/application/get-me'
import { makeGetToday } from '../src/application/get-today'
import { makeCaptureNote } from '../src/application/capture-note'
import { makeMarkDone } from '../src/application/mark-done'
import { makeSearchNotes } from '../src/application/search-notes'
import { makeSetTimezone } from '../src/application/set-timezone'
import { makeSnoozeNote } from '../src/application/snooze-note'
import { makeUndoDone } from '../src/application/undo-done'
import type {
  Clock,
  NoteRepository,
  ProfileRepository,
  TokenVerifier,
} from '../src/application/ports'
import type { NoteRecord } from '../src/domain/note'
import { buildServer } from '../src/infrastructure/http/server'
import { ANA, InMemoryNotes, InMemoryProfiles, JORGE } from './fakes'

const verifier: TokenVerifier = {
  verify(token) {
    if (token === 'valid-token') return Promise.resolve(JORGE)
    if (token === 'ana-token') return Promise.resolve(ANA)
    return Promise.reject(new UnauthorizedError())
  },
}

const clock: Clock = { now: () => at('2026-10-07 09:05') }

/** C4 data: N1 was done Tue 17:00. */
const JORGE_NOTES: NoteRecord[] = [
  { ...N1, doneAt: at('2026-10-06 17:00') },
  ...BEFORE_CAPTURE,
].map((n, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  title: n.title,
  tags: n.tags.map((slug) => ({ slug, name: slug })),
  dueAt: n.dueAt,
  originalDueAt: n.originalDueAt,
  snoozeCount: n.snoozeCount,
  doneAt: n.doneAt,
  notifiedDueAt: n.notifiedDueAt,
  createdAt: n.createdAt,
}))

/** Owner-scoped, like RLS; fresh per server so writes never leak between tests. */
const freshNotes = () =>
  new InMemoryNotes(JORGE_NOTES.map((note) => ({ ownerId: JORGE.userId, note })))

const failingNotes: NoteRepository = {
  createOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
  listOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
  mutateReminder: () => Promise.reject(new Error('connection refused: postgres://secret')),
  searchOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
}

/** N1 (index 0) is done; N2 (index 1) is the late open item due Tue 18:00. */
const N1_ID = JORGE_NOTES[0]!.id
const N2_ID = JORGE_NOTES[1]!.id
const PLAIN_ID = JORGE_NOTES[7]!.id

/** Profile stub for read-only tests: reads answer, writes are never expected. */
const readOnly = (findOwn: ProfileRepository['findOwn']): ProfileRepository => ({
  findOwn,
  setTimezoneIfDefault: () => Promise.reject(new Error('unexpected write')),
})

function server(
  profiles: ProfileRepository = readOnly(() =>
    Promise.resolve({ timezone: 'America/Mexico_City' }),
  ),
  noteRepository: NoteRepository = freshNotes(),
) {
  return buildServer({
    verifier,
    getMe: makeGetMe(profiles),
    setTimezone: makeSetTimezone(profiles),
    getToday: makeGetToday({ clock, notes: noteRepository, profiles }),
    actions: {
      captureNote: makeCaptureNote({ notes: noteRepository }),
      snoozeNote: makeSnoozeNote({ clock, notes: noteRepository, profiles }),
      markDone: makeMarkDone({ clock, notes: noteRepository }),
      undoDone: makeUndoDone({ notes: noteRepository }),
    },
    corsOrigins: ['https://app.example'],
    searchNotes: makeSearchNotes({ clock, notes: noteRepository, profiles }),
  })
}

describe('GET /health', () => {
  it('is public', async () => {
    const res = await server().inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })
})

describe('GET /me', () => {
  it.each([
    ['no Authorization header', undefined],
    ['a non-bearer scheme', 'Basic abc'],
    ['an invalid token', 'Bearer forged'],
  ])('returns 401 with %s (R15)', async (_label, authorization) => {
    const res = await server().inject({
      method: 'GET',
      url: '/me',
      headers: authorization ? { authorization } : {},
    })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ error: 'unauthorized' })
  })

  it('returns the caller with their profile timezone', async () => {
    const res = await server().inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: 'Bearer valid-token' },
    })
    expect(res.statusCode).toBe(200)
    expect(meResponseSchema.parse(res.json())).toEqual({
      userId: JORGE.userId,
      email: 'jorge@example.com',
      timezone: 'America/Mexico_City',
    })
  })

  it('falls back to UTC when the profile is missing', async () => {
    const res = await server(readOnly(() => Promise.resolve(null))).inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: 'Bearer valid-token' },
    })
    expect(res.json<MeResponse>().timezone).toBe('UTC')
  })

  it('hides internal errors', async () => {
    const res = await server(
      readOnly(() => Promise.reject(new Error('connection refused: postgres://secret'))),
    ).inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: 'Bearer valid-token' },
    })
    expect(res.statusCode).toBe(500)
    expect(res.body).not.toContain('secret')
    expect(res.json()).toEqual({ error: 'internal_error' })
  })

  it('allows the configured web origin (CORS)', async () => {
    const res = await server().inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://app.example' },
    })
    expect(res.headers['access-control-allow-origin']).toBe('https://app.example')
  })
})

describe('PATCH /me', () => {
  const patch = (
    app: ReturnType<typeof server>,
    payload: unknown,
    authorization = 'Bearer valid-token',
  ) =>
    app.inject({
      method: 'PATCH',
      url: '/me',
      headers: { authorization },
      payload: payload as object,
    })

  it.each([
    ['no Authorization header', undefined],
    ['a non-bearer scheme', 'Basic abc'],
    ['a forged token', 'Bearer forged'],
  ])('returns 401 with %s (R15)', async (_label, authorization) => {
    const res = await server().inject({
      method: 'PATCH',
      url: '/me',
      headers: authorization ? { authorization } : {},
      payload: { timezone: 'America/Mexico_City' },
    })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ error: 'unauthorized' })
  })

  it('stores the zone while the profile is on UTC and returns it', async () => {
    const profiles = InMemoryProfiles.of({ [JORGE.userId]: 'UTC' })
    const res = await patch(server(profiles), { timezone: 'America/Mexico_City' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ timezone: 'America/Mexico_City' })
    expect(profiles.writes).toHaveLength(1)
  })

  it('answers 200 with the stored zone when the profile is already set (no-op)', async () => {
    const profiles = InMemoryProfiles.of({ [JORGE.userId]: 'America/New_York' })
    const res = await patch(server(profiles), { timezone: 'Asia/Kolkata' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ timezone: 'America/New_York' })
    expect(profiles.writes).toEqual([])
  })

  it.each([
    ['an unknown zone', { timezone: 'Mars/Olympus' }],
    ['an empty zone', { timezone: '' }],
    ['a non-string zone', { timezone: 42 }],
    ['a missing field', {}],
  ])('returns 400 for %s and writes nothing', async (_label, payload) => {
    const profiles = InMemoryProfiles.of({ [JORGE.userId]: 'UTC' })
    const res = await patch(server(profiles), payload)
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'validation_error' })
    expect(profiles.writes).toEqual([])
  })

  it('returns 400 for malformed JSON without leaking parser text', async () => {
    const res = await server().inject({
      method: 'PATCH',
      url: '/me',
      headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json' },
      payload: '{"timezone":',
    })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'validation_error' })
  })

  it('returns 400 when there is no body at all', async () => {
    const res = await server().inject({
      method: 'PATCH',
      url: '/me',
      headers: { authorization: 'Bearer valid-token' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'validation_error' })
  })

  it('returns 404 when the caller has no profile row', async () => {
    const profiles = InMemoryProfiles.of({ [ANA.userId]: 'UTC' })
    const res = await patch(server(profiles), { timezone: 'America/Mexico_City' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'not_found' })
  })

  it('hides internal errors', async () => {
    const profiles = new InMemoryProfiles()
    profiles.setTimezoneIfDefault = () =>
      Promise.reject(new Error('connection refused: postgres://secret'))
    const res = await patch(server(profiles), { timezone: 'America/Mexico_City' })
    expect(res.statusCode).toBe(500)
    expect(res.body).not.toContain('secret')
    expect(res.json()).toEqual({ error: 'internal_error' })
  })

  it('allows PATCH in the CORS preflight', async () => {
    const res = await server().inject({
      method: 'OPTIONS',
      url: '/me',
      headers: { origin: 'https://app.example', 'access-control-request-method': 'PATCH' },
    })
    expect(res.statusCode).toBe(204)
    expect(res.headers['access-control-allow-methods']).toContain('PATCH')
  })
})

describe('GET /today', () => {
  it.each([
    ['no Authorization header', undefined],
    ['a non-bearer scheme', 'Basic abc'],
    ['a forged token', 'Bearer forged'],
  ])('returns 401 with %s (R15)', async (_label, authorization) => {
    const res = await server().inject({
      method: 'GET',
      url: '/today',
      headers: authorization ? { authorization } : {},
    })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ error: 'unauthorized' })
  })

  it("returns the caller's day page in the wire shape (ISO instants)", async () => {
    const res = await server().inject({
      method: 'GET',
      url: '/today',
      headers: { authorization: 'Bearer valid-token' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ now: string; openCount: number }>()
    expect(body.now).toBe('2026-10-07T15:05:00.000Z')
    const page = todayResponseSchema.parse(body)
    expect(page.openCount).toBe(4)
    expect(page.otherCount).toBe(11)
    expect(page.carried[0]?.items).toHaveLength(2)
    expect(page.rail).toHaveLength(2)
  })

  it('never shows Ana the notes of Jorge (R15)', async () => {
    const res = await server().inject({
      method: 'GET',
      url: '/today',
      headers: { authorization: 'Bearer ana-token' },
    })
    expect(res.statusCode).toBe(200)
    const page = todayResponseSchema.parse(res.json())
    expect(page.carried).toEqual([])
    expect(page.rail).toEqual([])
    expect(page.otherCount).toBe(0)
    expect(res.body).not.toContain('staging')
  })

  it('hides internal errors', async () => {
    const res = await server(undefined, failingNotes).inject({
      method: 'GET',
      url: '/today',
      headers: { authorization: 'Bearer valid-token' },
    })
    expect(res.statusCode).toBe(500)
    expect(res.body).not.toContain('secret')
    expect(res.json()).toEqual({ error: 'internal_error' })
  })
})

describe('GET /today · query (date, tag)', () => {
  const get = (url: string, token: string | null = 'valid-token') =>
    server().inject({
      method: 'GET',
      url,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })

  it('answers 401 before it looks at a bad query', async () => {
    const res = await get('/today?date=garbage&tag=Nope', null)
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ error: 'unauthorized' })
  })

  it.each([
    ['an impossible date', 'date=2026-02-30'],
    ['an unpadded date', 'date=2026-1-5'],
    ['a year out of range', 'date=1999-12-31'],
    ['an empty date', 'date='],
    ['a repeated date', 'date=2026-10-06&date=2026-10-07'],
    ['an uppercase tag', 'tag=Client-B'],
    ['an empty tag', 'tag='],
    ['a 41 character tag', `tag=${'a'.repeat(41)}`],
    ['an unknown tag', 'tag=nope'],
    ['a tag with no notes of the caller', 'tag=staging-only'],
  ])('answers 400 for %s', async (_label, query) => {
    const res = await get(`/today?${query}`)
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'validation_error' })
  })

  it("answers 400 for a tag that only another user's notes carry (R15)", async () => {
    const res = await get('/today?tag=client-a', 'ana-token')
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'validation_error' })
  })

  it('answers 200 for a known tag and round-trips the schema', async () => {
    const res = await get('/today?tag=client-a')
    expect(res.statusCode).toBe(200)
    const page = todayResponseSchema.parse(res.json())
    expect(page.tag).toBe('client-a')
    expect(page.hiddenCount).toBe(JORGE_NOTES.filter((n) => n.tags[0]?.slug !== 'client-a').length)
  })

  it('answers 200 for a past day and for the date of today', async () => {
    const past = todayResponseSchema.parse((await get('/today?date=2026-10-06')).json())
    expect(past.isToday).toBe(false)
    expect(past.date).toBe('2026-10-06')
    const same = await get('/today?date=2026-10-07')
    expect(same.statusCode).toBe(200)
    expect(same.json()).toEqual((await get('/today')).json())
  })

  it('ignores unknown query keys', async () => {
    expect((await get('/today?foo=bar')).statusCode).toBe(200)
  })
})

describe('reminder actions', () => {
  const post = (
    app: ReturnType<typeof server>,
    url: string,
    payload?: object,
    authorization: string | null = 'Bearer valid-token',
  ) =>
    app.inject({
      method: 'POST',
      url,
      headers: authorization ? { authorization } : {},
      ...(payload ? { payload } : {}),
    })

  it.each([
    ['snooze', { preset: 'hour' }],
    ['done', undefined],
    ['undo', undefined],
  ])('%s: 401 without a valid token (R15)', async (action, payload) => {
    for (const authorization of [null, 'Basic abc', 'Bearer forged']) {
      const res = await post(server(), `/notes/${N2_ID}/${action}`, payload, authorization)
      expect(res.statusCode).toBe(401)
      expect(res.json()).toEqual({ error: 'unauthorized' })
    }
  })

  it('snooze +1 h (C5): 200 with the note in the wire shape, no internal fields', async () => {
    const res = await post(server(), `/notes/${N2_ID}/snooze`, { preset: 'hour' })
    expect(res.statusCode).toBe(200)
    const body = res.json<Record<string, unknown>>()
    expect(body).not.toHaveProperty('notifiedDueAt')
    const note = noteResponseSchema.parse(body)
    expect(note.id).toBe(N2_ID)
    expect(note.dueAt).toEqual(at('2026-10-07 10:05'))
    expect(note.originalDueAt).toEqual(at('2026-10-06 18:00'))
    expect(note.snoozeCount).toBe(1)
  })

  it('snooze tomorrow (C6): due Thu 09:00 in the profile zone', async () => {
    const res = await post(server(), `/notes/${N2_ID}/snooze`, { preset: 'tomorrow' })
    expect(res.statusCode).toBe(200)
    expect(noteResponseSchema.parse(res.json()).dueAt).toEqual(at('2026-10-08 09:00'))
  })

  it.each([
    ['an unknown preset', { preset: 'week' }],
    ['a missing preset', {}],
    ['a non-string preset', { preset: 1 }],
  ])('snooze: 400 for %s and nothing changes', async (_label, payload) => {
    const notes = freshNotes()
    const res = await post(server(undefined, notes), `/notes/${N2_ID}/snooze`, payload)
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'validation_error' })
    expect(notes.writes).toEqual([])
  })

  it('snooze: 400 when there is no body, and 400 for malformed JSON', async () => {
    const noBody = await post(server(), `/notes/${N2_ID}/snooze`)
    expect(noBody.statusCode).toBe(400)
    const malformed = await server().inject({
      method: 'POST',
      url: `/notes/${N2_ID}/snooze`,
      headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json' },
      payload: '{"preset":',
    })
    expect(malformed.statusCode).toBe(400)
    expect(malformed.json()).toEqual({ error: 'validation_error' })
  })

  it('done (C3): 200 with done_at stamped by the clock, no body needed', async () => {
    const res = await post(server(), `/notes/${N2_ID}/done`)
    expect(res.statusCode).toBe(200)
    expect(noteResponseSchema.parse(res.json()).doneAt).toEqual(at('2026-10-07 09:05'))
  })

  it('done on a done note: 200 no-op keeping the first done_at', async () => {
    const res = await post(server(), `/notes/${N1_ID}/done`)
    expect(res.statusCode).toBe(200)
    expect(noteResponseSchema.parse(res.json()).doneAt).toEqual(at('2026-10-06 17:00'))
  })

  it('undo: 200 reopens a done note; 200 no-op on an open one', async () => {
    const reopened = await post(server(), `/notes/${N1_ID}/undo`)
    expect(reopened.statusCode).toBe(200)
    expect(noteResponseSchema.parse(reopened.json()).doneAt).toBeNull()
    const noop = await post(server(), `/notes/${N2_ID}/undo`)
    expect(noop.statusCode).toBe(200)
    expect(noteResponseSchema.parse(noop.json()).doneAt).toBeNull()
  })

  it('409 conflict with its reason: snooze on done, snooze or done without a reminder', async () => {
    const onDone = await post(server(), `/notes/${N1_ID}/snooze`, { preset: 'hour' })
    expect(onDone.statusCode).toBe(409)
    expect(onDone.json()).toEqual({ error: 'conflict', reason: 'not_open' })

    const plainSnooze = await post(server(), `/notes/${PLAIN_ID}/snooze`, { preset: 'hour' })
    expect(plainSnooze.statusCode).toBe(409)
    expect(plainSnooze.json()).toEqual({ error: 'conflict', reason: 'no_reminder' })

    const plainDone = await post(server(), `/notes/${PLAIN_ID}/done`)
    expect(plainDone.statusCode).toBe(409)
    expect(plainDone.json()).toEqual({ error: 'conflict', reason: 'no_reminder' })
  })

  it.each([
    ['snooze', { preset: 'hour' }],
    ['done', undefined],
    ['undo', undefined],
  ])(
    "%s: 404 for an unknown id, a non-UUID id and Jorge's note as Ana (R15, C11)",
    async (action, payload) => {
      const app = server()
      const unknown = await post(
        app,
        `/notes/ffffffff-ffff-4fff-8fff-ffffffffffff/${action}`,
        payload,
      )
      expect(unknown.statusCode).toBe(404)
      expect(unknown.json()).toEqual({ error: 'not_found' })

      const malformedId = await post(app, `/notes/N2/${action}`, payload)
      expect(malformedId.statusCode).toBe(404)

      const notes = freshNotes()
      const foreign = await post(
        server(undefined, notes),
        `/notes/${N2_ID}/${action}`,
        payload,
        'Bearer ana-token',
      )
      expect(foreign.statusCode).toBe(404)
      expect(foreign.json()).toEqual({ error: 'not_found' })
      expect(notes.writes).toEqual([])
    },
  )

  it('hides internal errors', async () => {
    const res = await post(server(undefined, failingNotes), `/notes/${N2_ID}/done`)
    expect(res.statusCode).toBe(500)
    expect(res.body).not.toContain('secret')
    expect(res.json()).toEqual({ error: 'internal_error' })
  })
})

describe('POST /notes', () => {
  const capture = { title: 'Call back', tags: ['client-a'], dueAt: '2026-10-07T22:00:00.000Z' }
  const post = (
    app: ReturnType<typeof server>,
    payload: unknown,
    authorization: string | null = 'Bearer valid-token',
  ) =>
    app.inject({
      method: 'POST',
      url: '/notes',
      headers: authorization ? { authorization } : {},
      payload: payload as object,
    })

  it.each([
    ['no Authorization header', null],
    ['a non-bearer scheme', 'Basic abc'],
    ['a forged token', 'Bearer forged'],
  ])('returns 401 with %s (R15)', async (_label, authorization) => {
    const notes = freshNotes()
    const res = await post(server(undefined, notes), capture, authorization)
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ error: 'unauthorized' })
    expect(notes.created).toEqual([])
  })

  it('C1 · returns 201 with the saved note: due = original due, count 0, tag Client A', async () => {
    const notes = freshNotes()
    const res = await post(server(undefined, notes), {
      title: 'Notify Ana: move repo permissions from me to Luis',
      tags: ['client-a'],
      dueAt: '2026-10-06T23:00:00.000Z',
    })
    expect(res.statusCode).toBe(201)
    const body = res.json<Record<string, unknown>>()
    expect(body).not.toHaveProperty('notifiedDueAt')
    const note = noteResponseSchema.parse(body)
    expect(note.title).toBe('Notify Ana: move repo permissions from me to Luis')
    expect(note.tags).toEqual([{ slug: 'client-a', name: 'Client A' }])
    expect(note.dueAt).toEqual(new Date('2026-10-06T23:00:00.000Z'))
    expect(note.originalDueAt).toEqual(note.dueAt)
    expect(note.snoozeCount).toBe(0)
    expect(note.doneAt).toBeNull()
    expect(notes.created).toHaveLength(1)
    expect(notes.created[0]?.ownerId).toBe(JORGE.userId)
  })

  it('saves a plain note (dueAt null, no tags) as 201 with null dates', async () => {
    const res = await post(server(), { title: 'Buy cable', tags: [], dueAt: null })
    expect(res.statusCode).toBe(201)
    const note = noteResponseSchema.parse(res.json())
    expect(note.dueAt).toBeNull()
    expect(note.originalDueAt).toBeNull()
    expect(note.tags).toEqual([])
  })

  it('truncates seconds and derives the tag name on the server, never from the client', async () => {
    const res = await post(server(), {
      ...capture,
      dueAt: '2026-10-07T22:00:41.000Z',
      tags: ['home'],
    })
    expect(res.statusCode).toBe(201)
    const note = noteResponseSchema.parse(res.json())
    expect(note.dueAt).toEqual(new Date('2026-10-07T22:00:00.000Z'))
    expect(note.tags).toEqual([{ slug: 'home', name: 'Home' }])
  })

  it.each([
    ['an empty title', { title: '' }],
    ['a blank title', { title: '   ' }],
    ['a 201-character title', { title: 'a'.repeat(201) }],
    ['a malformed slug', { tags: ['Client A'] }],
    ['a 41-character slug', { tags: ['a'.repeat(41)] }],
    ['11 tags', { tags: Array.from({ length: 11 }, (_, i) => `tag-${i}`) }],
    ['duplicate slugs', { tags: ['home', 'home'] }],
    ['an unparsable due', { dueAt: 'tomorrow' }],
    ['a client-supplied tag name', { tags: [{ slug: 'home', name: 'Casa' }] }],
    ['a missing title', { title: undefined }],
  ])('returns 400 for %s and stores nothing', async (_label, patch) => {
    const notes = freshNotes()
    const res = await post(server(undefined, notes), { ...capture, ...patch })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'validation_error' })
    expect(notes.created).toEqual([])
  })

  it('returns 400 for malformed JSON and for no body', async () => {
    const malformed = await server().inject({
      method: 'POST',
      url: '/notes',
      headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json' },
      payload: '{"title":',
    })
    expect(malformed.statusCode).toBe(400)
    expect(malformed.json()).toEqual({ error: 'validation_error' })

    const empty = await server().inject({
      method: 'POST',
      url: '/notes',
      headers: { authorization: 'Bearer valid-token' },
    })
    expect(empty.statusCode).toBe(400)
  })

  it('hides internal errors', async () => {
    const res = await post(server(undefined, failingNotes), capture)
    expect(res.statusCode).toBe(500)
    expect(res.body).not.toContain('secret')
    expect(res.json()).toEqual({ error: 'internal_error' })
  })
})
