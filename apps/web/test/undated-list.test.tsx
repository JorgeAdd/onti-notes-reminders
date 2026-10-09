/** R19 · the "Without a reminder" list (C13), its mobile link, and how it opens the note view. */
import type { TodayResponse } from '@onti/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { expect, it, vi } from 'vitest'
import { DayPage } from '../src/features/today/DayPage'
import { TodayContainer } from '../src/features/today/TodayContainer'
import { UndatedList } from '../src/features/today/UndatedList'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

const NOW = new Date('2026-10-07T15:05:00.000Z')
const C13_TITLES = [
  '1:1 with manager: topics',
  'API keys rotate every 90 days',
  'Diego prefers async updates on Slack',
  'Domain glossary',
  'PR review checklist',
  'Read: Postgres partial indexes',
  'Review agenda: search, exports, roles',
  'Shortcut cheat sheet for the team',
]

const undated = (count = 9) => {
  const { items } = c4Response().undated
  return { count, items: items.slice(0, Math.min(count, 8)) }
}

function renderList(props: Partial<Parameters<typeof UndatedList>[0]> = {}) {
  const onOpenNote = vi.fn()
  const onOpenAll = vi.fn()
  const view = render(
    <UndatedList
      undated={undated()}
      mobile={false}
      onOpenNote={onOpenNote}
      onOpenAll={onOpenAll}
      {...props}
    />,
  )
  return { ...view, onOpenNote, onOpenAll, user: userEvent.setup() }
}

it('C13: the header, the 8 rows in order, tags below, then "+ 1 more"', () => {
  renderList()
  const section = screen.getByRole('region', { name: messages.undated.header(9) })
  expect(within(section).getByRole('heading', { level: 2 })).toHaveTextContent(
    'Without a reminder · 9',
  )
  const rows = within(section).getAllByRole('listitem')
  expect(rows).toHaveLength(8)
  expect(rows.map((row) => row.querySelector('button')?.firstElementChild?.textContent)).toEqual(
    C13_TITLES,
  )
  expect(rows[0]).toHaveTextContent('#personal')
  expect(rows[1]).toHaveTextContent('#client-b')
  expect(within(section).getByRole('button', { name: '+ 1 more' })).toBeInTheDocument()
})

it('shows no "+ n more" at 8 or fewer, and nothing at all at zero', () => {
  const { container, rerender } = renderList({ undated: undated(8) })
  expect(screen.queryByText(/more$/)).not.toBeInTheDocument()
  expect(screen.getAllByRole('listitem')).toHaveLength(8)

  rerender(
    <UndatedList
      undated={{ count: 0, items: [] }}
      mobile={false}
      onOpenNote={vi.fn()}
      onOpenAll={vi.fn()}
    />,
  )
  expect(container).toBeEmptyDOMElement()
})

it('names how many more with the count above the rows shown', () => {
  renderList({ undated: { count: 10, items: undated().items } })
  expect(screen.getByRole('button', { name: '+ 2 more' })).toBeInTheDocument()
})

it('a row opens that note, "+ 1 more" opens All notes', async () => {
  const { user, onOpenNote, onOpenAll } = renderList()
  await user.click(screen.getByRole('button', { name: /Diego prefers async updates on Slack/ }))
  expect(onOpenNote).toHaveBeenCalledWith(c4Response().undated.items[2]!.id)
  expect(onOpenAll).not.toHaveBeenCalled()

  await user.click(screen.getByRole('button', { name: '+ 1 more' }))
  expect(onOpenAll).toHaveBeenCalledTimes(1)
  expect(onOpenNote).toHaveBeenCalledTimes(1)
})

it('is operable from the keyboard: Tab to a row, Enter opens it', async () => {
  const { user, onOpenNote } = renderList()
  await user.tab()
  expect(screen.getAllByRole('button')[0]).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(onOpenNote).toHaveBeenCalledWith(c4Response().undated.items[0]!.id)
})

