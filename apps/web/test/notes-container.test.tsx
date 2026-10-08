import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { NoteListItem, NotesListResponse } from '@onti/shared'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { NotesContainer } from '../src/features/notes/NotesContainer'
import { UnauthorizedError } from '../src/lib/api'
import { messages } from '../src/messages'

afterEach(() => vi.useRealTimers())

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const item = (n: number, title: string): NoteListItem => ({
  id: uuid(n),
  title,
  tags: [],
  dueAt: null,
  doneAt: null,
  excerpt: '',
})
const list = (notes: NoteListItem[], total = 15): NotesListResponse => ({
  now: new Date('2026-10-07T15:05:00.000Z'),
  timezone: 'America/Mexico_City',
  total,
  notes,
})
const STAGING = [item(1, 'Staging URL and test accounts'), item(2, 'Staging checklist')]

type Load = (term: string) => Promise<NotesListResponse>

function renderNotes(
  load: Load,
  { onSessionExpired = () => undefined, onBack = () => undefined } = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <NotesContainer
        load={load}
        onSessionExpired={onSessionExpired}
        onBack={onBack}
        onSignOut={() => undefined}
      />
    </QueryClientProvider>,
  )
}
const input = () => screen.findByRole('textbox', { name: messages.notes.searchLabel })
const type = async (value: string) => fireEvent.change(await input(), { target: { value } })
const footer = () => screen.getByRole('contentinfo')

it('shows a loading status, then the page with one h1 and the focused search input', async () => {
  renderNotes(() => Promise.resolve(list(STAGING)))
  expect(screen.getByRole('status')).toHaveTextContent(messages.notes.loading)

  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(messages.notes.title)
  expect(await input()).toHaveFocus()
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  expect(screen.queryByText(messages.today.otherNotes(0))).not.toBeInTheDocument()
  expect(screen.queryByText(/other notes? on the back/)).not.toBeInTheDocument()
})

it('limits the input to the shared query length', async () => {
  renderNotes(() => Promise.resolve(list([])))
  expect(await input()).toHaveAttribute('maxlength', '200')
})

it('shows an error with Retry on the first load and Retry loads the list', async () => {
  const load = vi
    .fn<Load>()
    .mockRejectedValueOnce(new Error('GET /notes failed with 500'))
    .mockResolvedValue(list(STAGING))
  renderNotes(load)

  expect(await screen.findByRole('alert')).toHaveTextContent(messages.notes.loadError)
  fireEvent.click(screen.getByRole('button', { name: messages.notes.retry }))
  expect(await screen.findAllByRole('listitem')).toHaveLength(2)
  expect(load).toHaveBeenCalledTimes(2)
})

it('keeps the page, the input and the typed text when a later search fails', async () => {
  const load = vi
    .fn<Load>()
    .mockResolvedValueOnce(list(STAGING))
    .mockRejectedValueOnce(new Error('GET /notes failed with 500'))
    .mockResolvedValue(list([STAGING[0]!]))
  renderNotes(load)
  await type('stag')

  expect(await screen.findByRole('alert')).toHaveTextContent(messages.notes.loadError)
  expect(await input()).toHaveValue('stag')
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: messages.notes.retry }))
  await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('ends the session once on a 401', async () => {
  const onSessionExpired = vi.fn()
  renderNotes(() => Promise.reject(new UnauthorizedError()), { onSessionExpired })
  await waitFor(() => expect(onSessionExpired).toHaveBeenCalled())
  expect(onSessionExpired).toHaveBeenCalledTimes(1)
})

it('says "No notes yet" for an account with no notes', async () => {
  renderNotes(() => Promise.resolve(list([], 0)))
  expect(await screen.findByText(messages.notes.empty)).toHaveAttribute('role', 'status')
})

it('says no notes match the term, as plain text, when a search finds nothing', async () => {
  const load = vi.fn<Load>((term) => Promise.resolve(term === '' ? list(STAGING) : list([], 15)))
  renderNotes(load)
  await type('<b>zzz</b>')

  const message = await screen.findByText(messages.notes.noMatch('<b>zzz</b>'))
  expect(message).toHaveAttribute('role', 'status')
  expect(message.querySelector('b')).toBeNull()
  expect(screen.queryByText(messages.notes.empty)).not.toBeInTheDocument()
})

