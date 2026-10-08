import type { TodayResponse } from '@onti/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TodayContainer } from '../src/features/today/TodayContainer'
import type { DayView } from '../src/features/today/day-view'
import type { ReminderApi } from '../src/features/today/mutations/use-reminder-actions'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

afterEach(() => window.history.replaceState(null, '', '/'))

const never = () => new Promise<never>(() => undefined)
const reminders: ReminderApi = { snooze: never, done: never, undo: never, capture: never }

/** The server's page for each viewed day: the week of Jorge's fixture. */
const serve = (view: DayView) => Promise.resolve(c4Response(view.date ?? undefined))

function setup(load: (view: DayView) => Promise<TodayResponse> = serve) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const loader = vi.fn(load)
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={client}>
      <TodayContainer
        load={loader}
        onSessionExpired={() => undefined}
        onSignOut={() => undefined}
        syncTimezone={() => Promise.resolve()}
        reminders={reminders}
        browserTimeZone={() => 'America/Mexico_City'}
      />
    </QueryClientProvider>,
  )
  return { user, load: loader }
}

const heading = () => screen.findByRole('heading', { level: 1 })
const footer = () => screen.getByRole('contentinfo')
const dateColumn = () => screen.getByRole('complementary')

describe('] and [ walk the days', () => {
  it('] shows Thu 8: its date block, header, statusline and a time-only row', async () => {
    const { user } = setup()
    await heading()

    await user.keyboard(']')

    expect(await screen.findByRole('heading', { level: 1, name: '1 thing on Thu 8' })).toBeVisible()
    expect(window.location.search).toBe('?d=2026-10-08')
    expect(within(dateColumn()).getByText('8')).toBeInTheDocument()
    expect(within(dateColumn()).getByText('Thursday')).toBeInTheDocument()
    expect(footer()).toHaveTextContent('Thu 8')
    expect(footer()).toHaveTextContent('1 open · 15 notes')
    const row = screen.getByRole('listitem', { name: /^Prep demo/ })
    expect(row).toHaveTextContent('15:00')
    expect(row).not.toHaveTextContent(/\bin \d/)
  })

  it('[[ shows Tue 6 as R18: struck done row, no carried group, no now line, no late', async () => {
    const { user } = setup()
    await heading()

    await user.keyboard('[[')

    expect(
      await screen.findByRole('heading', { level: 1, name: '2 things on Tue 6' }),
    ).toBeVisible()
    expect(screen.getByRole('listitem', { name: /^Notify Ana.*done$/ })).toBeInTheDocument()
    expect(screen.queryByText(/Still open from/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^now \d/)).not.toBeInTheDocument()
    expect(screen.queryByText(/late/)).not.toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: /^Reply to Marta.*18:00, open$/ })).toBeVisible()
  })

  it('today keeps the carried group, the now line and the relative labels (control)', async () => {
    setup()
    await heading()

    expect(screen.getByText(/Still open from Tue 6/)).toBeInTheDocument()
    expect(screen.getByText('now 09:05')).toBeInTheDocument()
    expect(screen.getAllByText(/^late /).length).toBeGreaterThan(0)
  })

  it('a day with no notes reads "Nothing on Fri 9" while other notes exist', async () => {
    const { user } = setup()
    await heading()

    await user.keyboard(']]')

    expect(await screen.findByText(messages.day.nothing('Fri 9'))).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('0 things on Fri 9')
  })

  it('] past 2099-12-31 does nothing: no push, no request', async () => {
    window.history.replaceState(null, '', '/?d=2099-12-31')
    const { user, load } = setup()
    await heading()

    await user.keyboard(']')

    expect(window.location.search).toBe('?d=2099-12-31')
    expect(load).toHaveBeenCalledTimes(1)
  })
})

describe('t returns to today', () => {
  it('from another day, t drops ?d and shows today again', async () => {
    const { user } = setup()
    await heading()
    await user.keyboard(']')
    await screen.findByRole('heading', { level: 1, name: '1 thing on Thu 8' })

    await user.keyboard('t')

    expect(await screen.findByRole('heading', { level: 1, name: '4 things today' })).toBeVisible()
    expect(window.location.search).toBe('')
  })

  it('on today t does nothing and is not hinted', async () => {
    const { user } = setup()
    await heading()
    const before = window.history.length

    await user.keyboard('t')

    expect(window.history.length).toBe(before)
    expect(footer()).not.toHaveTextContent(messages.statusline.keys.today)
  })

  it('off today the statusline hints [ ] and t; on today it hints [ ] only', async () => {
    const { user } = setup()
    await heading()
    expect(footer()).toHaveTextContent(messages.statusline.keys.days)
    expect(footer()).not.toHaveTextContent(messages.statusline.keys.today)

    await user.keyboard(']')
    await screen.findByRole('heading', { level: 1, name: '1 thing on Thu 8' })

    expect(footer()).toHaveTextContent(messages.statusline.keys.today)
  })
})

describe('while the viewed day loads', () => {
  it('shows the requested day with a loading line, never the previous window, and blocks x', async () => {
    let release: (page: TodayResponse) => void = () => undefined
    const { user } = setup((view) =>
      view.date === null
        ? serve(view)
        : new Promise<TodayResponse>((resolve) => (release = resolve)),
    )
    await heading()

    await user.keyboard(']')

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      messages.day.loading('Thu 8'),
    )
    expect(within(dateColumn()).getByText('Thursday')).toBeInTheDocument()
    expect(footer()).toHaveTextContent('Thu 8')
    expect(footer()).not.toHaveTextContent('Wed 7')
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true')
    release(c4Response('2026-10-08'))
    await screen.findByRole('heading', { level: 1, name: '1 thing on Thu 8' })
    expect(screen.getByRole('main')).not.toHaveAttribute('aria-busy')
  })
})

describe('focus and announcements', () => {
  it('focus resets to the first row of the new day', async () => {
    const { user } = setup()
    await heading()
    await user.keyboard('jj')
    expect(screen.getByRole('listitem', { name: /^Update the estimate/ })).toHaveFocus()

    await user.keyboard('[[')

    await screen.findByRole('heading', { level: 1, name: '2 things on Tue 6' })
    await waitFor(() => expect(screen.getByRole('listitem', { name: /^Notify Ana/ })).toHaveFocus())
  })

  it('one polite live region, owned by the page, announces the viewed day', async () => {
    const { user } = setup()
    await heading()
    const regions = () => document.querySelectorAll('[aria-live="polite"]')
    expect(regions()).toHaveLength(1)
    expect(regions()[0]).toHaveTextContent('Wed 7, 4 things today')

    await user.keyboard(']')

    await waitFor(() => expect(regions()[0]).toHaveTextContent('Thu 8, 1 thing on Thu 8'))
    expect(regions()).toHaveLength(1)
  })

  it('the date block is aria-current=date on today only', async () => {
    const { user } = setup()
    await heading()
    expect(document.querySelector('[aria-current="date"]')).toHaveTextContent('Wednesday')

    await user.keyboard(']')
    await screen.findByRole('heading', { level: 1, name: '1 thing on Thu 8' })

    expect(document.querySelector('[aria-current="date"]')).toBeNull()
  })
})
