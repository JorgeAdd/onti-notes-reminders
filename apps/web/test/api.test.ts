import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  captureNote,
  fetchNote,
  fetchToday,
  markNoteDone,
  patchTimezone,
  post,
  request,
  searchNotes,
  snoozeNote,
  undoNoteDone,
  UnauthorizedError,
} from '../src/lib/api'

const ID = '11111111-1111-4111-8111-111111111111'
const body = {
  now: '2026-10-07T15:05:00.000Z',
  timezone: 'America/Mexico_City',
  window: { start: '2026-10-07T06:00:00.000Z', end: '2026-10-08T06:00:00.000Z' },
  openCount: 1,
  anyDoneToday: false,
  otherCount: 11,
  date: '2026-10-07',
  isToday: true,
  tag: null,
  tags: [{ slug: 'client-a', name: 'Client A' }],
  hiddenCount: 0,
  others: [],
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

describe('fetchToday · view', () => {
  it.each([
    ['no view', undefined, 'http://localhost:3000/today'],
    ['today', { date: null, tag: null }, 'http://localhost:3000/today'],
    ['a day', { date: '2026-10-06', tag: null }, 'http://localhost:3000/today?date=2026-10-06'],
    ['a tag', { date: null, tag: 'client-b' }, 'http://localhost:3000/today?tag=client-b'],
    [
      'a day and a tag',
      { date: '2026-10-09', tag: 'client-b' },
      'http://localhost:3000/today?date=2026-10-09&tag=client-b',
    ],
  ])('requests %s', async (_label, view, expected) => {
    const fetchMock = respond(200, body)
    await fetchToday('token-1', view)
    expect((fetchMock.mock.calls[0]![0] as URL).href).toBe(expected)
  })

  it('a 400 is an ApiError the caller can tell from a 5xx', async () => {
    respond(400, { error: 'validation_error' })
    await expect(fetchToday('token-1', { date: null, tag: 'nope' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
    })
  })
})

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

describe('request', () => {
  it('sends no Content-Type when there is no body (Fastify rejects an empty JSON body)', async () => {
    const fetchMock = respond(200, {})
    await request('POST', '/notes/x/done', 'token-1')

    const [, init] = fetchMock.mock.calls[0]!
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({ Authorization: 'Bearer token-1' })
    expect(init?.body).toBeUndefined()
  })

  it('sends the JSON body with its Content-Type when there is one', async () => {
    const fetchMock = respond(200, {})
    await request('PATCH', '/me', 'token-1', { timezone: 'America/Mexico_City' })

    const [, init] = fetchMock.mock.calls[0]!
    expect(init?.headers).toEqual({
      Authorization: 'Bearer token-1',
      'Content-Type': 'application/json',
    })
    expect(init?.body).toBe('{"timezone":"America/Mexico_City"}')
  })

  it('turns 401 into UnauthorizedError and other failures into ApiError with the status', async () => {
    respond(401)
    expect(await request('PATCH', '/me', 't', {}).catch((e: unknown) => e)).toBeInstanceOf(
      UnauthorizedError,
    )

    respond(409, { error: 'conflict' })
    const error = await request('POST', '/notes/x/snooze', 't', {}).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).not.toBeInstanceOf(UnauthorizedError)
    expect((error as ApiError).status).toBe(409)
  })
})

describe('patchTimezone', () => {
  it('calls PATCH /me and returns the stored zone', async () => {
    const fetchMock = respond(200, { timezone: 'America/New_York' })
    const stored = await patchTimezone('token-1', 'America/Mexico_City')

    const [url, init] = fetchMock.mock.calls[0]!
    expect((url as URL).href).toBe('http://localhost:3000/me')
    expect(init?.method).toBe('PATCH')
    expect(init?.body).toBe('{"timezone":"America/Mexico_City"}')
    expect(stored).toBe('America/New_York')
  })

  it('rejects a body that is not {timezone}', async () => {
    respond(200, { timezone: 7 })
    await expect(patchTimezone('t', 'UTC')).rejects.toThrow()
  })
})

describe('post and the reminder calls (Decision 10)', () => {
  const note = {
    id: ID,
    title: 'Standup',
    tags: [{ name: 'Client A', slug: 'client-a' }],
    dueAt: '2026-10-07T16:05:00.000Z',
    originalDueAt: '2026-10-07T15:30:00.000Z',
    snoozeCount: 1,
    doneAt: null,
    createdAt: '2026-10-01T16:00:00.000Z',
  }

  it('post sends no Content-Type without a body', async () => {
    const fetchMock = respond(200, {})
    await post('/notes/x/done', 'token-1')

    const [, init] = fetchMock.mock.calls[0]!
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({ Authorization: 'Bearer token-1' })
    expect(init?.body).toBeUndefined()
  })

  it('post sends the JSON body with its Content-Type when there is one', async () => {
    const fetchMock = respond(200, {})
    await post('/notes/x/snooze', 'token-1', { preset: 'hour' })

    const [, init] = fetchMock.mock.calls[0]!
    expect(init?.headers).toEqual({
      Authorization: 'Bearer token-1',
      'Content-Type': 'application/json',
    })
    expect(init?.body).toBe('{"preset":"hour"}')
  })

  it('snoozeNote posts the preset and decodes the note', async () => {
    const fetchMock = respond(200, note)
    const result = await snoozeNote('token-1', ID, 'hour')

    const [url, init] = fetchMock.mock.calls[0]!
    expect((url as URL).href).toBe(`http://localhost:3000/notes/${ID}/snooze`)
    expect(init?.body).toBe('{"preset":"hour"}')
    expect(result.dueAt).toBeInstanceOf(Date)
    expect(result.snoozeCount).toBe(1)
  })

  it.each([
    ['done', markNoteDone],
    ['undo', undoNoteDone],
  ])('%s posts with no body', async (action, call) => {
    const fetchMock = respond(200, note)
    await call('token-1', ID)

    const [url, init] = fetchMock.mock.calls[0]!
    expect((url as URL).href).toBe(`http://localhost:3000/notes/${ID}/${action}`)
    expect(init?.body).toBeUndefined()
  })

  it('rejects a note that does not match the shared schema', async () => {
    respond(200, { ...note, snoozeCount: 'twice' })
    await expect(snoozeNote('t', ID, 'hour')).rejects.toThrow()
  })
})

describe('captureNote (R11)', () => {
  const saved = {
    id: ID,
    title: 'Call back',
    tags: [{ name: 'Client A', slug: 'client-a' }],
    dueAt: '2026-10-06T23:00:00.000Z',
    originalDueAt: '2026-10-06T23:00:00.000Z',
    snoozeCount: 0,
    doneAt: null,
    createdAt: '2026-10-06T22:00:00.000Z',
  }

  it('POSTs the structured payload with slugs and an ISO instant, and decodes the note', async () => {
    const fetchMock = respond(201, saved)

    const note = await captureNote('token-1', {
      title: 'Call back',
      tags: ['client-a'],
      dueAt: new Date('2026-10-06T23:00:00.000Z'),
    })

    const [url, init] = fetchMock.mock.calls[0]!
    expect((url as URL).href).toBe('http://localhost:3000/notes')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual({
      title: 'Call back',
      tags: ['client-a'],
      dueAt: '2026-10-06T23:00:00.000Z',
    })
    expect(note.dueAt).toBeInstanceOf(Date)
    expect(note.tags).toEqual([{ name: 'Client A', slug: 'client-a' }])
  })

  it('sends null for a plain note and surfaces a 400 as ApiError', async () => {
    const fetchMock = respond(201, { ...saved, dueAt: null, originalDueAt: null })
    const note = await captureNote('t', { title: 'Call back', tags: [], dueAt: null })
    expect(JSON.parse(fetchMock.mock.calls[0]![1]?.body as string)).toMatchObject({ dueAt: null })
    expect(note.dueAt).toBeNull()

    respond(400)
    await expect(captureNote('t', { title: 'x', tags: [], dueAt: null })).rejects.toMatchObject({
      status: 400,
    })
  })
})

describe('searchNotes', () => {
  const list = {
    now: '2026-10-07T15:05:00.000Z',
    timezone: 'America/Mexico_City',
    total: 15,
    notes: [
      {
        id: ID,
        title: 'Staging URL',
        tags: [],
        dueAt: null,
        doneAt: '2026-10-06T23:00:00.000Z',
        excerpt: 'Body',
      },
    ],
  }

  it('calls GET /notes with no query for an empty term and decodes instants', async () => {
    const fetchMock = respond(200, list)
    const result = await searchNotes('token-1', '')

    const [url, init] = fetchMock.mock.calls[0]!
    expect((url as URL).href).toBe('http://localhost:3000/notes')
    expect(init?.headers).toEqual({ Authorization: 'Bearer token-1' })
    expect(result.total).toBe(15)
    expect(result.notes[0]!.doneAt).toBeInstanceOf(Date)
  })

  it('percent-encodes the term (spaces, &, #, quotes and non-ASCII stay one value)', async () => {
    const fetchMock = respond(200, list)
    await searchNotes('token-1', `a b&c=d#e "é"`)

    const [url] = fetchMock.mock.calls[0]!
    const { searchParams } = url as URL
    expect([...searchParams.keys()]).toEqual(['q'])
    expect(searchParams.get('q')).toBe(`a b&c=d#e "é"`)
    expect((url as URL).href).not.toContain(' ')
  })

  it('adds the tag as its own parameter, after q, and only when there is one', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(list))))
    await searchNotes('token-1', 'stag', 'client-b')
    await searchNotes('token-1', '', 'client-b')
    await searchNotes('token-1', '', null)
    const urls = fetchMock.mock.calls.map(([url]) => (url as URL).search)
    expect(urls).toEqual(['?q=stag&tag=client-b', '?tag=client-b', ''])
  })

  it('turns a 401 into UnauthorizedError and keeps other failures generic', async () => {
    respond(401)
    await expect(searchNotes('expired', 'x')).rejects.toBeInstanceOf(UnauthorizedError)
    respond(500)
    const error = await searchNotes('t', 'x').catch((e: unknown) => e)
    expect(error).not.toBeInstanceOf(UnauthorizedError)
    expect((error as Error).message).toContain('500')
  })

  it('rejects a body that breaks the shared schema (a 51st note, a long excerpt)', async () => {
    respond(200, { ...list, notes: [{ ...list.notes[0]!, excerpt: 'x'.repeat(121) }] })
    await expect(searchNotes('t', '')).rejects.toThrow()
  })
})

