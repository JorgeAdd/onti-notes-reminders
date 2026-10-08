import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { TodayResponse } from '@onti/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TodayContainer } from '../src/features/today/TodayContainer'
import { UnauthorizedError } from '../src/lib/api'
import { createQueryClient } from '../src/lib/query-client'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

afterEach(() => vi.useRealTimers())

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
  load: () => Promise<TodayResponse>,
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
  renderContainer(() => Promise.resolve(c4Response()))
  expect(screen.getByRole('status')).toHaveTextContent(messages.today.loading)
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

it('refetches once the tick passes the window end, not before (rollover)', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const start = new Date('2026-10-07T15:05:30.000Z')
  vi.setSystemTime(start)
  const base = c4Response()
  const day = (end: string): TodayResponse => ({
    ...base,
    now: new Date(Date.now()),
    window: { start: base.window.start, end: new Date(end) },
  })
  const load = vi
    .fn<() => Promise<TodayResponse>>()
    .mockResolvedValueOnce(day('2026-10-07T15:06:00.000Z'))
    .mockResolvedValue(day('2026-10-08T06:00:00.000Z'))
  renderContainer(load)
  await screen.findByRole('heading', { level: 1 })

  await act(() => vi.advanceTimersByTimeAsync(20_000))
  expect(load).toHaveBeenCalledTimes(1)

  await act(() => vi.advanceTimersByTimeAsync(15_000))
  await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
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
