import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { NoteResponse, TodayItem, TodayResponse } from '@onti/shared'
import { at } from '@onti/shared/fixtures/jorge-week'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  useReminderActions,
  type ReminderApi,
} from '../src/features/today/mutations/use-reminder-actions'
import { ApiError, UnauthorizedError } from '../src/lib/api'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

const NOW = at('2026-10-07 09:05')

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const itemNamed = (today: TodayResponse, start: string): TodayItem => {
  const found = [...today.carried.flatMap((g) => g.items), ...today.rail].find((i) =>
    i.title.startsWith(start),
  )
  if (!found) throw new Error(`No item ${start}`)
  return found
}

const toNote = (item: TodayItem, patch: Partial<NoteResponse> = {}): NoteResponse => ({
  ...item,
  ...patch,
})

function setup(api: Partial<ReminderApi>, load: () => Promise<TodayResponse>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onSessionExpired = vi.fn()
  const fullApi: ReminderApi = {
    snooze: vi.fn(() => Promise.reject(new Error('unexpected snooze'))),
    done: vi.fn(() => Promise.reject(new Error('unexpected done'))),
    undo: vi.fn(() => Promise.reject(new Error('unexpected undo'))),
    ...api,
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const view = renderHook(
    () => ({
      today: useQuery({ queryKey: ['today'], queryFn: load }).data,
      ...useReminderActions({ api: fullApi, now: NOW, onSessionExpired }),
    }),
    { wrapper },
  )
  return { ...view, onSessionExpired, api: fullApi }
}

const standup = (today: TodayResponse | undefined) => itemNamed(today!, 'Standup')
const send = (today: TodayResponse | undefined) => itemNamed(today!, 'Send rate-limit')

describe('optimistic write', () => {
  it('done: marks the item at once, keeps the server note and refetches once', async () => {
    const truth = c4Response()
    const serverDoneAt = at('2026-10-07 09:06')
    const request = deferred<NoteResponse>()
    const load = vi.fn(() => Promise.resolve(truth))
    const { result, api } = setup({ done: vi.fn(() => request.promise) }, load)
    await waitFor(() => expect(result.current.today).toBeDefined())

    act(() => result.current.done(standup(result.current.today).id))

    await waitFor(() => expect(standup(result.current.today).doneAt).toEqual(NOW))
    expect(api.done).toHaveBeenCalledWith(standup(truth).id)
    expect(result.current.today!.openCount).toBe(truth.openCount - 1)

    // The refetch is held back so the cache shows what onSuccess wrote.
    load.mockImplementationOnce(() => new Promise(() => undefined))
    await act(() =>
      Promise.resolve(request.resolve(toNote(standup(truth), { doneAt: serverDoneAt }))),
    )
    await waitFor(() => expect(standup(result.current.today).doneAt).toEqual(serverDoneAt))
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
  })

  it('snooze +1 h: moves the item to now + 1 h, count 1, and sends the preset', async () => {
    const truth = c4Response()
    const request = deferred<NoteResponse>()
    const load = vi.fn(() => Promise.resolve(truth))
    const { result, api } = setup({ snooze: vi.fn(() => request.promise) }, load)
    await waitFor(() => expect(result.current.today).toBeDefined())

    act(() => result.current.snooze(send(result.current.today).id, 'hour'))

    await waitFor(() =>
      expect(send(result.current.today)).toMatchObject({
        dueAt: at('2026-10-07 10:05'),
        snoozeCount: 1,
      }),
    )
    expect(api.snooze).toHaveBeenCalledWith(send(truth).id, 'hour')
  })

  it('undo: reopens a done item', async () => {
    const truth = c4Response()
    truth.rail = truth.rail.map((i) => (i.title.startsWith('Standup') ? { ...i, doneAt: NOW } : i))
    const request = deferred<NoteResponse>()
    const { result } = setup({ undo: vi.fn(() => request.promise) }, () => Promise.resolve(truth))
    await waitFor(() => expect(result.current.today).toBeDefined())

    act(() => result.current.undo(standup(result.current.today).id))

    await waitFor(() => expect(standup(result.current.today).doneAt).toBeNull())
  })
})

describe('failure: rollback, one line, refetch (Decision 11)', () => {
  it.each([
    ['500', new ApiError(500, 'POST x'), (t: string) => messages.errors.actionFailed('done', t)],
    ['409', new ApiError(409, 'POST x'), (t: string) => messages.errors.actionConflict(t)],
    ['404', new ApiError(404, 'POST x'), (t: string) => messages.errors.actionMissing(t)],
    [
      'a network error',
      new TypeError('fetch failed'),
      (t: string) => messages.errors.actionFailed('done', t),
    ],
  ])('%s restores the page, says so, and refetches', async (_label, failure, expected) => {
    const truth = c4Response()
    const request = deferred<NoteResponse>()
    const load = vi.fn(() => Promise.resolve(truth))
    const { result, onSessionExpired } = setup({ done: vi.fn(() => request.promise) }, load)
    await waitFor(() => expect(result.current.today).toBeDefined())

    act(() => result.current.done(standup(result.current.today).id))
    await waitFor(() => expect(standup(result.current.today).doneAt).not.toBeNull())
    // Hold the refetch back: the restored page must come from the rollback itself.
    load.mockImplementationOnce(() => new Promise(() => undefined))
    await act(() => Promise.resolve(request.reject(failure)))

    await waitFor(() => expect(result.current.message).toBe(expected(standup(truth).title)))
    expect(standup(result.current.today).doneAt).toBeNull()
    expect(result.current.today!.openCount).toBe(truth.openCount)
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
    expect(onSessionExpired).not.toHaveBeenCalled()
  })

  it('never retries a failed write (snooze is not idempotent)', async () => {
    const snooze = vi.fn(() => Promise.reject(new ApiError(500, 'POST x')))
    const { result } = setup({ snooze }, () => Promise.resolve(c4Response()))
    await waitFor(() => expect(result.current.today).toBeDefined())

    act(() => result.current.snooze(send(result.current.today).id, 'hour'))
    await waitFor(() => expect(result.current.message).not.toBeNull())
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(snooze).toHaveBeenCalledTimes(1)
  })

  it('dismiss clears the line', async () => {
    const { result } = setup(
      { done: vi.fn(() => Promise.reject(new ApiError(500, 'POST x'))) },
      () => Promise.resolve(c4Response()),
    )
    await waitFor(() => expect(result.current.today).toBeDefined())
    act(() => result.current.done(standup(result.current.today).id))
    await waitFor(() => expect(result.current.message).not.toBeNull())

    act(() => result.current.dismiss())

    expect(result.current.message).toBeNull()
  })
})

describe('two queued writes (design flagged TanStack scope ordering as unverified)', () => {
  it('runs them one at a time, in order', async () => {
    const first = deferred<NoteResponse>()
    const truth = c4Response()
    const { result, api } = setup(
      {
        done: vi.fn(() => first.promise),
        snooze: vi.fn(() => Promise.resolve(toNote(send(truth)))),
      },
      () => Promise.resolve(truth),
    )
    await waitFor(() => expect(result.current.today).toBeDefined())

    act(() => {
      result.current.done(standup(truth).id)
      result.current.snooze(send(truth).id, 'hour')
    })
    await waitFor(() => expect(api.done).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(api.snooze).not.toHaveBeenCalled()

    await act(() => Promise.resolve(first.resolve(toNote(standup(truth), { doneAt: NOW }))))
    await waitFor(() => expect(api.snooze).toHaveBeenCalledTimes(1))
  })

  it('refetches once, after the last write settles, not after the first', async () => {
    const first = deferred<NoteResponse>()
    const second = deferred<NoteResponse>()
    const truth = c4Response()
    const load = vi.fn(() => Promise.resolve(truth))
    const { result } = setup(
      { done: vi.fn(() => first.promise), snooze: vi.fn(() => second.promise) },
      load,
    )
    await waitFor(() => expect(result.current.today).toBeDefined())
    act(() => {
      result.current.done(standup(truth).id)
      result.current.snooze(send(truth).id, 'hour')
    })

    await act(() => Promise.resolve(first.resolve(toNote(standup(truth), { doneAt: NOW }))))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(load).toHaveBeenCalledTimes(1)

    await act(() => Promise.resolve(second.resolve(toNote(send(truth), { snoozeCount: 1 }))))
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
  })

  it('converges on the server page when the first fails and the second succeeds', async () => {
    const truth = c4Response()
    const serverAfter: TodayResponse = {
      ...truth,
      rail: truth.rail.map((i) =>
        i.title.startsWith('Send rate-limit')
          ? { ...i, dueAt: at('2026-10-07 10:05'), snoozeCount: 1 }
          : i,
      ),
    }
    serverAfter.rail.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    const first = deferred<NoteResponse>()
    const second = deferred<NoteResponse>()
    const load = vi
      .fn<() => Promise<TodayResponse>>()
      .mockResolvedValueOnce(truth)
      .mockResolvedValue(serverAfter)
    const { result } = setup(
      { done: vi.fn(() => first.promise), snooze: vi.fn(() => second.promise) },
      load,
    )
    await waitFor(() => expect(result.current.today).toBeDefined())

    act(() => {
      result.current.done(standup(truth).id)
      result.current.snooze(send(truth).id, 'hour')
    })
    await waitFor(() => expect(standup(result.current.today).doneAt).not.toBeNull())

    await act(() => Promise.resolve(first.reject(new ApiError(500, 'POST x'))))
    await act(() =>
      Promise.resolve(
        second.resolve(toNote(send(truth), { dueAt: at('2026-10-07 10:05'), snoozeCount: 1 })),
      ),
    )

    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.today).toEqual(serverAfter))
    expect(standup(result.current.today).doneAt).toBeNull()
    expect(result.current.message).toBe(messages.errors.actionFailed('done', standup(truth).title))
  })

  it('converges when both fail (the second snapshot holds the first optimistic patch)', async () => {
    const truth = c4Response()
    const load = vi.fn(() => Promise.resolve(truth))
    const first = deferred<NoteResponse>()
    const second = deferred<NoteResponse>()
    const { result } = setup(
      { done: vi.fn(() => first.promise), snooze: vi.fn(() => second.promise) },
      load,
    )
    await waitFor(() => expect(result.current.today).toBeDefined())
    act(() => {
      result.current.done(standup(truth).id)
      result.current.snooze(send(truth).id, 'hour')
    })

    await act(() => Promise.resolve(first.reject(new ApiError(500, 'POST x'))))
    await act(() => Promise.resolve(second.reject(new ApiError(500, 'POST x'))))

    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.today).toEqual(truth))
  })
})

describe('mutation 401 (Decision 10)', () => {
  it('ends the session once, after the rollback, with no error line', async () => {
    const truth = c4Response()
    const first = deferred<NoteResponse>()
    const second = deferred<NoteResponse>()
    const { result, onSessionExpired } = setup(
      { done: vi.fn(() => first.promise), snooze: vi.fn(() => second.promise) },
      () => Promise.resolve(truth),
    )
    await waitFor(() => expect(result.current.today).toBeDefined())
    act(() => {
      result.current.done(standup(truth).id)
      result.current.snooze(send(truth).id, 'hour')
    })

    await act(() => Promise.resolve(first.reject(new UnauthorizedError())))
    await act(() => Promise.resolve(second.reject(new UnauthorizedError())))

    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1))
    expect(result.current.message).toBeNull()
    expect(standup(result.current.today).doneAt).toBeNull()
  })
})
