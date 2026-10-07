import { meResponseSchema, type MeResponse } from '@onti/shared'
import { describe, expect, it } from 'vitest'
import { UnauthorizedError } from '../src/application/errors'
import { makeGetMe } from '../src/application/get-me'
import type { ProfileRepository, TokenVerifier } from '../src/application/ports'
import { buildServer } from '../src/infrastructure/http/server'

const JORGE = {
  userId: '7b0c5a2e-3f4d-4c1a-9e8b-2d6f0a1b3c4d',
  email: 'jorge@example.com',
  claims: {},
}

const verifier: TokenVerifier = {
  verify(token) {
    return token === 'valid-token'
      ? Promise.resolve(JORGE)
      : Promise.reject(new UnauthorizedError())
  },
}

function server(
  profiles: ProfileRepository = {
    findOwn: () => Promise.resolve({ timezone: 'America/Mexico_City' }),
  },
) {
  return buildServer({ verifier, getMe: makeGetMe(profiles), corsOrigins: ['https://app.example'] })
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
