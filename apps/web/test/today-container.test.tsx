import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { TodayResponse } from '@onti/shared'
import { afterEach, expect, it, vi } from 'vitest'
import { TodayContainer } from '../src/features/today/TodayContainer'
import { UnauthorizedError } from '../src/lib/api'
import { createQueryClient } from '../src/lib/query-client'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

afterEach(() => vi.useRealTimers())

const noRetry = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

function renderContainer(
  load: () => Promise<TodayResponse>,
  { client = noRetry(), onSessionExpired = () => undefined } = {},
) {
  return render(
    <QueryClientProvider client={client}>
      <TodayContainer load={load} onSessionExpired={onSessionExpired} onSignOut={() => undefined} />
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
