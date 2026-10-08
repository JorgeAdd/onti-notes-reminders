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

afterEach(() => {
  window.history.replaceState(null, '', '/')
  vi.unstubAllGlobals()
})

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

describe('mobile controls', () => {
  const narrow = () =>
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }))
  const today = () => screen.queryByRole('button', { name: messages.day.today })

  it('shows named ‹ › on today, steps with them, and Today returns then hides', async () => {
    narrow()
    const { user } = setup()
    await heading()
    expect(screen.getByRole('button', { name: messages.day.prev })).toHaveTextContent('‹')
    expect(screen.getByRole('button', { name: messages.day.next })).toHaveTextContent('›')
    expect(today()).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: messages.day.next }))
    await screen.findByRole('heading', { level: 1, name: '1 thing on Thu 8' })
    expect(today()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: messages.day.next }))
    await screen.findByRole('heading', { level: 1, name: /Fri 9/ })
    await user.click(screen.getByRole('button', { name: messages.day.prev }))
    await screen.findByRole('heading', { level: 1, name: '1 thing on Thu 8' })

    await user.click(today()!)

    expect(await screen.findByRole('heading', { level: 1, name: '4 things today' })).toBeVisible()
    expect(window.location.search).toBe('')
    expect(today()).not.toBeInTheDocument()
  })
})

describe('partial scenarios', () => {
  it('rapid ]]: a late superseded response is discarded; the page shows the last day', async () => {
    const pending: Record<string, (page: TodayResponse) => void> = {}
    const { user } = setup((view) =>
      view.date === null
        ? serve(view)
        : new Promise<TodayResponse>((resolve) => (pending[view.date!] = resolve)),
    )
    await heading()

    await user.keyboard(']]')
    await waitFor(() => expect(Object.keys(pending)).toHaveLength(2))
    pending['2026-10-09']!(c4Response('2026-10-09'))
    await screen.findByText(messages.day.nothing('Fri 9'))
    pending['2026-10-08']!(c4Response('2026-10-08'))

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('0 things on Fri 9')
    expect(window.location.search).toBe('?d=2026-10-09')
  })

  it('a 5xx on a stepped day shows the error with retry, and retry loads the day', async () => {
    let failed = false
    const { user } = setup((view) => {
      if (view.date === '2026-10-08' && !failed) {
        failed = true
        return Promise.reject(new Error('GET /today failed with 500'))
      }
      return serve(view)
    })
    await heading()

    await user.keyboard(']')
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.today.loadError)
    await user.click(screen.getByRole('button', { name: messages.today.retry }))

    expect(await screen.findByRole('heading', { level: 1, name: '1 thing on Thu 8' })).toBeVisible()
  })
})
