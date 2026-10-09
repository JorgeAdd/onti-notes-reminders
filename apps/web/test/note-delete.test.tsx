/** note-editing [PR2] · delete: the inline statusline confirm, keys, 404, cache, `d` elsewhere. */
import type { NoteDetailResponse } from '@onti/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { afterEach, expect, it, vi } from 'vitest'
import { NoteContainer } from '../src/features/note/NoteContainer'
import { noteKey, NOTES_KEYS } from '../src/features/note/query-keys'
import { NotesContainer } from '../src/features/notes/NotesContainer'
import { DAY_KEYS } from '../src/features/today/day-view'
import { reduceKey } from '../src/features/today/keys'
import { ApiError, UnauthorizedError } from '../src/lib/api'
import { messages } from '../src/messages'
import { blocks } from './css-tokens'

afterEach(() => vi.restoreAllMocks())

const ID = '00000000-0000-4000-8000-000000000001'
const detail = (): NoteDetailResponse => ({
  now: new Date('2026-10-07T15:05:00.000Z'),
  timezone: 'America/Mexico_City',
  note: {
    id: ID,
    title: 'Ask Luis for the admin permissions',
    tags: [],
    dueAt: new Date('2026-10-07T23:00:00.000Z'),
    originalDueAt: new Date('2026-10-07T23:00:00.000Z'),
    snoozeCount: 0,
    doneAt: null,
    createdAt: new Date('2026-10-01T16:00:00.000Z'),
    body: 'Ana needs **admin** access',
  },
})

type Remove = (id: string) => Promise<void>

function setup({
  remove = vi.fn<Remove>().mockResolvedValue(undefined),
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
} = {}) {
  const onClose = vi.fn()
  const onSessionExpired = vi.fn()
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={client}>
      <NoteContainer
        id={ID}
        load={() => Promise.resolve(detail())}
        api={{ save: () => Promise.reject(new Error('unexpected save')), remove }}
        startInEdit={false}
        onClose={onClose}
        onSessionExpired={onSessionExpired}
        onSignOut={() => undefined}
      />
    </QueryClientProvider>,
  )
  return { user, remove, client, onClose, onSessionExpired }
}

const del = messages.note.delete
const footer = () => screen.getByRole('contentinfo')
const ready = () => screen.findByRole('heading', { level: 1 })

it('hints d delete in the read view', async () => {
  setup()
  await ready()
  expect(footer()).toHaveTextContent(messages.note.hints.delete)
})

it('d shows the inline confirm in the statusline: no modal, the view stays', async () => {
  const { user } = setup()
  await ready()
  await user.keyboard('d')
  expect(footer()).toHaveTextContent(del.prompt)
  expect(del.prompt).toBe('Delete? ↵ confirm · esc cancel')
  expect(footer()).toHaveTextContent(del.statusHead)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ask Luis')
})

it('the Delete button shows the same confirm (the only way on touch)', async () => {
  const { user } = setup()
  await ready()
  await user.click(screen.getByRole('button', { name: del.open }))
  expect(footer()).toHaveTextContent(del.prompt)
})

it('↵ deletes: one DELETE, the view closes, and the caches are refreshed', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const removeQueries = vi.spyOn(client, 'removeQueries')
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const { user, remove, onClose } = setup({ client })
  await ready()
  await user.keyboard('d')
  await user.keyboard('{Enter}')
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  expect(remove).toHaveBeenCalledTimes(1)
  expect(remove).toHaveBeenCalledWith(ID)
  expect(removeQueries).toHaveBeenCalledWith({ queryKey: noteKey(ID) })
  expect(removeQueries).toHaveBeenCalledWith({ queryKey: DAY_KEYS, type: 'inactive' })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: NOTES_KEYS })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: DAY_KEYS })
})

it('esc cancels: nothing is sent and the view stays open (the next esc closes it)', async () => {
  const { user, remove, onClose } = setup()
  await ready()
  await user.keyboard('d')
  await user.keyboard('{Escape}')
  expect(remove).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
  expect(footer()).not.toHaveTextContent(del.prompt)
  expect(footer()).toHaveTextContent(messages.note.hints.back)
  await user.keyboard('{Escape}')
  expect(onClose).toHaveBeenCalledTimes(1)
})

it('the touch buttons confirm and cancel too', async () => {
  const { user, remove, onClose } = setup()
  await ready()
  await user.keyboard('d')
  await user.click(screen.getByRole('button', { name: del.cancel }))
  expect(remove).not.toHaveBeenCalled()
  expect(footer()).not.toHaveTextContent(del.prompt)
  await user.keyboard('d')
  await user.click(screen.getByRole('button', { name: del.confirm }))
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  expect(remove).toHaveBeenCalledTimes(1)
})

it('opening the confirm from the Delete button moves focus off any button, so one ↵ deletes once', async () => {
  const { user, remove, onClose } = setup()
  await ready()
  await user.click(screen.getByRole('button', { name: del.open }))
  const focused = document.activeElement
  expect(focused).not.toBe(document.body)
  expect(focused?.tagName).not.toBe('BUTTON')
  await user.keyboard('{Enter}')
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  expect(remove).toHaveBeenCalledTimes(1)
})

