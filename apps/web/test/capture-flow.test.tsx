import { applyReminderChange, type NoteResponse, type TodayResponse } from '@onti/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TodayContainer } from '../src/features/today/TodayContainer'
import type { ReminderApi } from '../src/features/today/mutations/use-reminder-actions'
import { ApiError } from '../src/lib/api'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

const NEW_ID = '99999999-9999-4999-8999-999999999999'
const CALL = 'Call back'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const saved = (patch: Partial<NoteResponse> = {}): NoteResponse => ({
  id: NEW_ID,
  title: CALL,
  tags: [{ name: 'Client A', slug: 'client-a' }],
  dueAt: new Date('2026-10-07T23:00:00.000Z'), // Wed 17:00 Mexico City
  originalDueAt: new Date('2026-10-07T23:00:00.000Z'),
  snoozeCount: 0,
  doneAt: null,
  createdAt: new Date('2026-10-07T15:05:00.000Z'),
  ...patch,
})

/** The server's page once it holds the note: what the refetch after the save returns. */
const serverPageWith = (note: NoteResponse) => {
  const today = c4Response()
  return applyReminderChange(today, { type: 'insert', note }, today.now)
}

function setup(
  capture: ReminderApi['capture'],
  load: () => Promise<TodayResponse> = () => Promise.resolve(c4Response()),
) {
  const reminders: ReminderApi = {
    snooze: vi.fn(),
    done: vi.fn(),
    undo: vi.fn(),
    capture,
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={client}>
      <TodayContainer
        load={load}
        onSessionExpired={() => undefined}
        onSignOut={() => undefined}
        syncTimezone={() => Promise.resolve()}
        reminders={reminders}
        browserTimeZone={() => 'America/Mexico_City'}
      />
    </QueryClientProvider>,
  )
  return { user, reminders }
}

const barInput = () => screen.findByRole('textbox', { name: messages.capture.label })
const footer = () => screen.getByRole('contentinfo')

async function openBar(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { level: 1 })
  await user.keyboard('c')
  return barInput()
}

