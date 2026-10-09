import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const SOURCE = readFileSync(join(__dirname, '..', 'public', 'sw.js'), 'utf8')
const NOTE = '0b7d6a2e-7c1f-4f0e-9a52-2d1f6a4b9c10'
const DUE = 1791360000000
const API = 'https://api.example.com'

interface FakeClient {
  focus: ReturnType<typeof vi.fn>
  postMessage: ReturnType<typeof vi.fn>
}

type Handler = (event: Record<string, unknown>) => void

/** Runs `public/sw.js` in a bare context whose `self` is a stub; nothing else is reachable. */
function load(options: { maxActions?: number | null; windows?: number; fetch?: unknown } = {}) {
  const handlers = new Map<string, Handler>()
  const windows: FakeClient[] = Array.from({ length: options.windows ?? 0 }, () => ({
    focus: vi.fn(() => Promise.resolve()),
    postMessage: vi.fn(),
  }))
  const registration = {
    showNotification: vi.fn((_title: string, _options?: Record<string, unknown>) =>
      Promise.resolve(),
    ),
  }
  const self = {
    addEventListener: (type: string, handler: Handler) => handlers.set(type, handler),
    registration,
    skipWaiting: vi.fn(() => Promise.resolve()),
    clients: {
      claim: vi.fn(() => Promise.resolve()),
      matchAll: vi.fn(() => Promise.resolve(windows)),
      openWindow: vi.fn(() => Promise.resolve(null)),
    },
  }
  const fetchStub = options.fetch ?? vi.fn(() => Promise.resolve({ ok: true, status: 200 }))
  const sandbox: Record<string, unknown> = { self, fetch: fetchStub, URL, JSON, Promise }
  if (options.maxActions !== null) {
    sandbox.Notification = { maxActions: options.maxActions ?? 2 }
  }
  vm.runInNewContext(SOURCE, sandbox)

  /** Dispatches an event and awaits whatever the worker passed to `waitUntil`. */
  async function fire(type: string, event: Record<string, unknown>) {
    const pending: Promise<unknown>[] = []
    const handler = handlers.get(type)
    if (!handler) throw new Error(`no ${type} handler`)
    handler({ ...event, waitUntil: (p: Promise<unknown>) => pending.push(p) })
    await Promise.all(pending)
  }
  return { self, windows, registration, fire, fetch: fetchStub as ReturnType<typeof vi.fn> }
}

const payload = (extra: Record<string, unknown> = {}) => ({
  v: 1,
  title: '17:00 · Call the client',
  body: 'Bring the contract\nClient A',
  tag: NOTE,
  noteId: NOTE,
  dueAt: DUE,
  apiUrl: API,
  token: 'signed.token',
  appName: 'Notes + Reminders',
  actions: [
    { action: 'done', title: 'Done' },
    { action: 'snooze', title: '+1 h' },
  ],
  ...extra,
})

const pushOf = (data: unknown) => ({
  data: { json: () => (data instanceof Error ? Promise.reject(data) : data) },
})

const click = (action: string, data: Record<string, unknown> = payload()) => {
  const close = vi.fn()
  return { action, notification: { close, data }, close }
}

describe('install and activate', () => {
  it('takes control at once so an update never waits for a closed tab', async () => {
    const sw = load()
    await sw.fire('install', {})
    expect(sw.self.skipWaiting).toHaveBeenCalledTimes(1)
    await sw.fire('activate', {})
    expect(sw.self.clients.claim).toHaveBeenCalledTimes(1)
  })
})

describe('push', () => {
  it('shows the title, body and tag, renotifies, and keeps what a click needs', async () => {
    const sw = load()
    await sw.fire('push', pushOf(payload()))
    expect(sw.registration.showNotification).toHaveBeenCalledTimes(1)
    const [title, options] = sw.registration.showNotification.mock.calls[0]!
    expect(title).toBe('17:00 · Call the client')
    expect(options).toMatchObject({
      body: 'Bring the contract\nClient A',
      tag: NOTE,
      renotify: true,
      data: { noteId: NOTE, dueAt: DUE, apiUrl: API, token: 'signed.token' },
    })
  })

  it('offers Done and +1 h when the browser supports action buttons', async () => {
    const sw = load({ maxActions: 2 })
    await sw.fire('push', pushOf(payload()))
    const options = sw.registration.showNotification.mock.calls[0]?.[1] as { actions: unknown }
    expect(options.actions).toEqual([
      { action: 'done', title: 'Done' },
      { action: 'snooze', title: '+1 h' },
    ])
  })

  it('cuts the buttons to maxActions, and sends none when it is 0 or unknown (Safari)', async () => {
    for (const [maxActions, expected] of [
      [1, 1],
      [0, 0],
      [null, 0],
    ] as const) {
      const sw = load({ maxActions })
      await sw.fire('push', pushOf(payload()))
      const options = sw.registration.showNotification.mock.calls[0]?.[1] as { actions?: unknown[] }
      expect(options.actions?.length ?? 0).toBe(expected)
    }
  })

  it('still shows a notification with the app name when the payload is unusable', async () => {
    const unusable = [
      { data: null },
      pushOf(new Error('not json')),
      pushOf({ v: 1 }),
      pushOf('text'),
      pushOf(null),
    ]
    for (const event of unusable) {
      const sw = load()
      await sw.fire('push', event)
      expect(sw.registration.showNotification).toHaveBeenCalledTimes(1)
      expect(sw.registration.showNotification.mock.calls[0]?.[0]).toBe('Notes + Reminders')
    }
  })
})

