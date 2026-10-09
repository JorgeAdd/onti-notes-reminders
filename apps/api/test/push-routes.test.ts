import type { ActionClaims } from '@onti/shared'
import { at } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it, vi } from 'vitest'
import { UnauthorizedError } from '../src/application/errors'
import { makeGetMe } from '../src/application/get-me'
import { makeGetToday } from '../src/application/get-today'
import { makeCaptureNote } from '../src/application/capture-note'
import { makeMarkDone } from '../src/application/mark-done'
import type { TokenVerifier } from '../src/application/ports'
import { makePushActions } from '../src/application/push-actions'
import { makeSubscriptionActions } from '../src/application/push-subscribe'
import { makeGetNote } from '../src/application/get-note'
import { makeSearchNotes } from '../src/application/search-notes'
import { makeSetTimezone } from '../src/application/set-timezone'
import { makeSnoozeNote } from '../src/application/snooze-note'
import { makeUndoDone } from '../src/application/undo-done'
import { buildServer } from '../src/infrastructure/http/server'
import { HmacActionTokens } from '../src/infrastructure/push/hmac-action-tokens'
import { ANA, InMemoryNotes, InMemoryProfiles, JORGE, noteId, noteRecord } from './fakes'
import { InMemorySubscriptions, MutableClock } from './push-fakes'
import { makeDeleteNote } from '../src/application/delete-note'
import { makeUpdateNote } from '../src/application/update-note'

const SECRET = 's'.repeat(32)
const ORIGIN = 'https://app.example'
const ENDPOINT = 'https://push.example.com/send/route-E'
const subscription = { endpoint: ENDPOINT, keys: { p256dh: 'p256-key', auth: 'auth-key' } }

const verifier: TokenVerifier = {
  verify(token) {
    if (token === 'valid-token') return Promise.resolve(JORGE)
    if (token === 'ana-token') return Promise.resolve(ANA)
    return Promise.reject(new UnauthorizedError())
  },
}

const DUE = at('2026-10-07 10:05')

/** Jorge's note 1 is open and due 10:05 (C15); the clock stands at 10:05. */
function harness(options: { withPush?: boolean } = {}) {
  const clock = new MutableClock(DUE)
  const notes = new InMemoryNotes([
    {
      ownerId: JORGE.userId,
      note: noteRecord(1, {
        dueAt: DUE,
        originalDueAt: at('2026-10-06 18:00'),
        snoozeCount: 1,
        notifiedDueAt: DUE,
      }),
    },
  ])
  const profiles = InMemoryProfiles.of({ [JORGE.userId]: 'America/Mexico_City' })
  const subscriptions = new InMemorySubscriptions()
  const tokens = new HmacActionTokens(SECRET)
  const mutate = vi.spyOn(notes, 'mutateReminder')
  const app = buildServer({
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
    corsOrigins: [ORIGIN],
    searchNotes: makeSearchNotes({ clock, notes, profiles }),
    getNote: makeGetNote({ clock, notes, profiles }),
    ...(options.withPush === false
      ? {}
      : {
          push: {
            tokens,
            clock,
            actions: makePushActions({ clock, notes }),
            subscriptions: makeSubscriptionActions({ subscriptions }),
          },
        }),
  })
  const claims = (overrides: Partial<ActionClaims> = {}): ActionClaims => ({
    v: 1,
    noteId: noteId(1),
    userId: JORGE.userId,
    dueAt: DUE.getTime(),
    actions: ['done', 'snooze'],
    exp: DUE.getTime() / 1000 + 86_400,
    ...overrides,
  })
  const act = (action: 'done' | 'snooze', payload?: unknown) =>
    app.inject({ method: 'POST', url: `/push-actions/${action}`, payload: payload as object })
  const actWith = (action: 'done' | 'snooze', overrides: Partial<ActionClaims> = {}) =>
    act(action, { token: tokens.sign(claims(overrides)) })
  return { app, clock, notes, mutate, subscriptions, tokens, claims, act, actWith }
}

const bearer = (token: string) => ({ authorization: `Bearer ${token}` })

