import type { Session } from '@supabase/supabase-js'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi, type MockInstance } from 'vitest'
import { App } from '../src/App'
import { createQueryClient } from '../src/lib/query-client'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

const session = { access_token: 'token-1' } as Session
let notify: (next: Session | null) => void = () => undefined
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session } }),
      onAuthStateChange: (callback: (event: string, next: Session | null) => void) => {
        notify = (next) => callback('SIGNED_IN', next)
        return { data: { subscription: { unsubscribe: () => undefined } } }
      },
      signOut: () => {
        notify(null)
        return Promise.resolve({ error: null })
      },
    },
  },
}))

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
const notesBody = {
  now: '2026-10-07T15:05:00.000Z',
  timezone: 'America/Mexico_City',
  total: 15,
  notes: [
    {
      id: '00000000-0000-4000-8000-000000000001',
      title: 'Staging URL and test accounts',
      tags: [],
      dueAt: null,
      doneAt: null,
      excerpt: '',
    },
  ],
}
let today: unknown
let fetchMock: MockInstance<typeof fetch>

beforeEach(() => {
  today = JSON.parse(JSON.stringify(c4Response()))
  fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
    const path = (url as URL).pathname
    return Promise.resolve(json(path === '/notes' ? notesBody : today))
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const renderApp = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <App />
    </QueryClientProvider>,
  )
const todayHeading = () => screen.findByRole('heading', { level: 1, name: /today/ })
const searchBox = () => screen.findByRole('textbox', { name: messages.notes.searchLabel })
const footer = () => screen.getByRole('contentinfo')
const notesCalls = () => fetchMock.mock.calls.filter(([url]) => (url as URL).pathname === '/notes')

it('opens on / with the input focused, and esc returns to today', async () => {
  const user = userEvent.setup()
  renderApp()
  await todayHeading()
  await user.keyboard('/')

  expect(await searchBox()).toHaveFocus()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(messages.notes.title)
  await user.keyboard('{Escape}')
  expect(await todayHeading()).toBeInTheDocument()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
})

it('one esc leaves even with text typed, and "Back to today" returns as well', async () => {
  const user = userEvent.setup()
  renderApp()
  await todayHeading()
  await user.keyboard('/')
  await user.type(await searchBox(), 'stag{Escape}')
  await todayHeading()

  await user.keyboard('/')
  await searchBox()
  await user.click(screen.getByRole('button', { name: messages.notes.back }))
  expect(await todayHeading()).toBeInTheDocument()
})

it('ignores / in the capture bar and while s is armed', async () => {
  const user = userEvent.setup()
  renderApp()
  await todayHeading()
  await user.keyboard('c')
  const bar = await screen.findByRole('textbox', { name: messages.capture.label })
  await user.type(bar, '/')
  expect(bar).toHaveValue('/')
  expect(screen.queryByRole('textbox', { name: messages.notes.searchLabel })).toBeNull()
  await user.keyboard('{Escape}')

  await user.keyboard('js/')
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/today/)
  expect(notesCalls()).toHaveLength(0)
})

it('x, s and z do nothing in the notes view and send no request; / refocuses the input', async () => {
  const user = userEvent.setup()
  renderApp()
  await todayHeading()
  await user.keyboard('/')
  const box = await searchBox()
  await screen.findByText('Staging URL and test accounts')
  await user.click(screen.getByRole('heading', { level: 1 }))
  expect(box).not.toHaveFocus()
  const calls = fetchMock.mock.calls.length

  await user.keyboard('xsz')
  expect(box).toHaveValue('')
  expect(fetchMock.mock.calls).toHaveLength(calls)
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)

  await user.keyboard('/')
  expect(box).toHaveFocus()
  expect(box).toHaveValue('')
})

it('hints / search on Today exactly when the key works, also with no rows', async () => {
  today = {
    ...(today as object),
    carried: [],
    rail: [],
    openCount: 0,
    otherCount: 0,
  }
  const user = userEvent.setup()
  renderApp()
  await todayHeading()
  expect(footer()).toHaveTextContent(messages.statusline.keys.search)
  expect(messages.statusline.keys.search).toBe('/ search')

  await user.keyboard('c')
  expect(footer()).not.toHaveTextContent(messages.statusline.keys.search)
})

it('does not hint / search while s has armed the snooze menu', async () => {
  const user = userEvent.setup()
  renderApp()
  await todayHeading()
  expect(footer()).toHaveTextContent(messages.statusline.keys.search)
  await user.keyboard('js')
  expect(footer()).not.toHaveTextContent(messages.statusline.keys.search)
})

it('opens from the mobile Search button', async () => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
  const user = userEvent.setup()
  renderApp()
  await todayHeading()
  await user.click(screen.getByRole('button', { name: messages.mobile.search }))
  expect(await searchBox()).toBeInTheDocument()
})

it('signing out resets the view: the next session starts on today', async () => {
  const user = userEvent.setup()
  renderApp()
  await todayHeading()
  await user.keyboard('/')
  await searchBox()

  await user.click(screen.getByRole('button', { name: messages.today.signOut }))
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
    messages.auth.signInTitle,
  )
  act(() => notify(session))
  expect(await todayHeading()).toBeInTheDocument()
})
