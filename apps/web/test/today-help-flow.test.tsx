import {
  buildDayResponse,
  selectUndated,
  summarizeTags,
  type NoteResponse,
  type TodayResponse,
} from '@onti/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotesContainer } from '../src/features/notes/NotesContainer'
import type { ReminderApi } from '../src/features/today/mutations/use-reminder-actions'
import { TodayContainer } from '../src/features/today/TodayContainer'
import { messages } from '../src/messages'
import { c4Response, c8Response } from './today-fixture'

const SEND = 'Send rate-limit numbers to the infra team'
const pending = () => new Promise<NoteResponse>(() => undefined)

afterEach(() => {
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

function narrow(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

function setup(today: TodayResponse = c4Response(), { mobile = false } = {}) {
  narrow(mobile)
  const reminders: ReminderApi = {
    snooze: vi.fn(pending),
    done: vi.fn(pending),
    undo: vi.fn(pending),
    capture: vi.fn(pending),
  }
  const onOpenSearch = vi.fn()
  const onOpenNote = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={client}>
      <TodayContainer
        load={() => Promise.resolve(today)}
        onSessionExpired={() => undefined}
        onSignOut={() => undefined}
        syncTimezone={() => Promise.resolve()}
        reminders={reminders}
        onOpenSearch={onOpenSearch}
        onOpenNote={onOpenNote}
        browserTimeZone={() => 'America/Mexico_City'}
      />
    </QueryClientProvider>,
  )
  return { user, reminders, onOpenSearch, onOpenNote }
}

const emptyDay = () =>
  buildDayResponse({
    notes: [],
    now: c4Response().now,
    timezone: c4Response().timezone,
    tag: null,
    hiddenCount: 0,
    tags: summarizeTags([]),
    undated: selectUndated([]),
  })

const ready = () => screen.findByRole('heading', { level: 1 })
const helpButton = () => screen.getByRole('button', { name: messages.help.open })
const dialog = () => screen.findByRole('dialog', { name: messages.help.title })
const row = (title: string) =>
  screen.getByRole('listitem', { name: (name) => name.startsWith(title) })

describe('opening help', () => {
  it('never opens on its own, with or without notes', async () => {
    setup()
    await ready()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('never opens on its own on an empty account either', async () => {
    const empty = emptyDay()
    setup(empty)
    await ready()
    expect(screen.getByText(messages.help.emptyHint)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the touch hint on a phone', async () => {
    const empty = emptyDay()
    setup(empty, { mobile: true })
    await ready()
    expect(screen.getByText(messages.help.emptyHintTouch)).toBeInTheDocument()
    expect(screen.queryByText(messages.help.emptyHint)).not.toBeInTheDocument()
  })

  it('opens on ?, and ? while open keeps one dialog', async () => {
    const { user } = setup()
    await ready()
    await user.keyboard('?')
    await dialog()
    await user.keyboard('?')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('opens from the statusline button and esc gives focus back to it', async () => {
    const { user } = setup()
    await ready()
    await user.click(helpButton())
    await dialog()
    expect(screen.getByRole('button', { name: messages.help.close })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(helpButton()).toHaveFocus()
  })

  it('opened with ? from a focused row, esc gives focus back to that row', async () => {
    const { user } = setup()
    await ready()
    await user.click(row(SEND))
    expect(row(SEND)).toHaveFocus()
    await user.keyboard('?')
    await dialog()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(row(SEND)).toHaveFocus()
  })

  it('does not open when ? is typed in the capture bar', async () => {
    const { user } = setup()
    await ready()
    await user.keyboard('c')
    const input = await screen.findByRole('textbox', { name: messages.capture.label })
    await user.type(input, 'what?')
    expect(input).toHaveValue('what?')
    expect(screen.queryByRole('dialog', { name: messages.help.title })).not.toBeInTheDocument()
  })
})

describe('page keys while help is open', () => {
  it('are inert, and wake up when it closes', async () => {
    const { user, reminders, onOpenSearch, onOpenNote } = setup(c4Response(), { mobile: false })
    await ready()
    await user.click(row(SEND))
    await user.keyboard('?')
    await dialog()

    await user.keyboard('c')
    await user.keyboard('#')
    await user.keyboard('/')
    await user.keyboard('[[')
    await user.keyboard(']')
    await user.keyboard('j')
    await user.keyboard('x')
    await user.keyboard('s')
    await user.keyboard('e')

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: messages.filter.label })).not.toBeInTheDocument()
    expect(onOpenSearch).not.toHaveBeenCalled()
    expect(onOpenNote).not.toHaveBeenCalled()
    expect(reminders.done).not.toHaveBeenCalled()
    expect(window.location.search).toBe('')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)

    await user.keyboard('{Escape}')
    await user.keyboard('x')
    expect(reminders.done).toHaveBeenCalledTimes(1)
  })

  it('leave / and its hint off while open', async () => {
    const { user, onOpenSearch } = setup()
    await ready()
    await user.keyboard('?')
    await dialog()
    expect(screen.getByRole('contentinfo')).not.toHaveTextContent(messages.statusline.keys.search)
    await user.keyboard('{Escape}')
    expect(screen.getByRole('contentinfo')).toHaveTextContent(messages.statusline.keys.search)
    await user.keyboard('/')
    expect(onOpenSearch).toHaveBeenCalledTimes(1)
  })

  it('esc closes help without clearing the tag filter; the next esc clears it', async () => {
    window.history.replaceState(null, '', '/?tag=client-b')
    const { user } = setup(c8Response())
    await ready()
    await user.click(helpButton())
    await dialog()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(window.location.search).toBe('?tag=client-b')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('FILTER · #client-b')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(window.location.search).toBe(''))
  })
})

describe('on a phone', () => {
  it('replaces the bars in the dock while open and restores them on close', async () => {
    const { user } = setup(c4Response(), { mobile: true })
    await ready()
    const capture = () => screen.queryByRole('button', { name: messages.mobile.capture })
    expect(capture()).toBeInTheDocument()

    await user.click(helpButton())
    const sheet = await dialog()
    expect(screen.getByTestId('dock')).toContainElement(sheet)
    expect(capture()).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: messages.mobile.search })).not.toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(sheet).toHaveTextContent(messages.mobile.capture)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(capture()).toBeInTheDocument()
    expect(helpButton()).toHaveFocus()
  })

  it('a tap outside the sheet closes it and never opens a row sheet', async () => {
    const { user } = setup(c4Response(), { mobile: true })
    await ready()
    await user.click(helpButton())
    await dialog()
    await user.click(screen.getByTestId('help-backdrop'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('out of scope views', () => {
  it('All notes has no ? key and no help button', async () => {
    narrow(false)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <NotesContainer
          load={() =>
            Promise.resolve({
              now: new Date('2026-10-07T15:05:00.000Z'),
              timezone: 'America/Mexico_City',
              total: 0,
              notes: [],
            })
          }
          onSessionExpired={() => undefined}
          onBack={() => undefined}
          onSignOut={() => undefined}
          noteId={null}
          loadNote={() => new Promise(() => undefined)}
          noteApi={{
            save: () => Promise.reject(new Error('unexpected save')),
            remove: () => Promise.reject(new Error('unexpected delete')),
          }}
          startInEdit={false}
          onOpenNote={() => undefined}
          onCloseNote={() => undefined}
        />
      </QueryClientProvider>,
    )
    await screen.findByRole('heading', { level: 1 })
    const user = userEvent.setup()
    await user.keyboard('{Escape}?')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: messages.help.open })).not.toBeInTheDocument()
  })

  it('the notes and note features do not reference help [static]', () => {
    for (const dir of ['notes', 'note']) {
      const base = join(__dirname, '..', 'src', 'features', dir)
      for (const file of readdirSync(base).filter((f) => /\.tsx?$/.test(f)))
        expect(readFileSync(join(base, file), 'utf8')).not.toMatch(/help/i)
    }
  })
})
