import type { Session } from '@supabase/supabase-js'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../src/App'
import { createQueryClient } from '../src/lib/query-client'
import { messages } from '../src/messages'

const session = { access_token: 'token-1' } as Session
let notify: (next: Session | null) => void = () => undefined
const signOutOk = () => {
  notify(null)
  return Promise.resolve({ error: null })
}
let signOutImpl: () => Promise<unknown> = signOutOk

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session } }),
      onAuthStateChange: (callback: (event: string, next: Session | null) => void) => {
        notify = (next) => callback('SIGNED_IN', next)
        return { data: { subscription: { unsubscribe: () => undefined } } }
      },
      signOut: () => signOutImpl(),
    },
  },
}))

afterEach(() => {
  vi.restoreAllMocks()
  signOutImpl = signOutOk
})

const renderApp = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <App />
    </QueryClientProvider>,
  )

it('401 from /today signs out and returns to sign-in with "session expired"', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }))
  renderApp()

  expect(await screen.findByText(messages.auth.sessionExpired)).toHaveAttribute('role', 'status')
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(messages.auth.signInTitle)
})

it('still returns to sign-in when signing out fails (no blank page)', async () => {
  signOutImpl = () => Promise.reject(new Error('network down'))
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }))
  renderApp()

  expect(await screen.findByText(messages.auth.sessionExpired)).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(messages.auth.signInTitle)
})
