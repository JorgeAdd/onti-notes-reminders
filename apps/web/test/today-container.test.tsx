import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { TodayResponse } from '@onti/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TodayContainer } from '../src/features/today/TodayContainer'
import type { DayView } from '../src/features/today/day-view'
import { ApiError, UnauthorizedError } from '../src/lib/api'
import { createQueryClient } from '../src/lib/query-client'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

afterEach(() => {
  vi.useRealTimers()
  window.history.replaceState(null, '', '/')
})

const noReminders = {
  snooze: () => Promise.reject(new Error('unexpected')),
  done: () => Promise.reject(new Error('unexpected')),
  undo: () => Promise.reject(new Error('unexpected')),
  capture: () => Promise.reject(new Error('unexpected')),
}

const noRetry = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

interface ContainerOptions {
  client?: QueryClient
  onSessionExpired?: () => void
  syncTimezone?: (timezone: string) => Promise<unknown>
  browserZone?: () => string
}

function renderContainer(
  load: (view: DayView) => Promise<TodayResponse>,
  {
    client = noRetry(),
    onSessionExpired = () => undefined,
    syncTimezone = () => Promise.resolve(),
    browserZone = () => 'America/Mexico_City',
  }: ContainerOptions = {},
) {
  return render(
    <QueryClientProvider client={client}>
      <TodayContainer
        load={load}
        onSessionExpired={onSessionExpired}
        onSignOut={() => undefined}
        syncTimezone={syncTimezone}
        reminders={noReminders}
        browserTimeZone={browserZone}
      />
    </QueryClientProvider>,
  )
}

it('shows a loading state, then the page', async () => {
  let release: (today: TodayResponse) => void = () => undefined
  renderContainer(() => new Promise<TodayResponse>((resolve) => (release = resolve)))
  // The status card waits about 400 ms before it appears (Slice 8).
  expect(await screen.findByRole('status')).toHaveTextContent(messages.today.loading)
  release(c4Response())
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('4 things today')
  expect(screen.queryByText(messages.today.loading)).not.toBeInTheDocument()
})

it('shows an error with retry on a 5xx, and retry loads the page', async () => {
  const load = vi
    .fn<() => Promise<TodayResponse>>()
    .mockRejectedValueOnce(new Error('GET /today failed with 500'))
    .mockResolvedValue(c4Response())
  renderContainer(load)

  expect(await screen.findByRole('alert')).toHaveTextContent(messages.today.loadError)
  fireEvent.click(screen.getByRole('button', { name: messages.today.retry }))

  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('4 things today')
  expect(load).toHaveBeenCalledTimes(2)
})

it('refetches when the window regains focus (production query client)', async () => {
  const load = vi.fn(() => Promise.resolve(c4Response()))
  renderContainer(load, { client: createQueryClient() })
  await screen.findByRole('heading', { level: 1 })

  act(() => void window.dispatchEvent(new Event('visibilitychange')))

  await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
})

it('control: with focus refetch off, regaining focus does not refetch', async () => {
  const load = vi.fn(() => Promise.resolve(c4Response()))
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  })
  renderContainer(load, { client })
  await screen.findByRole('heading', { level: 1 })

  act(() => void window.dispatchEvent(new Event('visibilitychange')))

  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(load).toHaveBeenCalledTimes(1)
})