it('shows no internal id and renders titles and tags as text', () => {
  const hostile = {
    ...undated(1),
    items: [{ ...undated().items[0]!, title: '<img src=x onerror=alert(1)>' }],
  }
  const { container } = renderList({ undated: hostile })
  expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
  expect(container.querySelector('img, [onerror]')).toBeNull()
  expect(document.body).not.toHaveTextContent(/[0-9a-f]{8}-[0-9a-f]{4}-/)
})

it('mobile: no list, one "9 without a reminder" button that opens All notes', async () => {
  const { user, onOpenAll } = renderList({ mobile: true })
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
  expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  const link = screen.getByRole('button', { name: '9 without a reminder' })
  await user.click(link)
  expect(onOpenAll).toHaveBeenCalledTimes(1)
})

it('mobile: hidden at zero', () => {
  const { container } = renderList({ mobile: true, undated: { count: 0, items: [] } })
  expect(container).toBeEmptyDOMElement()
})

it('sits in the date column below Sign out (R19), on the page frame', () => {
  render(
    <DayPage today={c4Response()} now={NOW} onSignOut={() => undefined} onOpenNote={vi.fn()} />,
  )
  const column = screen.getByRole('complementary')
  const signOut = within(column).getByRole('button', { name: messages.today.signOut })
  const section = within(column).getByRole('region', { name: messages.undated.header(9) })
  expect(signOut.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(within(screen.getByRole('main')).queryByText(C13_TITLES[0]!)).not.toBeInTheDocument()
})

it('Today: a row opens the note by id, "+ 1 more" and `/` open All notes', async () => {
  const onOpenNote = vi.fn()
  const onOpenSearch = vi.fn()
  const user = userEvent.setup()
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <TodayContainer
        load={() => Promise.resolve(c4Response())}
        onSessionExpired={() => undefined}
        onSignOut={() => undefined}
        syncTimezone={() => Promise.resolve()}
        reminders={{
          snooze: vi.fn(),
          done: vi.fn(),
          undo: vi.fn(),
          capture: vi.fn(),
        }}
        browserTimeZone={() => 'America/Mexico_City'}
        onOpenNote={onOpenNote}
        onOpenSearch={onOpenSearch}
      />
    </QueryClientProvider>,
  )
  await screen.findByRole('heading', { level: 1 })
  await user.click(screen.getByRole('button', { name: /Domain glossary/ }))
  expect(onOpenNote).toHaveBeenCalledWith(c4Response().undated.items[3]!.id)

  await user.click(screen.getByRole('button', { name: '+ 1 more' }))
  expect(onOpenSearch).toHaveBeenCalledTimes(1)
})

it('is the same list for a filtered view and another day (R19)', () => {
  const filtered: TodayResponse = { ...c4Response(), tag: 'client-a', hiddenCount: 4 }
  render(<DayPage today={filtered} now={NOW} onSignOut={() => undefined} />)
  expect(screen.getByRole('region', { name: messages.undated.header(9) })).toBeInTheDocument()
})

it('has no hardcoded copy [static]', () => {
  const source = readFileSync('src/features/today/UndatedList.tsx', 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  )
  expect(source).toContain('messages.undated')
  expect(source).not.toMatch(/Without a reminder|without a reminder|\+ \$\{|more`/)
})

it('has 44 px rows, an ink focus ring, tokens only and no vermilion [static]', () => {
  const css = readFileSync('src/features/today/UndatedList.module.css', 'utf8').replace(
    '(max-width: 640px)',
    '',
  )
  expect(css).not.toMatch(/#[0-9a-f]{3,6}\b|--core-|font-size|--color-date/i)
  expect(css).not.toMatch(/(?<![\d.])(?!1px)\d+px/)
  expect(css).toMatch(/min-height:\s*var\(--size-target\)/)
  expect(css).toMatch(/:focus-visible[^{]*\{[^}]*var\(--focus-ring\)/)
  expect(css).toMatch(/text-overflow:\s*ellipsis/)
  expect(css).toMatch(/white-space:\s*nowrap/)
})

it('lets the date column scroll when header, 8 rows and Sign out outgrow it [static]', () => {
  const css = readFileSync('src/features/today/DateColumn.module.css', 'utf8')
  expect(css).toMatch(/\.column\s*\{[^}]*overflow-y:\s*auto/)
})
