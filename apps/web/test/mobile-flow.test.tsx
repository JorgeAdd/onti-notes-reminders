import type { NoteResponse } from '@onti/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TodayContainer } from '../src/features/today/TodayContainer'
import type { ReminderApi } from '../src/features/today/mutations/use-reminder-actions'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

const SEND = 'Send rate-limit numbers to the infra team'
const MARTA = 'Reply to Marta about the staging deploy window'
const hang = () => new Promise<NoteResponse>(() => undefined)

function narrow(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

function setup() {
  const reminders: ReminderApi = {
    snooze: vi.fn(hang),
    done: vi.fn(hang),
    undo: vi.fn(hang),
    capture: vi.fn(hang),
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={client}>
      <TodayContainer
        load={() => Promise.resolve(c4Response())}
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

const row = (title: string) =>
  screen.getByRole('listitem', { name: (name) => name.startsWith(title) })

afterEach(() => vi.unstubAllGlobals())

describe('on a narrow screen', () => {
  it('shows one "+ Capture" button that opens the same bar with its presets', async () => {
    narrow(true)
    const { user } = setup()
    await screen.findByRole('heading', { level: 1 })

    await user.click(screen.getByRole('button', { name: messages.mobile.capture }))

    const input = await screen.findByRole('textbox', { name: messages.capture.label })
    await user.click(screen.getByRole('button', { name: messages.capture.presets.hour }))
    expect(input).toHaveValue('+1h ')
    // Chips come from the tags on the page (C4: Client A items), never from internal ids.
    expect(screen.getByRole('button', { name: '#client-a' })).toBeInTheDocument()
  })

  it('tapping a row opens the action sheet; Done and +1 h use the same actions as the keys', async () => {
    narrow(true)
    const { user, reminders } = setup()
    await screen.findByRole('heading', { level: 1 })

    await user.click(row(SEND))
    const sheet = screen.getByRole('dialog', { name: messages.actionSheet.label(SEND) })
    await user.click(within(sheet).getByRole('button', { name: messages.whichKey.hour('10:05') }))

    expect(reminders.snooze).toHaveBeenCalledWith(expect.any(String), 'hour')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Done in the sheet marks the tapped row done through the same action', async () => {
    narrow(true)
    const { user, reminders } = setup()
    await screen.findByRole('heading', { level: 1 })

    await user.click(row(MARTA))
    await user.click(screen.getByRole('button', { name: messages.actionSheet.done }))

    expect(reminders.done).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('the page keys sleep while the sheet is open', async () => {
    narrow(true)
    const { user, reminders } = setup()
    await screen.findByRole('heading', { level: 1 })
    await user.click(row(SEND))

    await user.keyboard('x')

    expect(reminders.done).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('on a wide screen', () => {
  it('has no mobile bar and a row click only focuses it', async () => {
    narrow(false)
    const { user } = setup()
    await screen.findByRole('heading', { level: 1 })

    await user.click(row(SEND))

    expect(screen.queryByRole('button', { name: messages.mobile.capture })).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(row(SEND)).toHaveFocus()
  })
})