describe('rollover (Decision 7): driven by the end of today, not of the viewed day', () => {
  const page = (date: string | undefined, now: Date): TodayResponse => ({
    ...c4Response(date),
    now,
  })

  it('today: refetches once the tick passes local midnight, not before', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-10-08T05:58:30.000Z')) // Wed 7 23:58:30 in Mexico City
    const load = vi.fn(() => Promise.resolve(page(undefined, new Date(Date.now()))))
    renderContainer(load)
    await screen.findByRole('heading', { level: 1 })

    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(load).toHaveBeenCalledTimes(1)

    await act(() => vi.advanceTimersByTimeAsync(60_000))
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
  })

  it('a past day: the minute ticks never refetch it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-10-07T15:05:30.000Z'))
    window.history.replaceState(null, '', '/?d=2026-10-06')
    const load = vi.fn(() => Promise.resolve(page('2026-10-06', new Date(Date.now()))))
    renderContainer(load)
    await screen.findByRole('heading', { level: 1 })

    await act(() => vi.advanceTimersByTimeAsync(3 * 60_000))

    expect(load).toHaveBeenCalledTimes(1)
  })

  it('tomorrow: one refetch at midnight, none before', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-10-08T05:58:30.000Z'))
    window.history.replaceState(null, '', '/?d=2026-10-08')
    const load = vi.fn(() => Promise.resolve(page('2026-10-08', new Date(Date.now()))))
    renderContainer(load)
    await screen.findByRole('heading', { level: 1 })

    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(load).toHaveBeenCalledTimes(1)

    await act(() => vi.advanceTimersByTimeAsync(60_000))
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
    await act(() => vi.advanceTimersByTimeAsync(3 * 60_000))
    expect(load).toHaveBeenCalledTimes(2)
  })
})

describe('the viewed day and tag come from the URL (Decision 8)', () => {
  const at = (search: string) => window.history.replaceState(null, '', `/${search}`)

  it('loads the view in the URL', async () => {
    at('?d=2026-10-06&tag=client-a')
    const load = vi.fn((view: DayView) =>
      Promise.resolve({ ...c4Response(view.date ?? undefined), tag: view.tag }),
    )
    renderContainer(load)
    await screen.findByRole('heading', { level: 1 })

    expect(load).toHaveBeenCalledWith({ date: '2026-10-06', tag: 'client-a' })
  })

  it('a malformed param is dropped before any request', async () => {
    at('?d=garbage&tag=Client%20B!')
    const load = vi.fn((_view: DayView) => Promise.resolve(c4Response()))
    renderContainer(load)
    await screen.findByRole('heading', { level: 1 })

    expect(load).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledWith({ date: null, tag: null })
  })

  it('popstate loads the new view and shows its page', async () => {
    const load = vi.fn((view: DayView) => Promise.resolve(c4Response(view.date ?? undefined)))
    renderContainer(load)
    await screen.findByRole('heading', { level: 1 })

    act(() => {
      window.history.pushState(null, '', '/?d=2026-10-06')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    await waitFor(() => expect(load).toHaveBeenLastCalledWith({ date: '2026-10-06', tag: null }))
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument())
  })

  it("a d that is today's date is dropped from the URL without a new history entry", async () => {
    at('?d=2026-10-07')
    const before = window.history.length
    renderContainer(() => Promise.resolve(c4Response()))
    await screen.findByRole('heading', { level: 1 })

    await waitFor(() => expect(window.location.search).toBe(''))
    expect(window.history.length).toBe(before)
  })

  it('a 400 for the viewed tag drops it, shows one line and loads the page again', async () => {
    at('?d=2026-10-06&tag=nope')
    const load = vi.fn((view: DayView) =>
      view.tag === 'nope'
        ? Promise.reject(new ApiError(400, 'GET /today'))
        : Promise.resolve(c4Response(view.date ?? undefined)),
    )
    renderContainer(load)

    expect(await screen.findByText(messages.errors.viewUnavailable)).toBeInTheDocument()
    expect(window.location.search).toBe('?d=2026-10-06')
    await waitFor(() => expect(load).toHaveBeenLastCalledWith({ date: '2026-10-06', tag: null }))
    expect(screen.getAllByText(messages.errors.viewUnavailable)).toHaveLength(1)
  })

  it('row actions are blocked while the viewed page loads; capture stays available', async () => {
    const done = vi.fn(() => Promise.reject(new Error('unexpected')))
    let release: (page: TodayResponse) => void = () => undefined
    const load = vi.fn((view: DayView) =>
      view.date === null
        ? Promise.resolve(c4Response())
        : new Promise<TodayResponse>((resolve) => (release = resolve)),
    )
    render(
      <QueryClientProvider client={noRetry()}>
        <TodayContainer
          load={load}
          onSessionExpired={() => undefined}
          onSignOut={() => undefined}
          syncTimezone={() => Promise.resolve()}
          reminders={{ ...noReminders, done }}
          browserTimeZone={() => 'America/Mexico_City'}
        />
      </QueryClientProvider>,
    )
    await screen.findByRole('heading', { level: 1 })
    act(() => {
      window.history.pushState(null, '', '/?d=2026-10-06')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))

    fireEvent.keyDown(document, { key: 'j' })
    fireEvent.keyDown(document, { key: 'x' })
    await new Promise((resolve) => setTimeout(resolve, 50)) // the write starts after onMutate
    expect(done).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'c' })
    expect(await screen.findByRole('textbox')).toBeInTheDocument()

    act(() => release(c4Response('2026-10-06')))
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeInTheDocument())
  })
})

