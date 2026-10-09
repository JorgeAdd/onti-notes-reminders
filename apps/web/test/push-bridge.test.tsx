import type { TodayItem, TodayResponse } from '@onti/shared'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  fetchToday: vi.fn(),
  markNoteDone: vi.fn(),
  snoozeNote: vi.fn(),
}))
vi.mock('../src/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof Api>()),
  ...api,
}))

import type * as Api from '../src/lib/api'
import { PushBridge } from '../src/features/push/PushBridge'
import { UnauthorizedError } from '../src/lib/api'
import { createQueryClient } from '../src/lib/query-client'
import { c4Response } from './today-fixture'

const TOKEN = 'jwt-1'

const items = (today: TodayResponse): TodayItem[] => [
  ...today.carried.flatMap((group) => group.items),
  ...today.rail,
]
const today = c4Response()
const open = items(today).find((item) => item.doneAt === null)!
const DUE = open.dueAt.getTime()

const sw = new EventTarget()
const message = (data: unknown) => sw.dispatchEvent(new MessageEvent('message', { data }))
const url = (action: string, note: string, due: string | number) =>
  history.pushState(null, '', `/?action=${action}&note=${note}&due=${due}`)

let queryClient = createQueryClient()
const onSessionExpired = vi.fn()
const mount = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <PushBridge accessToken={TOKEN} onSessionExpired={onSessionExpired} />
    </QueryClientProvider>,
  )

let searchAtFetch: string | null = null
beforeEach(() => {
  queryClient = createQueryClient()
  searchAtFetch = null
  api.fetchToday.mockReset().mockImplementation(() => {
    searchAtFetch = location.search
    return Promise.resolve(today)
  })
  api.markNoteDone.mockReset().mockResolvedValue({})
  api.snoozeNote.mockReset().mockResolvedValue({})
  onSessionExpired.mockReset()
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: sw })
})
afterEach(() => {
  history.replaceState(null, '', '/')
  Reflect.deleteProperty(navigator, 'serviceWorker')
  vi.restoreAllMocks()
})

describe('the URL action (ADR-004 decision 5)', () => {
  it('clears the URL before anything else, then runs Done when Today still shows the note open with that due_at', async () => {
    url('done', open.id, DUE)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    mount()
    await waitFor(() => expect(api.markNoteDone).toHaveBeenCalledWith(TOKEN, open.id))
    expect(searchAtFetch).toBe('')
    expect(location.search).toBe('')
    expect(api.snoozeNote).not.toHaveBeenCalled()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['day'] })
  })

  it('runs +1 h through the JWT snooze path', async () => {
    url('snooze', open.id, DUE)
    mount()
    await waitFor(() => expect(api.snoozeNote).toHaveBeenCalledWith(TOKEN, open.id, 'hour'))
    expect(api.markNoteDone).not.toHaveBeenCalled()
  })

  it('changes nothing when due_at changed (a replayed tap, C15): Today just shows', async () => {
    url('snooze', open.id, DUE + 3_600_000)
    mount()
    await waitFor(() => expect(api.fetchToday).toHaveBeenCalled())
    await Promise.resolve()
    expect(api.snoozeNote).not.toHaveBeenCalled()
    expect(location.search).toBe('')
  })

  it('changes nothing for a done note, an unknown note, or a note not on Today', async () => {
    const done = {
      ...today,
      rail: today.rail.map((i) => (i.id === open.id ? { ...i, doneAt: new Date(0) } : i)),
      carried: today.carried.map((g) => ({
        ...g,
        items: g.items.map((i) => (i.id === open.id ? { ...i, doneAt: new Date(0) } : i)),
      })),
    }
    api.fetchToday.mockResolvedValue(done)
    url('done', open.id, DUE)
    const first = mount()
    await waitFor(() => expect(api.fetchToday).toHaveBeenCalled())
    first.unmount()
    api.fetchToday.mockResolvedValue(today)
    queryClient.clear()
    url('done', '00000000-0000-4000-8000-0000000000ff', DUE)
    mount()
    await waitFor(() => expect(api.fetchToday).toHaveBeenCalledTimes(2))
    await Promise.resolve()
    expect(api.markNoteDone).not.toHaveBeenCalled()
  })

  it('ignores an unknown action, a bad due and missing params without calling the API', async () => {
    for (const [action, due] of [
      ['delete', DUE],
      ['done', 'soon'],
      ['done', '12.5'],
    ] as const) {
      url(action, open.id, due)
      const view = mount()
      await Promise.resolve()
      expect(location.search).toBe('')
      view.unmount()
    }
    mount()
    await Promise.resolve()
    expect(api.fetchToday).not.toHaveBeenCalled()
    expect(api.markNoteDone).not.toHaveBeenCalled()
    expect(api.snoozeNote).not.toHaveBeenCalled()
  })

  it('does nothing when Today cannot be loaded, and ends the session on a 401', async () => {
    api.fetchToday.mockRejectedValue(new Error('offline'))
    url('done', open.id, DUE)
    const first = mount()
    await waitFor(() => expect(api.fetchToday).toHaveBeenCalled())
    first.unmount()
    expect(api.markNoteDone).not.toHaveBeenCalled()
    expect(onSessionExpired).not.toHaveBeenCalled()

    queryClient.clear()
    api.fetchToday.mockResolvedValue(today)
    api.markNoteDone.mockRejectedValue(new UnauthorizedError())
    url('done', open.id, DUE)
    mount()
    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1))
  })
})

describe('worker messages', () => {
  it('onti:action runs the same guarded action', async () => {
    mount()
    message({ type: 'onti:action', action: 'done', noteId: open.id, dueAt: DUE })
    await waitFor(() => expect(api.markNoteDone).toHaveBeenCalledWith(TOKEN, open.id))
  })

  it('onti:action with a stale due_at changes nothing', async () => {
    mount()
    message({ type: 'onti:action', action: 'snooze', noteId: open.id, dueAt: DUE - 60_000 })
    await waitFor(() => expect(api.fetchToday).toHaveBeenCalled())
    await Promise.resolve()
    expect(api.snoozeNote).not.toHaveBeenCalled()
  })

  it('onti:refetch invalidates the day queries', () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    mount()
    message({ type: 'onti:refetch' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['day'] })
  })

  it('ignores other messages, and stops listening after unmount', () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const view = mount()
    message({ type: 'something-else' })
    message('text')
    message(null)
    expect(invalidate).not.toHaveBeenCalled()
    view.unmount()
    message({ type: 'onti:refetch' })
    expect(invalidate).not.toHaveBeenCalled()
  })
})

it('renders nothing', () => {
  expect(mount().container).toBeEmptyDOMElement()
})

describe('App wiring [static]', () => {
  const app = readFileSync('src/App.tsx', 'utf8')

  it('renders the bridge only after the signed-out card is handled, with the session token', () => {
    expect(app).toMatch(/<PushBridge\s+accessToken=\{session\.access_token\}/)
    expect(app.indexOf('<PushBridge')).toBeGreaterThan(app.indexOf('<AuthContainer'))
  })
})
