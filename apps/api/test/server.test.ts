import { meResponseSchema, todayResponseSchema, type MeResponse } from '@onti/shared'
import { at, BEFORE_CAPTURE, N1 } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import { UnauthorizedError } from '../src/application/errors'
import { makeGetMe } from '../src/application/get-me'
import { makeGetToday } from '../src/application/get-today'
import type {
  Clock,
  NoteRepository,
  ProfileRepository,
  TokenVerifier,
} from '../src/application/ports'
import type { NoteRecord } from '../src/domain/note'
import { buildServer } from '../src/infrastructure/http/server'

const JORGE = {
  userId: '7b0c5a2e-3f4d-4c1a-9e8b-2d6f0a1b3c4d',
  email: 'jorge@example.com',
  claims: {},
}

const ANA = { userId: '1d2e3f40-5a6b-4c7d-8e9f-0a1b2c3d4e5f', email: 'ana@example.com', claims: {} }

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

function server(
  profiles: ProfileRepository = {
    findOwn: () => Promise.resolve({ timezone: 'America/Mexico_City' }),
  },
  noteRepository: NoteRepository = notes,
) {
  return buildServer({
    verifier,
    getMe: makeGetMe(profiles),
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
    const res = await server({ findOwn: () => Promise.resolve(null) }).inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: 'Bearer valid-token' },
    })
    expect(res.json<MeResponse>().timezone).toBe('UTC')
  })

  it('hides internal errors', async () => {
    const res = await server({
      findOwn: () => Promise.reject(new Error('connection refused: postgres://secret')),
    }).inject({
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
