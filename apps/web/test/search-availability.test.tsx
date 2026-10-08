import type { TodayResponse } from '@onti/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { TodayContainer } from '../src/features/today/TodayContainer'
import type { DayView } from '../src/features/today/day-view'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

afterEach(() => window.history.replaceState(null, '', '/'))

const never = () => new Promise<never>(() => undefined)

function setup(load: (view: DayView) => Promise<TodayResponse>) {
  const onOpenSearch = vi.fn()
  const user = userEvent.setup()
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <TodayContainer
        load={load}
        onSessionExpired={() => undefined}
        onSignOut={() => undefined}
        syncTimezone={() => Promise.resolve()}
        reminders={{ snooze: never, done: never, undo: never, capture: never }}
        browserTimeZone={() => 'America/Mexico_City'}
        onOpenSearch={onOpenSearch}
      />
    </QueryClientProvider>,
  )
  return { user, onOpenSearch }
}
const footer = () => screen.getByRole('contentinfo')

it('/ is a no-op, with no hint, while slice 3`s tag bar is open, and works again once it closes', async () => {
  const { user, onOpenSearch } = setup((view) =>
    Promise.resolve(c4Response(view.date ?? undefined)),
  )
  await screen.findByRole('heading', { level: 1 })
  expect(footer()).toHaveTextContent(messages.statusline.keys.search)

  await user.keyboard('#')
  await screen.findByRole('group', { name: messages.filter.label })
  expect(footer()).not.toHaveTextContent(messages.statusline.keys.search)
  await user.keyboard('/')
  expect(onOpenSearch).not.toHaveBeenCalled()

  await user.keyboard('{Escape}')
  await user.keyboard('/')
  expect(onOpenSearch).toHaveBeenCalledTimes(1)
})

it('/ is a no-op, with no hint, while a placeholder page is loading', async () => {
  let release: (page: TodayResponse) => void = () => undefined
  const { user, onOpenSearch } = setup((view) =>
    view.date === null
      ? Promise.resolve(c4Response())
      : new Promise<TodayResponse>((resolve) => (release = resolve)),
  )
  await screen.findByRole('heading', { level: 1 })
  await user.keyboard(']')
  expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true')
  expect(footer()).not.toHaveTextContent(messages.statusline.keys.search)

  await user.keyboard('/')
  expect(onOpenSearch).not.toHaveBeenCalled()

  release(c4Response('2026-10-08'))
  await screen.findByRole('heading', { level: 1, name: '1 thing on Thu 8' })
  await user.keyboard('/')
  expect(onOpenSearch).toHaveBeenCalledTimes(1)
})
