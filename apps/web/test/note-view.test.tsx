/** note-view [PR1] · the read-only note: states, content, focus, esc, hints. */
import type { NoteDetailResponse } from '@onti/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { afterEach, expect, it, vi } from 'vitest'
import { NoteContainer } from '../src/features/note/NoteContainer'
import { ApiError, UnauthorizedError } from '../src/lib/api'
import { createQueryClient } from '../src/lib/query-client'
import { messages } from '../src/messages'

afterEach(() => vi.restoreAllMocks())

const ID = '00000000-0000-4000-8000-000000000001'
const detail = (over: Partial<NoteDetailResponse['note']> = {}): NoteDetailResponse => ({
  now: new Date('2026-10-07T15:05:00.000Z'),
  timezone: 'America/Mexico_City',
  note: {
    id: ID,
    title: 'Ask Luis for the admin permissions',
    tags: [{ name: 'Client A', slug: 'client-a' }],
    dueAt: new Date('2026-10-07T23:00:00.000Z'),
    originalDueAt: new Date('2026-10-07T23:00:00.000Z'),
    snoozeCount: 0,
    doneAt: null,
    createdAt: new Date('2026-10-01T16:00:00.000Z'),
    body: 'Ana needs **admin** access\n\n- Repo settings',
    ...over,
  },
})

type Load = (id: string) => Promise<NoteDetailResponse>

function setup(
  load: Load,
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const onClose = vi.fn()
  const onSessionExpired = vi.fn()
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={client}>
      <NoteContainer
        id={ID}
        load={load}
        onClose={onClose}
        onSessionExpired={onSessionExpired}
        onSignOut={() => undefined}
      />
    </QueryClientProvider>,
  )
  return { user, onClose, onSessionExpired }
}
const footer = () => screen.getByRole('contentinfo')

it('shows a loading status while the note is pending', () => {
  setup(() => new Promise(() => undefined))
  expect(screen.getByRole('status')).toHaveTextContent(messages.note.loading)
})

it('shows title, tags, due time, creation time and the rendered body under one h1', async () => {
  setup(() => Promise.resolve(detail()))
  const heading = await screen.findByRole('heading', { level: 1 })
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  expect(heading).toHaveTextContent('Ask Luis for the admin permissions')
  expect(screen.getByRole('main')).toHaveTextContent('#client-a')
  expect(screen.getByRole('main')).toHaveTextContent('Wed 7 17:00')
  expect(screen.getByRole('main')).toHaveTextContent(messages.note.created('Thu 1 10:00'))
  expect((await screen.findByText('admin')).tagName).toBe('STRONG')
  expect(screen.getByRole('listitem')).toHaveTextContent('Repo settings')
})

it('moves focus to the heading on open', async () => {
  setup(() => Promise.resolve(detail()))
  expect(await screen.findByRole('heading', { level: 1 })).toHaveFocus()
})

it('says "no reminder" for an undated note, and shows no internal id', async () => {
  setup(() => Promise.resolve(detail({ dueAt: null, originalDueAt: null, tags: [] })))
  await screen.findByRole('heading', { level: 1 })
  expect(screen.getByRole('main')).toHaveTextContent(messages.note.noReminder)
  expect(document.body).not.toHaveTextContent(ID)
})

it('strikes a done title and says "done" to assistive technology', async () => {
  setup(() => Promise.resolve(detail({ doneAt: new Date('2026-10-07T14:00:00.000Z') })))
  const heading = await screen.findByRole('heading', { level: 1 })
  expect(heading.querySelector('s')).toHaveTextContent('Ask Luis for the admin permissions')
  expect(screen.getByText(messages.note.done)).toBeInTheDocument()
})

it('C10 end to end: a hostile body shows as text, with no element and no handler', async () => {
  const hostile = '<img src=x onerror=alert(1)>'
  setup(() => Promise.resolve(detail({ body: hostile, title: '<b>bold</b>' })))
  await screen.findByRole('heading', { level: 1 })
  await waitFor(() => expect(screen.getByRole('main')).toHaveTextContent(hostile))
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('<b>bold</b>')
  expect(screen.getByRole('main').querySelector('img, b, [onerror]')).toBeNull()
})

it('shows calm "not found" copy with Back on a 404, without retrying', async () => {
  const load = vi.fn<Load>().mockRejectedValue(new ApiError(404, 'GET /notes/x'))
  const { user, onClose } = setup(load, createQueryClient())
  expect(await screen.findByText(messages.note.notFound)).toBeInTheDocument()
  expect(load).toHaveBeenCalledTimes(1)
  await user.click(screen.getByRole('button', { name: messages.note.back }))
  expect(onClose).toHaveBeenCalledTimes(1)
})

it('shows an error with retry on a 5xx, and retry loads the note', async () => {
  const load = vi
    .fn<Load>()
    .mockRejectedValueOnce(new ApiError(500, 'GET /notes/x'))
    .mockResolvedValue(detail())
  const { user } = setup(load)
  expect(await screen.findByRole('alert')).toHaveTextContent(messages.note.loadError)
  await user.click(screen.getByRole('button', { name: messages.note.retry }))
  expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
  expect(load).toHaveBeenCalledTimes(2)
})

it('ends the session on a 401', async () => {
  const { onSessionExpired } = setup(() => Promise.reject(new UnauthorizedError()))
  await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('hints esc only, and esc and the Back button close the view', async () => {
  const { user, onClose } = setup(() => Promise.resolve(detail()))
  await screen.findByRole('heading', { level: 1 })
  expect(footer()).toHaveTextContent(messages.note.hints.back)
  expect(footer()).not.toHaveTextContent(/edit|delete/i)

  await user.keyboard('{Escape}')
  expect(onClose).toHaveBeenCalledTimes(1)
  await user.click(screen.getByRole('button', { name: messages.note.back }))
  expect(onClose).toHaveBeenCalledTimes(2)
})

it('x, s, z and other keys do nothing and send no request', async () => {
  const load = vi.fn<Load>().mockResolvedValue(detail())
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  const { user, onClose } = setup(load)
  await screen.findByRole('heading', { level: 1 })
  await user.keyboard('xszed')
  expect(onClose).not.toHaveBeenCalled()
  expect(load).toHaveBeenCalledTimes(1)
  expect(fetchSpy).not.toHaveBeenCalled()
  expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
    messages.today.signOut,
    messages.note.back,
  ])
})

it('styles the view with tokens only, 44 px targets and a visible focus ring [static]', () => {
  const files = ['NotePage', 'NoteBody', 'MarkdownBody', 'NoteStatus', 'NoteStatusline']
  for (const file of files) {
    const css = readFileSync(`src/features/note/${file}.module.css`, 'utf8')
    expect(css, file).not.toMatch(/#[0-9a-f]{3,6}\b|--core-|font-size|--color-date/i)
    expect(css, file).not.toMatch(/(?<![\d.])(?!1px|2px)\d+px/)
  }
  // The Back button composes the All notes one (44 px); the note view adds the ink focus ring.
  expect(readFileSync('src/features/notes/NotesPage.module.css', 'utf8')).toMatch(
    /\.back\s*\{[^}]*min-height:\s*var\(--size-target\)/,
  )
  const page = readFileSync('src/features/note/NotePage.module.css', 'utf8')
  expect(page).toMatch(
    /\.back\s*\{[^}]*composes:\s*back from '\.\.\/notes\/NotesPage\.module\.css'/,
  )
  expect(page).toMatch(/:focus-visible[^{]*\{[^}]*var\(--focus-ring\)/)
})