describe('notificationclick on an action button', () => {
  it('posts the token to the action route and tells open windows to refetch (Done)', async () => {
    const sw = load({ windows: 2 })
    const event = click('done')
    await sw.fire('notificationclick', event)
    expect(event.close).toHaveBeenCalled()
    expect(sw.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = sw.fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`${API}/push-actions/done`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ token: 'signed.token' })
    expect(init.headers).not.toHaveProperty('Authorization')
    for (const client of sw.windows) {
      expect(client.postMessage).toHaveBeenCalledWith({ type: 'onti:refetch' })
    }
    expect(sw.self.clients.openWindow).not.toHaveBeenCalled()
  })

  it('+1 h calls the snooze route', async () => {
    const sw = load({ windows: 1 })
    await sw.fire('notificationclick', click('snooze'))
    expect(sw.fetch.mock.calls[0]?.[0]).toBe(`${API}/push-actions/snooze`)
    expect(sw.windows[0]?.postMessage).toHaveBeenCalledWith({ type: 'onti:refetch' })
  })

  it('falls back to the app on a non-2xx answer: focus a window and send the action', async () => {
    for (const status of [401, 404, 409, 500]) {
      const sw = load({
        windows: 1,
        fetch: vi.fn(() => Promise.resolve({ ok: false, status })),
      })
      await sw.fire('notificationclick', click('snooze'))
      const client = sw.windows[0] as FakeClient
      expect(client.focus).toHaveBeenCalled()
      expect(client.postMessage).toHaveBeenCalledWith({
        type: 'onti:action',
        action: 'snooze',
        noteId: NOTE,
        dueAt: DUE,
      })
      expect(client.postMessage).not.toHaveBeenCalledWith({ type: 'onti:refetch' })
      expect(sw.self.clients.openWindow).not.toHaveBeenCalled()
    }
  })

  it('falls back when the call throws, opening the app with the guarded URL if no window exists', async () => {
    const sw = load({ fetch: vi.fn(() => Promise.reject(new Error('offline'))) })
    await sw.fire('notificationclick', click('done'))
    expect(sw.self.clients.openWindow).toHaveBeenCalledWith(`/?action=done&note=${NOTE}&due=${DUE}`)
  })

  it('falls back without calling the API when the token is missing', async () => {
    const sw = load()
    await sw.fire('notificationclick', click('done', payload({ token: undefined })))
    expect(sw.fetch).not.toHaveBeenCalled()
    expect(sw.self.clients.openWindow).toHaveBeenCalledWith(`/?action=done&note=${NOTE}&due=${DUE}`)
  })

  it('never calls an unknown action: it only opens the app', async () => {
    const sw = load()
    await sw.fire('notificationclick', click('delete'))
    expect(sw.fetch).not.toHaveBeenCalled()
    expect(sw.self.clients.openWindow).toHaveBeenCalledWith('/')
  })
})

describe('notificationclick on the body', () => {
  it('focuses an open window without calling the API', async () => {
    const sw = load({ windows: 1 })
    await sw.fire('notificationclick', click(''))
    expect(sw.windows[0]?.focus).toHaveBeenCalled()
    expect(sw.fetch).not.toHaveBeenCalled()
    expect(sw.self.clients.openWindow).not.toHaveBeenCalled()
  })

  it('opens Today when no window exists', async () => {
    const sw = load()
    await sw.fire('notificationclick', click(''))
    expect(sw.self.clients.openWindow).toHaveBeenCalledWith('/')
    expect(sw.fetch).not.toHaveBeenCalled()
  })
})
