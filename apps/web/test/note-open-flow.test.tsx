/** note-view [PR1] · All notes row opens the note; esc keeps the search; sign-out resets. */
import {
  noteDetailResponseSchema,
  notesListResponseSchema,
  todayResponseSchema,
  type NoteDetailResponse,
  type NotesListResponse,
} from '@onti/shared'
import type { Session } from '@supabase/supabase-js'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { z } from 'zod'
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
      signOut: () => Promise.resolve({ error: null }),
    },
  },
}))

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const NOW = new Date('2026-10-07T15:05:00.000Z')
const row = (n: number, title: string) => ({
  id: uuid(n),
  title,
  tags: [],
  dueAt: null,
  doneAt: null,
  excerpt: '',
})
const ALL: NotesListResponse = {
  now: NOW,
  timezone: 'America/Mexico_City',
  total: 3,
  notes: [
    row(1, 'Staging URL and test accounts'),
    row(2, 'Staging checklist'),
    row(3, 'PR review checklist'),
  ],
}
const STAGING: NotesListResponse = { ...ALL, notes: ALL.notes.slice(0, 2) }
const detail = (id: string): NoteDetailResponse => ({
  now: NOW,
  timezone: 'America/Mexico_City',
  note: {
    ...ALL.notes.find((n) => n.id === id)!,
    originalDueAt: null,
    snoozeCount: 0,
    createdAt: new Date('2026-10-01T16:00:00.000Z'),
    body: 'Staging: **qa-admin** account',
  },
})

const requested: string[] = []
function json(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
}
beforeEach(() => {
  requested.length = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = new URL(input instanceof Request ? input.url : input.toString())
    requested.push(`${url.pathname}${url.search}`)
    if (url.pathname === '/today') return json(z.encode(todayResponseSchema, c4Response()))
    if (url.pathname === '/notes') {
      const wire = url.searchParams.get('q') ? STAGING : ALL
      return json(z.encode(notesListResponseSchema, wire))
    }
    const id = url.pathname.replace('/notes/', '')
    return json(z.encode(noteDetailResponseSchema, detail(id)))
  })
})
afterEach(() => vi.restoreAllMocks())

const renderApp = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <App />
    </QueryClientProvider>,
  )

async function openSearchedList(user: ReturnType<typeof userEvent.setup>) {
  renderApp()
  await screen.findByRole('heading', { level: 1, name: /things? today|left today/ })
  await user.keyboard('/')
  const input = await screen.findByRole('textbox', { name: messages.notes.searchLabel })
  await user.type(input, 'staging')
  await screen.findByRole('button', { name: /Staging URL and test accounts/ })
  await vi.waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2))
  return input
}

it(
  'a row opens the note by id; esc returns to the same search, a second esc reaches Today',
  { timeout: 20_000 },
  async () => {
    const user = userEvent.setup()
    await openSearchedList(user)

    await user.click(screen.getByRole('button', { name: /Staging URL and test accounts/ }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Staging URL and test accounts' }),
    ).toBeInTheDocument()
    expect(requested).toContain(`/notes/${uuid(1)}`)
    expect((await screen.findByText('qa-admin')).tagName).toBe('STRONG')

    await user.keyboard('{Escape}')
    const input = await screen.findByRole('textbox', { name: messages.notes.searchLabel })
    expect(input).toHaveValue('staging')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.queryByText('PR review checklist')).not.toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(
      await screen.findByRole('heading', { level: 1, name: /things? today|left today/ }),
    ).toBeInTheDocument()
  },
)

it(
  'opens from the keyboard (Enter on the focused row) and Back does the first step',
  { timeout: 20_000 },
  async () => {
    const user = userEvent.setup()
    await openSearchedList(user)

    screen.getByRole('button', { name: /Staging checklist/ }).focus()
    await user.keyboard('{Enter}')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Staging checklist' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: messages.note.back }))
    const list = await screen.findByRole('list')
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
  },
)

it(
  'sign-out while a note is open resets to Today after the next sign-in',
  { timeout: 20_000 },
  async () => {
    const user = userEvent.setup()
    await openSearchedList(user)
    await user.click(screen.getByRole('button', { name: /Staging URL and test accounts/ }))
    await screen.findByRole('heading', { level: 1, name: 'Staging URL and test accounts' })

    act(() => notify(null))
    expect(
      await screen.findByRole('heading', { level: 1, name: messages.auth.signInTitle }),
    ).toBeInTheDocument()

    act(() => notify(session))
    expect(
      await screen.findByRole('heading', { level: 1, name: /things? today|left today/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Staging URL and test accounts' }),
    ).not.toBeInTheDocument()
  },
)
