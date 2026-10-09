/** note-editing [PR2] · edit mode in the note view: fields, save payload, validation, cache. */
import { NOTE_LIMITS, type NoteDetailResponse, type NoteUpdateRequest } from '@onti/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DAY_KEYS } from '../src/features/today/day-view'
import { NoteContainer } from '../src/features/note/NoteContainer'
import { noteKey, NOTES_KEYS } from '../src/features/note/query-keys'
import { ApiError, UnauthorizedError } from '../src/lib/api'
import { messages } from '../src/messages'
import { blocks } from './css-tokens'

afterEach(() => vi.restoreAllMocks())

const ID = '00000000-0000-4000-8000-000000000001'
const NOW = new Date('2026-10-07T15:05:00.000Z') // Wed 7 09:05 in Mexico City
const detail = (over: Partial<NoteDetailResponse['note']> = {}): NoteDetailResponse => ({
  now: NOW,
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
    body: 'Ana needs **admin** access',
    ...over,
  },
})
const saved = (over: Partial<NoteDetailResponse['note']>) => detail(over)

type Save = (id: string, patch: NoteUpdateRequest) => Promise<NoteDetailResponse>
type Load = (id: string) => Promise<NoteDetailResponse>

function setup({
  note = detail(),
  load = vi.fn<Load>(() => Promise.resolve(note)),
  save = vi.fn<Save>().mockImplementation(() => Promise.resolve(saved({ title: 'Saved' }))),
  startInEdit = false,
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
} = {}) {
  const onClose = vi.fn()
  const onSessionExpired = vi.fn()
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={client}>
      <NoteContainer
        id={ID}
        load={load}
        api={{ save }}
        startInEdit={startInEdit}
        onClose={onClose}
        onSessionExpired={onSessionExpired}
        onSignOut={() => undefined}
      />
    </QueryClientProvider>,
  )
  return { user, save, load, client, onClose, onSessionExpired }
}

const edit = messages.note.edit
const titleField = () => screen.getByLabelText(edit.title)
const bodyField = () => screen.getByLabelText(edit.body)
const tagsField = () => screen.getByLabelText(edit.tags)
const reminderField = () => screen.getByLabelText(edit.reminder)
const saveButton = () => screen.getByRole('button', { name: edit.save })
const footer = () => screen.getByRole('contentinfo')
const openEdit = async (user: ReturnType<typeof userEvent.setup>) => {
  await screen.findByRole('heading', { level: 1 })
  await user.keyboard('e')
  await screen.findByLabelText(edit.title)
}
const replace = (field: HTMLElement, value: string) =>
  fireEvent.change(field, { target: { value } })

it('e opens edit mode with the raw markdown, the tags and the current reminder filled in', async () => {
  const { user } = setup()
  await openEdit(user)
  expect(titleField()).toHaveValue('Ask Luis for the admin permissions')
  expect(bodyField()).toHaveValue('Ana needs **admin** access')
  expect(tagsField()).toHaveValue('#client-a')
  expect(reminderField()).toHaveValue('')
  expect(screen.getByText(edit.current('Wed 7 17:00'))).toBeInTheDocument()
})

it('the Edit button opens it too (the only way on touch)', async () => {
  const { user } = setup()
  await screen.findByRole('heading', { level: 1 })
  await user.click(screen.getByRole('button', { name: edit.open }))
  expect(await screen.findByLabelText(edit.title)).toBeInTheDocument()
})

it('opens straight into edit mode when asked (e on a Today row)', async () => {
  setup({ startInEdit: true })
  expect(await screen.findByLabelText(edit.title)).toHaveFocus()
})

it('focuses the title on entry and shows EDIT with esc cancel in the statusline', async () => {
  const { user } = setup()
  await screen.findByRole('heading', { level: 1 })
  expect(footer()).toHaveTextContent(messages.note.hints.edit)
  await user.keyboard('e')
  expect(await screen.findByLabelText(edit.title)).toHaveFocus()
  expect(footer()).toHaveTextContent(edit.statusHead)
  expect(footer()).toHaveTextContent(edit.hints.cancel)
  expect(footer()).not.toHaveTextContent(messages.note.hints.edit)
})