it('401: calls onSessionExpired once, shows no error state and does not retry', async () => {
  const load = vi.fn(() => Promise.reject(new UnauthorizedError()))
  const onSessionExpired = vi.fn()
  renderContainer(load, { client: createQueryClient(), onSessionExpired })

  await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(load).toHaveBeenCalledTimes(1)
})

describe('first-login timezone sync (Decision 2)', () => {
  const onUtc = (): TodayResponse => ({ ...c4Response(), timezone: 'UTC' })

  it('sends the browser zone once when the page is on UTC, then refetches today', async () => {
    const load = vi
      .fn<() => Promise<TodayResponse>>()
      .mockResolvedValueOnce(onUtc())
      .mockResolvedValue(c4Response())
    const syncTimezone = vi.fn(() => Promise.resolve())
    renderContainer(load, { syncTimezone, browserZone: () => 'America/New_York' })

    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
    expect(syncTimezone).toHaveBeenCalledTimes(1)
    expect(syncTimezone).toHaveBeenCalledWith('America/New_York')
  })

  it('does nothing when the stored zone is already set', async () => {
    const load = vi.fn(() => Promise.resolve(c4Response()))
    const syncTimezone = vi.fn(() => Promise.resolve())
    renderContainer(load, { syncTimezone, browserZone: () => 'America/New_York' })
    await screen.findByRole('heading', { level: 1 })

    expect(syncTimezone).not.toHaveBeenCalled()
    expect(load).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['the browser is on UTC too', 'UTC'],
    ['the browser zone is not a valid IANA name', 'Mars/Olympus'],
    ['the browser reports an empty zone', ''],
  ])('does nothing when %s', async (_label, zone) => {
    const load = vi.fn(() => Promise.resolve(onUtc()))
    const syncTimezone = vi.fn(() => Promise.resolve())
    renderContainer(load, { syncTimezone, browserZone: () => zone })
    await screen.findByRole('heading', { level: 1 })

    expect(syncTimezone).not.toHaveBeenCalled()
  })

  it('stays silent when the sync fails, shows the page, and does not retry in the same mount', async () => {
    const load = vi.fn(() => Promise.resolve(onUtc()))
    const syncTimezone = vi.fn(() => Promise.reject(new Error('PATCH /me failed with 503')))
    renderContainer(load, { syncTimezone, browserZone: () => 'America/New_York' })

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    await waitFor(() => expect(syncTimezone).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(load).toHaveBeenCalledTimes(1)

    // A later refetch still reports UTC: the sync is not attempted again until the next page load.
    act(() => void window.dispatchEvent(new Event('visibilitychange')))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(syncTimezone).toHaveBeenCalledTimes(1)
  })

  it('401 on the sync ends the session once, without an error line', async () => {
    const load = vi.fn(() => Promise.resolve(onUtc()))
    const syncTimezone = vi.fn(() => Promise.reject(new UnauthorizedError()))
    const onSessionExpired = vi.fn()
    renderContainer(load, { syncTimezone, onSessionExpired, browserZone: () => 'America/New_York' })

    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
