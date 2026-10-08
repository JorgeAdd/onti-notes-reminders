import { meResponseSchema, todayResponseSchema, type MeResponse } from '@onti/shared'
import { at, BEFORE_CAPTURE, N1 } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import { UnauthorizedError } from '../src/application/errors'
import { makeGetMe } from '../src/application/get-me'
import { makeGetToday } from '../src/application/get-today'
import { makeSetTimezone } from '../src/application/set-timezone'
import type {
  Clock,
  NoteRepository,
  ProfileRepository,
  TokenVerifier,
} from '../src/application/ports'
import type { NoteRecord } from '../src/domain/note'
import { buildServer } from '../src/infrastructure/http/server'
import { ANA, InMemoryProfiles, JORGE } from './fakes'

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
}))

/** Owner-scoped, like RLS: a caller only ever lists their own notes. */
const notes: NoteRepository = {
  listOwn: (identity) => Promise.resolve(identity.userId === JORGE.userId ? JORGE_NOTES : []),
}

/** Profile stub for read-only tests: reads answer, writes are never expected. */
const readOnly = (findOwn: ProfileRepository['findOwn']): ProfileRepository => ({
  findOwn,
  setTimezoneIfDefault: () => Promise.reject(new Error('unexpected write')),
})

function server(
  profiles: ProfileRepository = readOnly(() =>
    Promise.resolve({ timezone: 'America/Mexico_City' }),
  ),
  noteRepository: NoteRepository = notes,
) {
  return buildServer({
    verifier,
    getMe: makeGetMe(profiles),
    setTimezone: makeSetTimezone(profiles),
    getToday: makeGetToday({ clock, notes: noteRepository, profiles }),
    corsOrigins: ['https://app.example'],
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
    const res = await server(undefined, {
      listOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
    }).inject({
      method: 'GET',
      url: '/today',
      headers: { authorization: 'Bearer valid-token' },
    })
    expect(res.statusCode).toBe(500)
    expect(res.body).not.toContain('secret')
    expect(res.json()).toEqual({ error: 'internal_error' })
  })
})