it('typing e in a field inserts the letter and changes no mode', async () => {
  const { user } = setup()
  await openEdit(user)
  await user.click(titleField())
  await user.keyboard('e')
  expect(titleField()).toHaveValue('Ask Luis for the admin permissionse')
  expect(screen.getByLabelText(edit.title)).toBeInTheDocument()
  await user.click(bodyField())
  await user.keyboard('e')
  expect(bodyField()).toHaveValue('Ana needs **admin** accesse')
})

it('Save sends one patch with ONLY the changed fields, then shows the result in the read view', async () => {
  const { user, save } = setup()
  await openEdit(user)
  replace(titleField(), '  Saved  ')
  await user.click(saveButton())
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
  expect(save).toHaveBeenCalledWith(ID, { title: 'Saved' })
  const heading = await screen.findByRole('heading', { level: 1 })
  expect(heading).toHaveTextContent('Saved')
  expect(screen.queryByLabelText(edit.title)).not.toBeInTheDocument()
  expect(heading).toHaveFocus()
})

it('sends the body only when it changed, and an empty body is a valid edit (R20)', async () => {
  const { user, save } = setup()
  await openEdit(user)
  replace(bodyField(), '')
  await user.click(saveButton())
  await waitFor(() => expect(save).toHaveBeenCalledWith(ID, { body: '' }))
})

it('sends all four changes in one patch', async () => {
  const { user, save } = setup()
  await openEdit(user)
  replace(titleField(), 'Two')
  replace(bodyField(), 'text')
  replace(tagsField(), '#client-b ideas')
  replace(reminderField(), 'tomorrow 9:00')
  await user.click(saveButton())
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
  expect(save).toHaveBeenCalledWith(ID, {
    title: 'Two',
    body: 'text',
    tags: ['client-b', 'ideas'],
    dueAt: new Date('2026-10-08T15:00:00.000Z'),
  })
})

it('nothing changed: Save sends no request and returns to the read view', async () => {
  const { user, save } = setup()
  await openEdit(user)
  await user.click(saveButton())
  expect(save).not.toHaveBeenCalled()
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
    'Ask Luis for the admin permissions',
  )
  expect(screen.queryByLabelText(edit.title)).not.toBeInTheDocument()
})

it('tags: same set in another case or order is not a change; clearing sends an empty list', async () => {
  const { user, save } = setup({
    note: detail({
      tags: [
        { name: 'Client A', slug: 'client-a' },
        { name: 'Ideas', slug: 'ideas' },
      ],
    }),
  })
  await openEdit(user)
  replace(tagsField(), 'IDEAS #client-a')
  await user.click(saveButton())
  expect(save).not.toHaveBeenCalled()
  await user.keyboard('e')
  replace(await screen.findByLabelText(edit.tags), '')
  await user.click(saveButton())
  await waitFor(() => expect(save).toHaveBeenCalledWith(ID, { tags: [] }))
})

it.each([
  ['a blank title', () => replace(titleField(), '   '), edit.errors.titleRequired],
  [
    'a title over the limit',
    () => replace(titleField(), 'x'.repeat(201)),
    edit.errors.titleTooLong(200),
  ],
  [
    'a body over the limit',
    () => replace(bodyField(), 'x'.repeat(NOTE_LIMITS.bodyMax + 1)),
    edit.errors.bodyTooLong(NOTE_LIMITS.bodyMax),
  ],
  ['a bad tag', () => replace(tagsField(), '#ok #bad_tag'), edit.errors.tagsInvalid],
  [
    'too many tags',
    () => replace(tagsField(), Array.from({ length: 11 }, (_v, i) => `#t${i}`).join(' ')),
    edit.errors.tagsTooMany(10),
  ],
  [
    'a time nobody can read',
    () => replace(reminderField(), 'soonish'),
    edit.errors.reminderUnclear,
  ],
])('blocks Save on %s with an inline message and sends nothing', async (_label, act, message) => {
  const { user, save } = setup()
  await openEdit(user)
  act()
  await user.click(saveButton())
  expect(await screen.findByRole('alert')).toHaveTextContent(message)
  expect(save).not.toHaveBeenCalled()
  expect(screen.getByLabelText(edit.title)).toBeInTheDocument()
})

it('a blocked field is marked invalid, and fixing it clears the message', async () => {
  const { user } = setup()
  await openEdit(user)
  replace(titleField(), '')
  await user.click(saveButton())
  expect(titleField()).toHaveAttribute('aria-invalid', 'true')
  replace(titleField(), 'Back again')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(titleField()).not.toHaveAttribute('aria-invalid', 'true')
})