describe('POST /push-subscriptions', () => {
  it('stores the row for the JWT subject with the user agent header', async () => {
    const { app, subscriptions } = harness()
    const res = await app.inject({
      method: 'POST',
      url: '/push-subscriptions',
      headers: { ...bearer('valid-token'), 'user-agent': 'Firefox/130' },
      payload: subscription,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    expect(subscriptions.row(ENDPOINT)).toMatchObject({
      userId: JORGE.userId,
      p256dh: 'p256-key',
      userAgent: 'Firefox/130',
    })
  })

  it.each([
    ['no keys.auth', { ...subscription, keys: { p256dh: 'p256-key' } }],
    ['an http endpoint', { ...subscription, endpoint: 'http://push.example.com/x' }],
    ['an IP-literal host', { ...subscription, endpoint: 'https://203.0.113.9/x' }],
  ])('returns 400 for %s', async (_label, payload) => {
    const { app, subscriptions } = harness()
    const res = await app.inject({
      method: 'POST',
      url: '/push-subscriptions',
      headers: bearer('valid-token'),
      payload,
    })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'validation_error' })
    expect(subscriptions.all()).toEqual([])
  })

  it.each([
    ['no token', {}],
    ['a forged token', bearer('forged')],
  ])('returns 401 with %s, even for an invalid body', async (_label, headers) => {
    const { app, subscriptions } = harness()
    for (const payload of [subscription, {}]) {
      const res = await app.inject({ method: 'POST', url: '/push-subscriptions', headers, payload })
      expect(res.statusCode).toBe(401)
      expect(res.json()).toEqual({ error: 'unauthorized' })
    }
    expect(subscriptions.all()).toEqual([])
  })

  it('answers a reassignment exactly like a first subscribe and leaves Ana none', async () => {
    const { app, subscriptions } = harness()
    const post = (token: string) =>
      app.inject({
        method: 'POST',
        url: '/push-subscriptions',
        headers: bearer(token),
        payload: subscription,
      })
    const first = await post('ana-token')
    const swapped = await post('valid-token')
    expect(swapped.statusCode).toBe(first.statusCode)
    expect(swapped.body).toBe(first.body)
    expect(subscriptions.forUser(ANA.userId)).toEqual([])
    expect(subscriptions.forUser(JORGE.userId)).toHaveLength(1)
  })
})

