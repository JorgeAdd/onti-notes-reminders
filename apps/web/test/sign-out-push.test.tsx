import type { Session } from '@supabase/supabase-js'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const order: string[] = []
const mocks = vi.hoisted(() => ({
  unsubscribeThisBrowser: vi.fn<(token: string) => Promise<boolean>>(),
}))

const session = { access_token: 'token-1' } as Session
let notify: (next: Session | null) => void = () => undefined

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session } }),
      onAuthStateChange: (callback: (event: string, next: Session | null) => void) => {
        notify = (next) => callback('SIGNED_OUT', next)
        return { data: { subscription: { unsubscribe: () => undefined } } }
      },
      signOut: () => {
        order.push('signOut')
        notify(null)
        return Promise.resolve({ error: null })
      },
    },
  },
}))
vi.mock('../src/features/push/push-client', () => ({
  unsubscribeThisBrowser: (token: string) => {
    order.push(`unsubscribe:${token}`)
    return mocks.unsubscribeThisBrowser(token)
  },
  readStatus: () => Promise.resolve({ state: 'unsupported', subscription: null }),
  enablePush: vi.fn(),
  disablePush: vi.fn(),
}))
vi.mock('../src/features/today/TodayContainer', () => ({
  TodayContainer: ({ onSignOut }: { onSignOut: () => void }) => (
    <button onClick={onSignOut}>leave</button>
  ),
}))

import { App } from '../src/App'
import { createQueryClient } from '../src/lib/query-client'
import { messages } from '../src/messages'

const renderApp = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <App />
    </QueryClientProvider>,
  )
const signInHeading = () => screen.queryByRole('heading', { name: messages.auth.signInTitle })
const settle = () => act(() => Promise.resolve())

/** Renders signed in, then clicks sign out; `fakeTimers` starts faking only after the first paint. */
async function leave(fakeTimers = false) {
  renderApp()
  const button = await screen.findByRole('button', { name: 'leave' })
  if (fakeTimers) vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  fireEvent.click(button)
}

beforeEach(() => {
  order.length = 0
  mocks.unsubscribeThisBrowser.mockReset().mockResolvedValue(false)
})
afterEach(() => vi.useRealTimers())

it('unsubscribes this browser with the token it signed out with, then ends the session', async () => {
  let finish: (value: boolean) => void = () => undefined
  mocks.unsubscribeThisBrowser.mockReturnValue(new Promise((resolve) => (finish = resolve)))
  await leave()
  await settle()
  expect(order).toEqual(['unsubscribe:token-1'])
  expect(signInHeading()).toBeNull()

  finish(true)
  expect(await screen.findByRole('heading', { name: messages.auth.signInTitle })).toBeVisible()
  expect(order).toEqual(['unsubscribe:token-1', 'signOut'])
})

it('still ends the session when the unsubscribe fails', async () => {
  mocks.unsubscribeThisBrowser.mockRejectedValue(new Error('boom'))
  await leave()
  expect(await screen.findByRole('heading', { name: messages.auth.signInTitle })).toBeVisible()
  expect(order).toEqual(['unsubscribe:token-1', 'signOut'])
})

it('does not wait when this browser is not subscribed: no timer has to pass', async () => {
  await leave(true)
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(signInHeading()).not.toBeNull()
  expect(vi.getTimerCount()).toBe(0)
})

it('gives up after 2 s so a dead network never blocks sign-out', async () => {
  mocks.unsubscribeThisBrowser.mockReturnValue(new Promise(() => undefined))
  await leave(true)
  await act(() => vi.advanceTimersByTimeAsync(1999))
  expect(signInHeading()).toBeNull()
  expect(order).not.toContain('signOut')
  await act(() => vi.advanceTimersByTimeAsync(1))
  expect(order).toEqual(['unsubscribe:token-1', 'signOut'])
  expect(signInHeading()).not.toBeNull()
})