it('Save is a button only: Enter in a field and ctrl+Enter send nothing (SG20)', async () => {
  const { user, save } = setup()
  await openEdit(user)
  replace(titleField(), 'Changed')
  await user.click(titleField())
  await user.keyboard('{Enter}')
  await user.keyboard('{Control>}{Enter}{/Control}')
  expect(save).not.toHaveBeenCalled()
  expect(screen.getByLabelText(edit.title)).toBeInTheDocument()
})

it('esc discards the edits: no request, the read view shows the old values', async () => {
  const { user, save } = setup()
  await openEdit(user)
  replace(titleField(), 'Typed but discarded')
  await user.click(titleField())
  await user.keyboard('{Escape}')
  expect(save).not.toHaveBeenCalled()
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
    'Ask Luis for the admin permissions',
  )
  // Reopening starts from the stored values again.
  await user.keyboard('e')
  expect(await screen.findByLabelText(edit.title)).toHaveValue('Ask Luis for the admin permissions')
})

it('esc from a button inside the form cancels once and does not close the note view', async () => {
  const { user, onClose } = setup()
  await openEdit(user)
  saveButton().focus()
  await user.keyboard('{Escape}')
  expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
  expect(onClose).not.toHaveBeenCalled()
})

it('Cancel does the same as esc', async () => {
  const { user, save } = setup()
  await openEdit(user)
  replace(titleField(), 'Typed but discarded')
  await user.click(screen.getByRole('button', { name: edit.cancel }))
  expect(save).not.toHaveBeenCalled()
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Ask Luis')
})

it('while saving, Save is disabled and a second click sends nothing more', async () => {
  let finish: (value: NoteDetailResponse) => void = () => undefined
  const save = vi.fn<Save>().mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const { user } = setup({ save })
  await openEdit(user)
  replace(titleField(), 'Slow')
  await user.click(saveButton())
  await waitFor(() => expect(saveButton()).toBeDisabled())
  await user.click(saveButton())
  expect(save).toHaveBeenCalledTimes(1)
  finish(saved({ title: 'Slow' }))
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Slow')
})

it('a 5xx keeps the typed values in edit mode with ONE message, and Save works again', async () => {
  const save = vi
    .fn<Save>()
    .mockRejectedValueOnce(new ApiError(500, 'PATCH /notes/x'))
    .mockResolvedValue(saved({ title: 'Second try' }))
  const { user } = setup({ save })
  await openEdit(user)
  replace(titleField(), 'Second try')
  replace(bodyField(), 'kept body')
  await user.click(saveButton())
  expect(await screen.findByRole('status')).toHaveTextContent(edit.saveFailed)
  expect(screen.getAllByRole('status')).toHaveLength(1)
  expect(titleField()).toHaveValue('Second try')
  expect(bodyField()).toHaveValue('kept body')
  expect(saveButton()).toBeEnabled()
  await user.click(saveButton())
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Second try')
})

it('a 401 ends the session', async () => {
  const save = vi.fn<Save>().mockRejectedValue(new UnauthorizedError())
  const { user, onSessionExpired } = setup({ save })
  await openEdit(user)
  replace(titleField(), 'Changed')
  await user.click(saveButton())
  await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1))
})

it('a 404 on save reloads the note and shows the calm not-found state', async () => {
  const save = vi.fn<Save>().mockRejectedValue(new ApiError(404, 'PATCH /notes/x'))
  const load = vi
    .fn<Load>(() => Promise.resolve(detail()))
    .mockResolvedValueOnce(detail())
    .mockRejectedValue(new ApiError(404, 'GET /notes/x'))
  const { user } = setup({ save, load })
  await openEdit(user)
  replace(titleField(), 'Changed')
  await user.click(saveButton())
  expect(await screen.findByText(messages.note.notFound)).toBeInTheDocument()
})