describe('capture from the Today page', () => {
  it('hints c in the statusline and opens the lazy command bar on c', async () => {
    const { user } = setup(vi.fn())
    await screen.findByRole('heading', { level: 1 })
    expect(footer()).toHaveTextContent(messages.statusline.keys.capture)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

    await user.keyboard('c')

    expect(await barInput()).toHaveFocus()
  })

  it('the page keys sleep while the bar is open and esc closes it', async () => {
    const { user, reminders } = setup(vi.fn())
    const input = await openBar(user)

    await user.type(input, 'x')
    expect(reminders.done).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('↵ inserts a pending row at once, then swaps it for the server note (SG9)', async () => {
    const request = deferred<NoteResponse>()
    const capture = vi.fn(() => request.promise)
    let confirmed: NoteResponse | null = null
    const { user } = setup(capture, () =>
      Promise.resolve(confirmed ? serverPageWith(confirmed) : c4Response()),
    )
    const input = await openBar(user)

    await user.type(input, `${CALL} #client-a 17:00{Enter}`)

    expect(capture).toHaveBeenCalledWith({
      title: CALL,
      tags: ['client-a'],
      dueAt: new Date('2026-10-07T23:00:00.000Z'),
    })
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    const pendingRow = await screen.findByRole('listitem', {
      name: (name) => name.startsWith(CALL),
    })
    expect(pendingRow).toHaveAttribute('aria-busy', 'true')
    expect(pendingRow).toHaveAttribute('data-pending', 'true')

    confirmed = saved()
    request.resolve(confirmed)

    await waitFor(() =>
      expect(
        screen.getByRole('listitem', { name: (name) => name.startsWith(CALL) }),
      ).not.toHaveAttribute('aria-busy'),
    )
    const row = screen.getByRole('listitem', { name: (name) => name.startsWith(CALL) })
    expect(row).not.toHaveAttribute('data-pending')
    expect(screen.getAllByText(CALL)).toHaveLength(1)
  })

  it('a pending row ignores done and snooze keys (it has no server id yet)', async () => {
    const { user, reminders } = setup(() => new Promise<NoteResponse>(() => undefined))
    const input = await openBar(user)
    await user.type(input, `${CALL} 17:00{Enter}`)

    await user.click(screen.getByRole('listitem', { name: (name) => name.startsWith(CALL) }))
    await user.keyboard('xsh')

    expect(reminders.done).not.toHaveBeenCalled()
    expect(reminders.snooze).not.toHaveBeenCalled()
  })

  it('a capture without a time is a plain note: no day row, it joins "Without a reminder" (C14)', async () => {
    const request = deferred<NoteResponse>()
    const { user } = setup(vi.fn(() => request.promise))
    const input = await openBar(user)
    expect(footer()).toHaveTextContent(/15 notes/)

    await user.type(input, `${CALL}{Enter}`)

    expect(
      screen.queryByRole('listitem', { name: (name) => name.startsWith(CALL) }),
    ).not.toBeInTheDocument()
    expect(footer()).toHaveTextContent(/16 notes/)
    expect(
      within(screen.getByRole('region', { name: messages.undated.header(10) })).getByText(CALL),
    ).toBeInTheDocument()
    request.resolve(saved({ dueAt: null, originalDueAt: null, tags: [] }))
    await waitFor(() => expect(footer()).toHaveTextContent(/16 notes/))
  })

  it('C14: "Export format questions #client-b": new note first, 10, "+ 2 more", equal after settling', async () => {
    const TITLE = 'Export format questions'
    const request = deferred<NoteResponse>()
    let confirmed: NoteResponse | null = null
    const { user } = setup(
      vi.fn(() => request.promise),
      () => Promise.resolve(confirmed ? serverPageWith(confirmed) : c4Response()),
    )
    const input = await openBar(user)
    expect(screen.getByRole('region', { name: messages.undated.header(9) })).toBeInTheDocument()

    await user.type(input, `${TITLE} #client-b{Enter}`)

    const pending = screen.getByRole('region', { name: messages.undated.header(10) })
    const titles = () =>
      within(pending)
        .getAllByRole('listitem')
        .map((row) => row.querySelector('button')?.firstElementChild?.textContent)
    expect(titles()).toEqual([
      TITLE,
      '1:1 with manager: topics',
      'API keys rotate every 90 days',
      'Diego prefers async updates on Slack',
      'Domain glossary',
      'PR review checklist',
      'Read: Postgres partial indexes',
      'Review agenda: search, exports, roles',
    ])
    expect(within(pending).getByRole('button', { name: '+ 2 more' })).toBeInTheDocument()
    expect(screen.getByText(messages.today.otherNotes(12))).toBeInTheDocument()

    confirmed = saved({
      title: TITLE,
      dueAt: null,
      originalDueAt: null,
      tags: [{ name: 'Client B', slug: 'client-b' }],
      createdAt: new Date('2026-10-07T15:05:30.000Z'),
    })
    request.resolve(confirmed)

    await waitFor(() =>
      expect(screen.getByRole('region', { name: messages.undated.header(10) })).toBeInTheDocument(),
    )
    expect(titles()[0]).toBe(TITLE)
    expect(titles()).toHaveLength(8)
    expect(within(pending).getByRole('button', { name: '+ 2 more' })).toBeInTheDocument()
  })

  it('a failed capture without a time rolls the list and the count back', async () => {
    const request = deferred<NoteResponse>()
    const { user } = setup(vi.fn(() => request.promise))
    const input = await openBar(user)
    await user.type(input, `Export format questions #client-b{Enter}`)
    expect(screen.getByRole('region', { name: messages.undated.header(10) })).toBeInTheDocument()

    request.reject(new ApiError(500, 'POST /notes'))

    await barInput()
    const region = screen.getByRole('region', { name: messages.undated.header(9) })
    expect(within(region).queryByText('Export format questions')).not.toBeInTheDocument()
    expect(within(region).getByRole('button', { name: '+ 1 more' })).toBeInTheDocument()
  })

  it('a failed capture removes the row and reopens the bar with the text and one line', async () => {
    const request = deferred<NoteResponse>()
    const { user } = setup(vi.fn(() => request.promise))
    const input = await openBar(user)
    await user.type(input, `${CALL} #client-a 17:00{Enter}`)
    expect(await screen.findByText(CALL)).toBeInTheDocument()

    request.reject(new ApiError(500, 'POST /notes'))

    const reopened = await barInput()
    expect(reopened).toHaveValue(`${CALL} #client-a 17:00`)
    expect(
      within(screen.getByRole('status')).getByText(messages.errors.captureFailed(CALL)),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('listitem', { name: (name) => name.startsWith(CALL) }),
    ).not.toBeInTheDocument()
  })
})