it('a second ↵ while the delete is in flight sends nothing more', async () => {
  let finish: () => void = () => undefined
  const remove = vi.fn<Remove>().mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  const { user, onClose } = setup({ remove })
  await ready()
  await user.keyboard('d')
  await user.keyboard('{Enter}')
  await user.keyboard('{Enter}')
  expect(remove).toHaveBeenCalledTimes(1)
  finish()
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
})

it('a 404 counts as already gone: the view closes and the caches are cleaned', async () => {
  const remove = vi.fn<Remove>().mockRejectedValue(new ApiError(404, 'DELETE /notes/x'))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const { user, onClose } = setup({ remove, client })
  await ready()
  await user.keyboard('d')
  await user.keyboard('{Enter}')
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  expect(invalidate).toHaveBeenCalledWith({ queryKey: NOTES_KEYS })
})

it('a 5xx leaves the note in the read view with one message and refreshes nothing', async () => {
  const remove = vi.fn<Remove>().mockRejectedValue(new ApiError(500, 'DELETE /notes/x'))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const { user, onClose } = setup({ remove, client })
  await ready()
  await user.keyboard('d')
  await user.keyboard('{Enter}')
  expect(await screen.findByRole('status')).toHaveTextContent(del.failed)
  expect(onClose).not.toHaveBeenCalled()
  expect(invalidate).not.toHaveBeenCalled()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ask Luis')
  expect(footer()).not.toHaveTextContent(del.prompt)
})

it('a 401 ends the session', async () => {
  const remove = vi.fn<Remove>().mockRejectedValue(new UnauthorizedError())
  const { user, onSessionExpired } = setup({ remove })
  await ready()
  await user.keyboard('d')
  await user.keyboard('{Enter}')
  await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1))
})

it('d typed in the edit form, or pressed in edit mode, does not open the confirm', async () => {
  const { user, remove } = setup()
  await ready()
  await user.keyboard('e')
  await user.click(await screen.findByLabelText(messages.note.edit.title))
  await user.keyboard('d')
  expect(screen.getByLabelText(messages.note.edit.title)).toHaveValue(
    'Ask Luis for the admin permissionsd',
  )
  screen.getByRole('button', { name: messages.note.edit.cancel }).focus()
  await user.keyboard('d')
  expect(footer()).not.toHaveTextContent(del.prompt)
  expect(remove).not.toHaveBeenCalled()
})

it('e in the confirm does nothing, and Enter in the read view does nothing', async () => {
  const { user, remove } = setup()
  await ready()
  await user.keyboard('{Enter}')
  expect(remove).not.toHaveBeenCalled()
  await user.keyboard('d')
  await user.keyboard('e')
  expect(footer()).toHaveTextContent(del.prompt)
  expect(screen.queryByLabelText(messages.note.edit.title)).not.toBeInTheDocument()
})

it('d does nothing in the All notes list', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const remove = vi.fn<Remove>().mockResolvedValue(undefined)
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={client}>
      <NotesContainer
        load={() =>
          Promise.resolve({
            now: new Date('2026-10-07T15:05:00.000Z'),
            timezone: 'America/Mexico_City',
            total: 1,
            notes: [
              {
                id: ID,
                title: 'Ask Luis',
                excerpt: '',
                tags: [],
                dueAt: null,
                doneAt: null,
              },
            ],
          })
        }
        onSessionExpired={() => undefined}
        onBack={() => undefined}
        onSignOut={() => undefined}
        noteId={null}
        loadNote={() => new Promise(() => undefined)}
        noteApi={{ save: () => Promise.reject(new Error('unexpected')), remove }}
        startInEdit={false}
        onOpenNote={() => undefined}
        onCloseNote={() => undefined}
      />
    </QueryClientProvider>,
  )
  await screen.findByText('Ask Luis')
  await user.keyboard('d')
  expect(screen.queryByText(del.prompt)).not.toBeInTheDocument()
  expect(remove).not.toHaveBeenCalled()
})

it('d is not a Today key', () => {
  for (const target of ['open', 'done', null] as const) {
    expect(reduceKey({ pending: null }, 'd', target).command).toBeNull()
  }
})

it('styles the confirm with tokens only, 44 px buttons, an ink focus ring and no vermilion [static]', () => {
  const css = readFileSync('src/features/note/StatuslineConfirm.module.css', 'utf8')
  expect(css).not.toMatch(/#[0-9a-f]{3,6}\b|--core-|font-size|--color-date/i)
  expect(css).not.toMatch(/(?<![\d.])(?!1px|2px)\d+px/)
  const owning = blocks(css).filter((block) =>
    block.header.split(',').some((header) => header.trim() === '.button'),
  )
  expect(owning.some((block) => /min-height:\s*var\(--size-target\)/.test(block.body))).toBe(true)
  expect(css).toMatch(/:focus-visible[^{]*\{[^}]*var\(--focus-ring\)/)
})