describe('reminder field', () => {
  it('shows the SG5 preview for a typed time, from the shared grammar', async () => {
    const { user } = setup()
    await openEdit(user)
    expect(screen.queryByText(/^→/)).not.toBeInTheDocument()
    await user.type(reminderField(), 'tomorrow 9:00')
    expect(screen.getByText(/^→ tomorrow 09:00 · in /)).toBeInTheDocument()
  })

  it('offers the three capture presets, with no tag chips, that fill the field', async () => {
    const { user } = setup()
    await openEdit(user)
    const names = screen
      .getAllByRole('button')
      .map((b) => b.textContent)
      .filter((text) => text !== null)
    expect(names).toEqual(
      expect.arrayContaining([
        messages.capture.presets.today,
        messages.capture.presets.hour,
        messages.capture.presets.tomorrow,
      ]),
    )
    expect(names.some((name) => name.startsWith('#'))).toBe(false)
    await user.click(screen.getByRole('button', { name: messages.capture.presets.hour }))
    expect(reminderField()).toHaveValue('+1h')
    expect(screen.getByText(/^→ today 10:05 · in 1 h/)).toBeInTheDocument()
  })

  it('an empty reminder field leaves the reminder unchanged', async () => {
    const { user, save } = setup()
    await openEdit(user)
    replace(titleField(), 'Only the title')
    await user.click(saveButton())
    await waitFor(() => expect(save).toHaveBeenCalledWith(ID, { title: 'Only the title' }))
  })

  it('Remove reminder sends dueAt null, and is offered only when the note has one', async () => {
    const { user, save } = setup()
    await openEdit(user)
    await user.click(screen.getByRole('button', { name: edit.removeReminder }))
    expect(screen.getByText(edit.willRemove)).toBeInTheDocument()
    await user.click(saveButton())
    await waitFor(() => expect(save).toHaveBeenCalledWith(ID, { dueAt: null }))
  })

  it('typing a time after Remove takes the removal back', async () => {
    const { user, save } = setup()
    await openEdit(user)
    await user.click(screen.getByRole('button', { name: edit.removeReminder }))
    await user.type(reminderField(), '+1h')
    expect(screen.queryByText(edit.willRemove)).not.toBeInTheDocument()
    await user.click(saveButton())
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(ID, { dueAt: new Date('2026-10-07T16:05:00.000Z') }),
    )
  })

  it('a note without a reminder says so and has no Remove button', async () => {
    const { user } = setup({ note: detail({ dueAt: null, originalDueAt: null }) })
    await openEdit(user)
    expect(screen.getByText(edit.current(messages.note.noReminder))).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: edit.removeReminder })).not.toBeInTheDocument()
  })
})

it('after a save the note, the list and the day caches are refreshed (spec: consistency)', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const setData = vi.spyOn(client, 'setQueryData')
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const remove = vi.spyOn(client, 'removeQueries')
  const { user } = setup({ client })
  await openEdit(user)
  replace(titleField(), 'Saved')
  await user.click(saveButton())
  await screen.findByText('Saved')
  expect(setData).toHaveBeenCalledWith(noteKey(ID), saved({ title: 'Saved' }))
  expect(invalidate).toHaveBeenCalledWith({ queryKey: NOTES_KEYS })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: DAY_KEYS })
  expect(remove).toHaveBeenCalledWith({ queryKey: DAY_KEYS, type: 'inactive' })
})

it('a failed save refreshes nothing', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const save = vi.fn<Save>().mockRejectedValue(new ApiError(500, 'PATCH'))
  const { user } = setup({ client, save })
  await openEdit(user)
  replace(titleField(), 'Saved')
  await user.click(saveButton())
  await screen.findByRole('status')
  expect(invalidate).not.toHaveBeenCalled()
})

it('styles the edit form with tokens only, 44 px targets, an ink focus ring and no vermilion [static]', () => {
  const css = readFileSync('src/features/note/NoteEditForm.module.css', 'utf8')
  expect(css).not.toMatch(/#[0-9a-f]{3,6}\b|--core-|font-size|--color-date/i)
  expect(css).not.toMatch(/(?<![\d.])(?!1px|2px)\d+px/)
  const rules = blocks(css)
  for (const selector of ['.input', '.button']) {
    const owning = rules.filter((block) =>
      block.header.split(',').some((header) => header.trim() === selector),
    )
    expect(
      owning.some((block) => /min-height:\s*var\(--size-target\)/.test(block.body)),
      selector,
    ).toBe(true)
  }
  expect(css).toMatch(/:focus-visible[^{]*\{[^}]*var\(--focus-ring\)/)
})
