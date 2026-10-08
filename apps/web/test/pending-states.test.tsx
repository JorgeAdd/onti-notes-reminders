import type { TodayResponse } from '@onti/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { App } from '../src/App'
import { TodayContainer } from '../src/features/today/TodayContainer'
import { STATUS_DELAY_MS, useAfterDelay } from '../src/features/today/use-after-delay'
import { resetEntranceForTests } from '../src/lib/entrance'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => new Promise(() => undefined),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
  },
}))

beforeEach(() => {
  resetEntranceForTests()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})
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

function renderContainer(load: () => Promise<TodayResponse>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TodayContainer
        load={load}
        onSessionExpired={() => undefined}
        onSignOut={() => undefined}
        syncTimezone={() => Promise.resolve()}
        reminders={noReminders}
        browserTimeZone={() => 'America/Mexico_City'}
      />
    </QueryClientProvider>,
  )
}

const pending = () => new Promise<TodayResponse>(() => undefined)
const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

it('renders only the desk while the session is pending', () => {
  const { container } = render(
    <QueryClientProvider client={new QueryClient()}>
      <App />
    </QueryClientProvider>,
  )
  expect(container).toBeEmptyDOMElement()
})

it('shows no status card before 400 ms and the loading card at 400 ms', async () => {
  const { container } = renderContainer(pending)
  expect(STATUS_DELAY_MS).toBe(400)
  expect(container).toBeEmptyDOMElement()
  await advance(399)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  await advance(1)
  expect(screen.getByRole('status')).toHaveTextContent(messages.today.loading)
})

it('never shows the status card for a fast load', async () => {
  renderContainer(() => Promise.resolve(c4Response()))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  await advance(0)
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  await advance(1000)
  expect(screen.queryByText(messages.today.loading)).not.toBeInTheDocument()
})

it('shows the error and its retry immediately', async () => {
  renderContainer(() => Promise.reject(new Error('GET /today failed with 500')))
  await advance(0)
  expect(screen.getByRole('alert')).toHaveTextContent(messages.today.loadError)
  expect(screen.getByRole('button', { name: messages.today.retry })).toBeInTheDocument()
})

it('clears its timer on unmount and when the wait ends', () => {
  const { result, rerender, unmount } = renderHook(({ on }) => useAfterDelay(on, 400), {
    initialProps: { on: true },
  })
  expect(vi.getTimerCount()).toBe(1)
  rerender({ on: false })
  expect(result.current).toBe(false)
  expect(vi.getTimerCount()).toBe(0)
  rerender({ on: true })
  unmount()
  expect(vi.getTimerCount()).toBe(0)
})
