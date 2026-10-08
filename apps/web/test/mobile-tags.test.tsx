import type { TodayResponse } from '@onti/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { afterEach, expect, it, vi } from 'vitest'
import { MobileBar } from '../src/features/today/MobileBar'
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

const serve = (view: DayView): Promise<TodayResponse> =>
  Promise.resolve({ ...c4Response(view.date ?? undefined), tag: view.tag })

function setup() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={client}>
      <TodayContainer
        load={serve}
        onSessionExpired={() => undefined}
        onSignOut={() => undefined}
        syncTimezone={() => Promise.resolve()}
        reminders={reminders}
        browserTimeZone={() => 'America/Mexico_City'}
      />
    </QueryClientProvider>,
  )
  return { user }
}

const ready = () => screen.findByRole('heading', { level: 1 })
const tagsButton = () => screen.getByRole('button', { name: messages.mobile.tags })
const group = () => screen.findByRole('group', { name: messages.filter.label })
const tag = () => new URLSearchParams(window.location.search).get('tag')

it('MobileBar renders Tags only when a handler is passed, before capture (append-only)', async () => {
  const { rerender } = render(<MobileBar onCapture={() => undefined} />)
  expect(screen.queryByRole('button', { name: 'Tags' })).not.toBeInTheDocument()

  const onTags = vi.fn()
  rerender(<MobileBar onCapture={() => undefined} onTags={onTags} />)
  expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
    messages.mobile.tags,
    messages.mobile.capture,
  ])
  expect(messages.mobile.tags).toBe('Tags')
  await userEvent.click(screen.getByRole('button', { name: 'Tags' }))
  expect(onTags).toHaveBeenCalledTimes(1)
})

it('keeps every mobile control at the 44 px target with tokens only', () => {
  for (const file of ['DayNav', 'TagBar', 'MobileBar']) {
    const css = readFileSync(`src/features/today/${file}.module.css`, 'utf8')
    expect(css).toMatch(/min-height:\s*var\(--size-target\)/)
    expect(css).not.toMatch(/#[0-9a-f]{3,6}\b|--core-|font-size|(?<![\d.])(?!1px)\d+px/i)
  }
  const dayNav = readFileSync('src/features/today/DayNav.module.css', 'utf8')
  expect(dayNav).toMatch(/min-width:\s*var\(--size-target\)/)
  const tagBar = readFileSync('src/features/today/TagBar.module.css', 'utf8')
  expect(tagBar).toMatch(/@media \(prefers-reduced-motion: reduce\)|var\(--motion-/)
})

it('Tags opens the chips in the dock; Clear #tag removes the filter', async () => {
  const { user } = setup()
  await ready()

  await user.click(tagsButton())
  const chips = await group()
  expect(screen.getByTestId('dock')).toContainElement(chips)
  expect(
    within(chips)
      .getAllByRole('button')
      .map((b) => b.textContent),
  ).toEqual(['#client-a', '#client-b', '#client-c', '#personal'])
  expect(screen.queryByRole('button', { name: /^Clear #/ })).not.toBeInTheDocument()

  await user.click(within(chips).getByRole('button', { name: '#client-b' }))
  expect(tag()).toBe('client-b')

  await user.click(tagsButton())
  const again = await group()
  expect(within(again).getByRole('button', { name: '#client-b' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await user.click(within(again).getByRole('button', { name: messages.filter.clear('client-b') }))
  expect(tag()).toBeNull()
  expect(screen.queryByRole('group', { name: messages.filter.label })).not.toBeInTheDocument()
})

it('the outside tap closes the dock, keeps the filter and opens no row sheet (Q3)', async () => {
  window.history.replaceState(null, '', '/?tag=client-b')
  const { user } = setup()
  await ready()
  await user.click(tagsButton())
  await group()

  await user.click(screen.getByTestId('tag-backdrop'))

  expect(screen.queryByRole('group', { name: messages.filter.label })).not.toBeInTheDocument()
  expect(tag()).toBe('client-b')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('does not render the backdrop or Clear chip on desktop', async () => {
  vi.stubGlobal('matchMedia', undefined)
  const client = new QueryClient()
  render(
    <QueryClientProvider client={client}>
      <TodayContainer
        load={serve}
        onSessionExpired={() => undefined}
        onSignOut={() => undefined}
        syncTimezone={() => Promise.resolve()}
        reminders={reminders}
      />
    </QueryClientProvider>,
  )
  await ready()
  await userEvent.keyboard('#')
  await group()
  expect(screen.queryByTestId('tag-backdrop')).not.toBeInTheDocument()
})