describe('DELETE /push-subscriptions', () => {
  const del = (app: ReturnType<typeof harness>['app'], token: string, payload: unknown) =>
    app.inject({
      method: 'DELETE',
      url: '/push-subscriptions',
      headers: bearer(token),
      payload: payload as object,
    })

  it('deletes only the caller row; another user is a no-op success with the same body', async () => {
    const { app, subscriptions } = harness()
    await subscriptions.subscribe(JORGE.userId, {
      endpoint: ENDPOINT,
      p256dh: 'a',
      auth: 'b',
      userAgent: null,
    })

    const foreign = await del(app, 'ana-token', { endpoint: ENDPOINT })
    expect(subscriptions.all()).toHaveLength(1)
    const own = await del(app, 'valid-token', { endpoint: ENDPOINT })

    expect([foreign.statusCode, own.statusCode]).toEqual([200, 200])
    expect(foreign.body).toBe(own.body)
    expect(subscriptions.all()).toEqual([])
  })

  it('returns 400 for a body without an https endpoint and 401 without a token', async () => {
    const { app } = harness()
    expect((await del(app, 'valid-token', { endpoint: 'ftp://x.example.com' })).statusCode).toBe(
      400,
    )
    const res = await app.inject({
      method: 'DELETE',
      url: '/push-subscriptions',
      payload: { endpoint: ENDPOINT },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /push-actions/*', () => {
  it('done runs with the token alone (no JWT) and stamps the clock (C3)', async () => {
    const { clock, notes, actWith } = harness()
    clock.set(at('2026-10-07 10:06'))
    const res = await actWith('done')
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    expect(notes.get(noteId(1))?.doneAt).toEqual(at('2026-10-07 10:06'))
  })

  it('snooze gives +1 h, count 2 and the original due (C15), then the replay is 409', async () => {
    const { notes, tokens, claims, act } = harness()
    const payload = { token: tokens.sign(claims()) }
    expect((await act('snooze', payload)).statusCode).toBe(200)
    const note = notes.get(noteId(1))!
    expect(note.dueAt).toEqual(at('2026-10-07 11:05'))
    expect(note.snoozeCount).toBe(2)
    expect(note.originalDueAt).toEqual(at('2026-10-06 18:00'))

    const replay = await act('snooze', payload)
    expect(replay.statusCode).toBe(409)
    expect(replay.json()).toEqual({ error: 'conflict', reason: 'due_at_changed' })
    expect(notes.get(noteId(1))).toBe(note)
  })

  it('done twice is a success both times and keeps the first done_at (R9)', async () => {
    const { clock, notes, tokens, claims, act } = harness()
    const payload = { token: tokens.sign(claims()) }
    await act('done', payload)
    clock.set(at('2026-10-07 10:30'))
    expect((await act('done', payload)).statusCode).toBe(200)
    expect(notes.get(noteId(1))?.doneAt).toEqual(DUE)
  })

  it('snooze on a done note is 409 not_open', async () => {
    const { tokens, claims, act } = harness()
    const payload = { token: tokens.sign(claims()) }
    await act('done', payload)
    const res = await act('snooze', payload)
    expect(res.statusCode).toBe(409)
    expect(res.json()).toEqual({ error: 'conflict', reason: 'not_open' })
  })

  it('answers 401 with one identical body for a missing body, malformed, forged and expired tokens, without touching the database', async () => {
    const { app, clock, tokens, claims, mutate, act } = harness()
    const valid = tokens.sign(claims())
    const [payload, signature] = valid.split('.')
    const forged = `${payload}.${signature!.slice(0, -2)}AA`
    const attempts = [
      await act('done'),
      await act('done', {}),
      await act('done', { token: 'not-a-token' }),
      await act('done', { token: forged }),
      await app.inject({
        method: 'POST',
        url: '/push-actions/done',
        headers: bearer('valid-token'),
        payload: {},
      }),
    ]
    clock.set(new Date((claims().exp + 1) * 1000))
    attempts.push(await act('snooze', { token: valid }))

    expect(attempts.map((r) => r.statusCode)).toEqual([401, 401, 401, 401, 401, 401])
    expect(new Set(attempts.map((r) => r.body))).toEqual(new Set(['{"error":"unauthorized"}']))
    expect(mutate).not.toHaveBeenCalled()
  })

  it('answers 404 with one identical body for a disallowed action, an unknown note and another user note, never 403', async () => {
    const { actWith, mutate } = harness()
    const disallowed = await actWith('snooze', { actions: ['done'] })
    expect(mutate).not.toHaveBeenCalled()
    const unknown = await actWith('done', { noteId: noteId(9) })
    const foreign = await actWith('done', { userId: ANA.userId })

    expect([disallowed, unknown, foreign].map((r) => r.statusCode)).toEqual([404, 404, 404])
    expect(new Set([disallowed, unknown, foreign].map((r) => r.body))).toEqual(
      new Set(['{"error":"not_found"}']),
    )
  })

  it('409 comes only from a changed due_at, never for an unknown note', async () => {
    const { actWith } = harness()
    const stale = await actWith('done', { dueAt: DUE.getTime() - 60_000 })
    expect(stale.statusCode).toBe(409)
    expect((await actWith('done', { noteId: noteId(9) })).statusCode).toBe(404)
  })

  it('allows the service worker preflight from the web origin', async () => {
    const { app } = harness()
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/push-actions/done',
      headers: {
        origin: ORIGIN,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    })
    expect(res.statusCode).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN)
    expect(String(res.headers['access-control-allow-methods'])).toContain('POST')
  })

  it('an action token as a bearer on a JWT route is 401', async () => {
    const { app, tokens, claims } = harness()
    const res = await app.inject({
      method: 'POST',
      url: `/notes/${noteId(1)}/done`,
      headers: bearer(tokens.sign(claims())),
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('without a push dependency', () => {
  it('registers none of the push routes', async () => {
    const { app } = harness({ withPush: false })
    const calls = [
      {
        method: 'POST',
        url: '/push-subscriptions',
        headers: bearer('valid-token'),
        payload: subscription,
      },
      {
        method: 'DELETE',
        url: '/push-subscriptions',
        headers: bearer('valid-token'),
        payload: { endpoint: ENDPOINT },
      },
      { method: 'POST', url: '/push-actions/done', payload: { token: 'x' } },
      { method: 'POST', url: '/push-actions/snooze', payload: { token: 'x' } },
    ] as const
    for (const call of calls) {
      expect((await app.inject(call)).statusCode).toBe(404)
    }
    expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200)
  })
})
