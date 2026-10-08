import { afterEach, expect, it, vi } from 'vitest'
import { fetchToday, UnauthorizedError } from '../src/lib/api'

const ID = '11111111-1111-4111-8111-111111111111'
const body = {
  now: '2026-10-07T15:05:00.000Z',
  timezone: 'America/Mexico_City',
  window: { start: '2026-10-07T06:00:00.000Z', end: '2026-10-08T06:00:00.000Z' },
  openCount: 1,
  anyDoneToday: false,
  otherCount: 11,
  carried: [],
  rail: [
    {
      id: ID,
      title: 'Standup',
      tags: [{ name: 'Client A', slug: 'client-a' }],
      dueAt: '2026-10-07T15:30:00.000Z',
      originalDueAt: '2026-10-07T15:30:00.000Z',
      snoozeCount: 0,
      doneAt: null,
    },
  ],
}

const respond = (status: number, json: unknown = {}) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(json), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

afterEach(() => vi.restoreAllMocks())

it('calls GET /today with the bearer token and decodes instants to Date', async () => {
  const fetchMock = respond(200, body)
  const today = await fetchToday('token-1')

  const [url, init] = fetchMock.mock.calls[0]!
  expect((url as URL).href).toBe('http://localhost:3000/today')
  expect(init?.headers).toEqual({ Authorization: 'Bearer token-1' })
  expect(today.now).toBeInstanceOf(Date)
  expect(today.now.toISOString()).toBe(body.now)
  expect(today.rail[0]!.dueAt).toBeInstanceOf(Date)
  expect(today.otherCount).toBe(11)
})

it('turns a 401 into a typed UnauthorizedError (Decision 12)', async () => {
  respond(401)
  const error = await fetchToday('expired').catch((e: unknown) => e)
  expect(error).toBeInstanceOf(UnauthorizedError)
})

it.each([403, 404, 500, 503])(
  'keeps %d a generic Error, not the session-expired signal',
  async (status) => {
    respond(status)
    const error = await fetchToday('t').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(UnauthorizedError)
    expect((error as Error).message).toContain(String(status))
  },
)

it('rejects a body that does not match the shared schema', async () => {
  respond(200, { ...body, openCount: 'many' })
  await expect(fetchToday('t')).rejects.toThrow()
})
