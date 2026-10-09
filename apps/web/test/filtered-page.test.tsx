import type { OtherItem } from '@onti/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DayPage } from '../src/features/today/DayPage'
import { OtherNotes } from '../src/features/today/OtherNotes'
import { TodayContainer } from '../src/features/today/TodayContainer'
import type { ReminderApi } from '../src/features/today/mutations/use-reminder-actions'
import { messages } from '../src/messages'
import { c8Response } from './today-fixture'

afterEach(() => window.history.replaceState(null, '', '/'))

const c8 = c8Response()
const others = (): OtherItem[] => c8.others

describe('C8 on the page: Thu 8 14:30, #client-b', () => {
  it('reads "5 notes" with the rail row and the four others below, 10 hidden', () => {
    render(<DayPage today={c8} now={c8.now} onSignOut={() => undefined} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('5 notes')
    expect(screen.getByRole('listitem', { name: /^Prep demo of search filters/ })).toBeVisible()
    const section = screen.getByRole('region', { name: messages.filter.others('client-b') })
    expect(within(section).getAllByRole('listitem')).toHaveLength(4)
    expect(within(screen.getByRole('complementary')).getByText('10 notes hidden')).toBeVisible()
    expect(screen.queryByText(/on the back of the pad/)).not.toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toHaveTextContent('FILTER · #client-b')
  })

  it('on a narrow screen the side note names the tag', () => {
    render(<DayPage today={c8} now={c8.now} mobile onSignOut={() => undefined} />)

    expect(screen.getByText('10 notes hidden · #client-b')).toBeVisible()
  })

  it('unfiltered, the mode stays NORMAL and there is no other-notes section (control)', () => {
    render(
      <DayPage
        today={{ ...c8, tag: null, others: [], hiddenCount: 0 }}
        now={c8.now}
        onSignOut={() => undefined}
      />,
    )

    expect(screen.getByRole('contentinfo')).toHaveTextContent('NORMAL')
    expect(screen.queryByRole('region', { name: /Other notes with/ })).not.toBeInTheDocument()
  })

  it('singular header and hidden count', () => {
    render(
      <DayPage
        today={{ ...c8, others: [], rail: c8.rail, hiddenCount: 1 }}
        now={c8.now}
        onSignOut={() => undefined}
      />,
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('1 note')
    expect(screen.getByText('1 note hidden')).toBeVisible()
  })
})

describe('OtherNotes · read-only rows', () => {
  const dated: OtherItem = {
    ...others()[0]!,
    title: 'Send the invoice',
    dueAt: new Date('2026-10-09T15:00:00.000Z'),
    originalDueAt: new Date('2026-10-09T15:00:00.000Z'),
  }

  it('undated rows show no date text; dated rows show their date and time', () => {
    render(<OtherNotes items={[dated, ...others()]} tag="client-b" timezone={c8.timezone} />)

    const undated = screen.getByRole('listitem', { name: /^API keys rotate every 90 days/ })
    expect(undated).toHaveTextContent(/^API keys rotate every 90 days#client-b$/)
    const row = screen.getByRole('listitem', { name: /^Send the invoice/ })
    expect(row).toHaveTextContent('Fri 9')
    expect(row).toHaveTextContent('09:00')
    expect(screen.queryByText(/no date/i)).not.toBeInTheDocument()
  })

  it('rows take no focus and have no actions', () => {
    render(<OtherNotes items={others()} tag="client-b" timezone={c8.timezone} />)

    for (const row of screen.getAllByRole('listitem')) expect(row).not.toHaveAttribute('tabindex')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('a note done on an earlier day is struck through', () => {
    const done = { ...dated, doneAt: new Date('2026-10-07T15:00:00.000Z') }
    render(<OtherNotes items={[done]} tag="client-b" timezone={c8.timezone} />)

    expect(screen.getByText('Send the invoice').closest('s')).not.toBeNull()
  })
})

describe('capture on a filtered view (R11: no tag injected)', () => {
  it('saves without the tag, says the filter hides it, and counts it hidden once', async () => {
    window.history.replaceState(null, '', '/?tag=client-b')
    const capture = vi.fn<ReminderApi['capture']>(() => new Promise(() => undefined))
    const never = () => new Promise<never>(() => undefined)
    const reminders: ReminderApi = { snooze: never, done: never, undo: never, capture }
    const user = userEvent.setup()
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <TodayContainer
          load={() => Promise.resolve(c8)}
          onSessionExpired={() => undefined}
          onSignOut={() => undefined}
          syncTimezone={() => Promise.resolve()}
          reminders={reminders}
          browserTimeZone={() => 'America/Mexico_City'}
        />
      </QueryClientProvider>,
    )
    await screen.findByRole('heading', { level: 1, name: '5 notes' })

    await user.keyboard('c')
    await user.type(await screen.findByRole('textbox'), 'Buy milk{Enter}')

    expect(capture).toHaveBeenCalledWith(expect.objectContaining({ title: 'Buy milk', tags: [] }))
    expect(await screen.findByText(messages.filter.hiddenNotice('client-b'))).toBeVisible()
    expect(screen.getByText('11 notes hidden')).toBeVisible()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('5 notes')
    // Never on the page, but R19's list ignores the filter: the new note joins it.
    expect(within(screen.getByRole('main')).queryByText('Buy milk')).not.toBeInTheDocument()
    expect(within(screen.getByRole('complementary')).getByText('Buy milk')).toBeVisible()
  })

  it('a capture that carries the active tag shows no notice', async () => {
    window.history.replaceState(null, '', '/?tag=client-b')
    const never = () => new Promise<never>(() => undefined)
    const reminders: ReminderApi = { snooze: never, done: never, undo: never, capture: never }
    const user = userEvent.setup()
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <TodayContainer
          load={() => Promise.resolve(c8)}
          onSessionExpired={() => undefined}
          onSignOut={() => undefined}
          syncTimezone={() => Promise.resolve()}
          reminders={reminders}
          browserTimeZone={() => 'America/Mexico_City'}
        />
      </QueryClientProvider>,
    )
    await screen.findByRole('heading', { level: 1, name: '5 notes' })

    await user.keyboard('c')
    await user.type(await screen.findByRole('textbox'), 'Call back #client-b{Enter}')

    expect(screen.queryByText(messages.filter.hiddenNotice('client-b'))).not.toBeInTheDocument()
    expect(screen.getByText('10 notes hidden')).toBeVisible()
  })
})
