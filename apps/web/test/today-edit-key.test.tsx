/** note-editing [PR2] · `e` on a focused Today row opens that note in edit mode (App flow). */
import {
  noteDetailResponseSchema,
  todayResponseSchema,
  type NoteDetailResponse,
} from '@onti/shared'
import type { Session } from '@supabase/supabase-js'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { App } from '../src/App'
import { createQueryClient } from '../src/lib/query-client'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

const session = { access_token: 'token-1' } as Session

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      signOut: () => Promise.resolve({ error: null }),
    },
  },
}))

const today = c4Response()
const items = [...today.carried.flatMap((group) => group.items), ...today.rail]
const first = items[0]!
const requested: string[] = []

const detail = (id: string): NoteDetailResponse => {
  const item = items.find((candidate) => candidate.id === id)!
  return {
    now: today.now,
    timezone: today.timezone,
    note: { ...item, createdAt: new Date('2026-10-01T16:00:00.000Z'), body: 'Body of the note' },
  }
}

const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))

beforeEach(() => {
  requested.length = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString())
    requested.push(`${init?.method ?? 'GET'} ${url.pathname}`)
    if (url.pathname === '/today') return json(z.encode(todayResponseSchema, today))
    if (url.pathname === '/notes') {
      return json({ now: today.now.toISOString(), timezone: today.timezone, total: 0, notes: [] })
    }
    return json(z.encode(noteDetailResponseSchema, detail(url.pathname.replace('/notes/', ''))))
  })
})
afterEach(() => vi.restoreAllMocks())

const renderApp = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <App />
    </QueryClientProvider>,
  )

it('e on a focused row opens the note view already in edit mode, for that note', async () => {
  const user = userEvent.setup()
  renderApp()
  await screen.findByRole('heading', { level: 1, name: /things? today|left today/ })
  await user.keyboard('j')
  await user.keyboard('e')

  const title = await screen.findByLabelText(messages.note.edit.title)
  expect(title).toHaveValue(first.title)
  expect(title).toHaveFocus()
  expect(requested).toContain(`GET /notes/${first.id}`)
  expect(requested.filter((entry) => entry.startsWith('PATCH'))).toEqual([])
})

it('esc in that edit mode discards and shows the read view; the next esc reaches the list', async () => {
  const user = userEvent.setup()
  renderApp()
  await screen.findByRole('heading', { level: 1, name: /things? today|left today/ })
  await user.keyboard('j')
  await user.keyboard('e')
  await screen.findByLabelText(messages.note.edit.title)
  await user.keyboard('{Escape}')
  expect(await screen.findByRole('heading', { level: 1, name: first.title })).toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(
    await screen.findByRole('heading', { level: 1, name: messages.notes.title }),
  ).toBeInTheDocument()
})

it('e with no focused row opens nothing', async () => {
  const user = userEvent.setup()
  renderApp()
  await screen.findByRole('heading', { level: 1, name: /things? today|left today/ })
  await user.keyboard('e')
  expect(requested.filter((entry) => entry.startsWith('GET /notes/'))).toEqual([])
  expect(screen.queryByLabelText(messages.note.edit.title)).not.toBeInTheDocument()
})