describe('fetchNote (C11)', () => {
  const detail = {
    now: '2026-10-07T15:05:00.000Z',
    timezone: 'America/Mexico_City',
    note: {
      id: ID,
      title: 'Ask Luis',
      tags: [{ name: 'Client A', slug: 'client-a' }],
      dueAt: '2026-10-07T23:00:00.000Z',
      originalDueAt: '2026-10-07T23:00:00.000Z',
      snoozeCount: 0,
      doneAt: null,
      createdAt: '2026-10-01T16:00:00.000Z',
      body: 'Ana needs **admin** access',
    },
  }

  it('calls GET /notes/:id with the bearer token and decodes the body and the instants', async () => {
    const fetchMock = respond(200, detail)
    const result = await fetchNote('token-1', ID)

    const [url, init] = fetchMock.mock.calls[0]!
    expect((url as URL).href).toBe(`http://localhost:3000/notes/${ID}`)
    expect(init?.method).toBe('GET')
    expect(init?.headers).toEqual({ Authorization: 'Bearer token-1' })
    expect(result.note.body).toBe('Ana needs **admin** access')
    expect(result.note.createdAt).toEqual(new Date('2026-10-01T16:00:00.000Z'))
    expect(result.now).toBeInstanceOf(Date)
    expect(result.timezone).toBe('America/Mexico_City')
  })

  it('maps 404 to ApiError and 401 to UnauthorizedError', async () => {
    respond(404)
    await expect(fetchNote('t', ID)).rejects.toMatchObject({ status: 404 })
    respond(401)
    await expect(fetchNote('t', ID)).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('rejects an answer without the creation time (a stale API)', async () => {
    respond(200, { ...detail, note: { ...detail.note, createdAt: undefined } })
    await expect(fetchNote('t', ID)).rejects.toThrow()
  })
})
