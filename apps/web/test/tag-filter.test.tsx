import type { TodayResponse } from '@onti/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { TodayContainer } from '../src/features/today/TodayContainer'
import type { DayView } from '../src/features/today/day-view'
import type { ReminderApi } from '../src/features/today/mutations/use-reminder-actions'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

afterEach(() => window.history.replaceState(null, '', '/'))

const never = () => new Promise<never>(() => undefined)
const reminders: ReminderApi = { snooze: never, done: never, undo: never, capture: never }

/** The page the server would send for the view; the filter itself is the server's job. */
const serve =
  (patch: Partial<TodayResponse> = {}) =>
  (view: DayView) =>
    Promise.resolve({ ...c4Response(view.date ?? undefined), ...patch, tag: view.tag })

function setup(load = serve()) {
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

const ready = () => screen.findByRole('heading', { level: 1 })
const bar = () => screen.findByRole('group', { name: messages.filter.label })
const chip = (slug: string) => screen.getByRole('button', { name: `#${slug}` })
const footer = () => screen.getByRole('contentinfo')
const params = () => new URLSearchParams(window.location.search)

it('# opens the lazy bar in the dock with every tag of the account, focus inside it', async () => {
  const { user } = setup()
  await ready()

  await user.keyboard('#')

  const group = await bar()
  expect(screen.getByTestId('dock')).toContainElement(group)
  expect(
    within(group)
      .getAllByRole('button')
      .map((b) => b.textContent),
  ).toEqual(['#client-a', '#client-b', '#client-c', '#personal'])
  expect(group).toHaveFocus()
  expect(chip('client-a')).toHaveAttribute('aria-current', 'true')
})

it('Tab and Shift+Tab cycle the highlighted tag with wrap, ↵ applies it as a pushed view', async () => {
  const { user, load } = setup()
  await ready()
  await user.keyboard('#')
  await bar()

  await user.keyboard('{Tab}')
  expect(chip('client-b')).toHaveAttribute('aria-current', 'true')
  expect(chip('client-a')).not.toHaveAttribute('aria-current')
  await user.keyboard('{Shift>}{Tab}{/Shift}{Shift>}{Tab}{/Shift}')
  expect(chip('personal')).toHaveAttribute('aria-current', 'true')
  await user.keyboard('{Tab}{Tab}{Enter}')

  expect(params().get('tag')).toBe('client-b')
  expect(screen.queryByRole('group', { name: messages.filter.label })).not.toBeInTheDocument()
  await vi.waitFor(() => expect(load).toHaveBeenLastCalledWith({ date: null, tag: 'client-b' }))
})

it('reopening starts at the applied tag, which is aria-pressed', async () => {
  window.history.replaceState(null, '', '/?tag=client-c')
  const { user } = setup()
  await ready()

  await user.keyboard('#')
  await bar()

  expect(chip('client-c')).toHaveAttribute('aria-pressed', 'true')
  expect(chip('client-c')).toHaveAttribute('aria-current', 'true')
  expect(chip('client-a')).toHaveAttribute('aria-pressed', 'false')
})

it('esc order: armed snooze menu, then the tag bar, then the filter', async () => {
  window.history.replaceState(null, '', '/?tag=client-b')
  const { user } = setup()
  await ready()
  await user.keyboard('js')
  expect(screen.getByRole('list', { name: messages.whichKey.label })).toBeInTheDocument()

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('list', { name: messages.whichKey.label })).not.toBeInTheDocument()
  expect(params().get('tag')).toBe('client-b')

  await user.keyboard('#')
  await bar()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('group', { name: messages.filter.label })).not.toBeInTheDocument()
  expect(params().get('tag')).toBe('client-b')

  await user.keyboard('{Escape}')
  expect(params().get('tag')).toBeNull()
})

it('the filter persists across [ and ]', async () => {
  window.history.replaceState(null, '', '/?tag=client-b')
  const { user } = setup()
  await ready()

  await user.keyboard(']')

  expect(params().get('d')).toBe('2026-10-08')
  expect(params().get('tag')).toBe('client-b')
})

it('# with no tags does nothing and is not hinted', async () => {
  const { user } = setup(serve({ tags: [] }))
  await ready()
  expect(footer()).not.toHaveTextContent(messages.statusline.keys.tags)

  await user.keyboard('#')

  expect(screen.queryByRole('group', { name: messages.filter.label })).not.toBeInTheDocument()
})

it('hints # when tags exist and esc clear only while a filter is applied', async () => {
  const { user } = setup()
  await ready()
  expect(footer()).toHaveTextContent(messages.statusline.keys.tags)
  expect(footer()).not.toHaveTextContent(messages.statusline.keys.clear)

  await user.keyboard('#')
  await bar()
  await user.keyboard('{Tab}{Enter}')

  await vi.waitFor(() => expect(footer()).toHaveTextContent(messages.statusline.keys.clear))
})

it('keys are off while the bar is open: ] changes nothing', async () => {
  const { user } = setup()
  await ready()
  await user.keyboard('#')
  await bar()

  await user.keyboard(']')

  expect(params().get('d')).toBeNull()
})

it('0 notes: a filter with nothing left shows the header, all hidden, calm copy, and esc clears', async () => {
  window.history.replaceState(null, '', '/?tag=client-b')
  const base = c4Response()
  const empty = (view: DayView): Promise<TodayResponse> =>
    Promise.resolve(
      view.tag === null
        ? base
        : {
            ...base,
            tag: view.tag,
            carried: [],
            rail: [],
            others: [],
            otherCount: 0,
            hiddenCount: 15,
          },
    )
  const { user } = setup(empty)

  expect(
    await screen.findByRole('heading', { level: 1, name: messages.filter.header(0) }),
  ).toBeVisible()
  expect(screen.getByRole('main')).toHaveTextContent(messages.today.noNotes)
  expect(within(screen.getByRole('main')).queryAllByRole('listitem')).toHaveLength(0)
  expect(screen.getByRole('complementary')).toHaveTextContent(messages.filter.hidden(15))

  await user.keyboard('{Escape}')

  expect(await screen.findByRole('heading', { level: 1, name: '4 things today' })).toBeVisible()
  expect(params().get('tag')).toBeNull()
})