it('sends one request per pause (200 ms), trimmed, and keeps the previous list meanwhile', async () => {
  vi.useFakeTimers()
  let resolveStag: (value: NotesListResponse) => void = () => undefined
  const load = vi.fn<Load>((term) =>
    term === 'stag'
      ? new Promise((resolve) => (resolveStag = resolve))
      : Promise.resolve(list(STAGING)),
  )
  renderNotes(load)
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(load).toHaveBeenCalledTimes(1)
  expect(load).toHaveBeenLastCalledWith('')

  const box = screen.getByRole('textbox', { name: messages.notes.searchLabel })
  for (const value of ['s', 'st', 'sta', '  stag ']) fireEvent.change(box, { target: { value } })
  await act(() => vi.advanceTimersByTimeAsync(199))
  expect(load).toHaveBeenCalledTimes(1)

  await act(() => vi.advanceTimersByTimeAsync(1))
  expect(load).toHaveBeenCalledTimes(2)
  expect(load).toHaveBeenLastCalledWith('stag')
  expect(screen.getAllByRole('listitem')).toHaveLength(2)

  resolveStag(list([STAGING[0]!]))
  await act(() => vi.advanceTimersByTimeAsync(0)) // react-query notifies on a 0 ms timer
  expect(screen.getAllByRole('listitem')).toHaveLength(1)
})

it('discards the answer of a stale term that arrives late', async () => {
  vi.useFakeTimers()
  const pending = new Map<string, (value: NotesListResponse) => void>()
  const load = vi.fn<Load>((term) =>
    term === '' ? Promise.resolve(list(STAGING)) : new Promise((r) => pending.set(term, r)),
  )
  renderNotes(load)
  await act(() => vi.advanceTimersByTimeAsync(0))
  const box = screen.getByRole('textbox', { name: messages.notes.searchLabel })

  fireEvent.change(box, { target: { value: 'a' } })
  await act(() => vi.advanceTimersByTimeAsync(200))
  fireEvent.change(box, { target: { value: 'ab' } })
  await act(() => vi.advanceTimersByTimeAsync(200))

  pending.get('ab')!(list([item(3, 'Ab note')], 15))
  await act(() => vi.advanceTimersByTimeAsync(0)) // react-query notifies on a 0 ms timer
  pending.get('a')!(list([item(4, 'A note one'), item(5, 'A note two')]))
  await act(() => vi.advanceTimersByTimeAsync(0))

  expect(screen.getAllByRole('listitem')).toHaveLength(1)
  expect(screen.getByText('Ab note')).toBeInTheDocument()
  expect(footer()).toHaveTextContent('SEARCH · ab · 1 of 15')
})

it('reads SEARCH · all notes · 15 of 15 with no term and SEARCH · term · n of 15 with one', async () => {
  const load = vi.fn<Load>((term) =>
    Promise.resolve(
      term === ''
        ? list(Array.from({ length: 15 }, (_, i) => item(i + 1, `N ${i}`)))
        : list(STAGING),
    ),
  )
  renderNotes(load)
  await screen.findAllByRole('listitem')
  expect(footer()).toHaveTextContent('SEARCH · all notes · 15 of 15')

  await type('stag')
  await waitFor(() => expect(footer()).toHaveTextContent('SEARCH · stag · 2 of 15'))
})

it('counts shown of the whole note count: 60 matches of 70 notes read 50 of 70', async () => {
  const fifty = Array.from({ length: 50 }, (_, i) => item(i + 1, `Match ${i}`))
  renderNotes(() => Promise.resolve(list(fifty, 70)))
  await screen.findAllByRole('listitem')
  expect(footer()).toHaveTextContent('SEARCH · all notes · 50 of 70')
})

it('hints only esc while the input has focus, and / search and esc otherwise', async () => {
  renderNotes(() => Promise.resolve(list(STAGING)))
  const box = await input()
  expect(box).toHaveFocus()
  expect(footer()).toHaveTextContent(messages.notes.hints.back)
  expect(footer()).not.toHaveTextContent(messages.notes.hints.search)

  fireEvent.blur(box)
  expect(footer()).toHaveTextContent(messages.notes.hints.search)
  expect(footer()).toHaveTextContent(messages.notes.hints.back)
  fireEvent.focus(box)
  expect(footer()).not.toHaveTextContent(messages.notes.hints.search)
})

it('announces the count politely, and the button goes back', async () => {
  const onBack = vi.fn()
  renderNotes(() => Promise.resolve(list(STAGING)), { onBack })
  await screen.findAllByRole('listitem')
  const live = document.querySelector('[aria-live="polite"]')
  expect(live).toHaveTextContent(messages.notes.count(2))

  fireEvent.click(screen.getByRole('button', { name: messages.notes.back }))
  expect(onBack).toHaveBeenCalledTimes(1)
})
