import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { DayPage } from '../src/features/today/DayPage'
import { useNow } from '../src/features/today/use-now'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

const now = c4Response().now
const renderPage = (today = c4Response(), onSignOut = () => undefined) =>
  render(<DayPage today={today} now={now} onSignOut={onSignOut} />)

it('C4: header, date block, month, timezone and other notes', () => {
  renderPage()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('4 things today')
  const dateColumn = screen.getByRole('complementary')
  expect(within(dateColumn).getByText('7')).toBeInTheDocument()
  expect(within(dateColumn).getByText('Wednesday')).toBeInTheDocument()
  expect(within(dateColumn).getByText('October 2026')).toBeInTheDocument()
  expect(within(dateColumn).getByText('America/Mexico_City')).toBeInTheDocument()
  expect(within(dateColumn).getByText('11 other notes on the back of the pad')).toBeInTheDocument()
})

it('has a header and a main landmark and exactly one h1', () => {
  renderPage()
  expect(screen.getByRole('banner')).toContainElement(screen.getByRole('heading', { level: 1 }))
  expect(screen.getByRole('main')).toBeInTheDocument()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
})

it('reads the singular and the done variants of the header (R4)', () => {
  const { unmount } = renderPage({ ...c4Response(), openCount: 1 })
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('1 thing today')
  unmount()
  renderPage({ ...c4Response(), openCount: 3, anyDoneToday: true })
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('3 left today')
})

it('uses the singular note copy for one other note', () => {
  renderPage({ ...c4Response(), otherCount: 1 })
  expect(screen.getByText('1 other note on the back of the pad')).toBeInTheDocument()
})

it('offers a sign-out control in the date column', () => {
  const onSignOut = vi.fn()
  renderPage(c4Response(), onSignOut)
  fireEvent.click(
    within(screen.getByRole('complementary')).getByRole('button', { name: messages.today.signOut }),
  )
  expect(onSignOut).toHaveBeenCalledTimes(1)
})

it('never renders internal note ids', () => {
  renderPage()
  expect(document.body.textContent).not.toMatch(/\bN\d{1,2}\b/)
})

it('C4: carried group, rail items with labels, statusline counts (R3, R2, R6)', () => {
  renderPage()
  const main = screen.getByRole('main')
  expect(within(main).getByRole('region', { name: 'Still open from Tue 6' })).toBeInTheDocument()
  expect(within(main).getByText('late 15h05')).toBeInTheDocument()
  expect(within(main).getByText('late 14h35')).toBeInTheDocument()
  expect(within(main).getByText('in 25 min')).toBeInTheDocument()
  expect(within(main).getByText('in 6h55')).toBeInTheDocument()
  expect(screen.getByRole('contentinfo')).toHaveTextContent('4 today · 2 carried · 15 notes')
})

it('renders the empty page with calm copy, header, date block and statusline', () => {
  renderPage({
    ...c4Response(),
    openCount: 0,
    anyDoneToday: false,
    carried: [],
    rail: [],
    otherCount: 3,
  })
  expect(screen.getByRole('main')).toHaveTextContent('Nothing today')
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  expect(screen.getByRole('complementary')).toBeInTheDocument()
  expect(screen.getByRole('contentinfo')).toHaveTextContent('0 today · 0 carried · 3 notes')
})

it('reads "No notes yet" for an account with nothing at all', () => {
  renderPage({ ...c4Response(), openCount: 0, carried: [], rail: [], otherCount: 0 })
  expect(screen.getByRole('main')).toHaveTextContent('No notes yet')
})

it('strikes a done item and counts it in the "left today" header (C3)', () => {
  const today = c4Response()
  const [first, ...rest] = today.rail
  renderPage({
    ...today,
    openCount: 3,
    anyDoneToday: true,
    rail: [{ ...first!, doneAt: today.now }, ...rest],
  })
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('3 left today')
  expect(screen.getByText(first!.title).closest('s')).not.toBeNull()
})

it('ticks: "in 25 min" reads "in 24 min" and the clock steps at the minute (C7)', () => {
  vi.useFakeTimers()
  vi.setSystemTime(c4Response().now)
  function Live() {
    const ticking = useNow(0)
    return <DayPage today={c4Response()} now={ticking} onSignOut={() => undefined} />
  }
  render(<Live />)
  expect(screen.getByText('in 25 min')).toBeInTheDocument()
  expect(screen.getByText('late 15h05')).toBeInTheDocument()
  expect(screen.getByRole('contentinfo')).toHaveTextContent('09:05')

  act(() => void vi.advanceTimersByTime(60_000))

  expect(screen.getByText('in 24 min')).toBeInTheDocument()
  expect(screen.getByText('late 15h06')).toBeInTheDocument()
  expect(screen.getByRole('contentinfo')).toHaveTextContent('09:06')
  vi.useRealTimers()
})

it('C4: the page rail shows the now line above the 09:30 item and hour 16 (SG7)', () => {
  renderPage()
  const main = screen.getByRole('main')
  const nowLine = within(main).getByText('now 09:05')
  const standup = within(main).getByText('Standup: mention the flaky checkout e2e test')
  expect(nowLine.compareDocumentPosition(standup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(within(main).getByText('16')).toBeInTheDocument()
})

it('the now line steps with the ticking clock (C7)', () => {
  vi.useFakeTimers()
  vi.setSystemTime(c4Response().now)
  function Live() {
    return <DayPage today={c4Response()} now={useNow(0)} onSignOut={() => undefined} />
  }
  render(<Live />)
  expect(screen.getByText('now 09:05')).toBeInTheDocument()
  act(() => void vi.advanceTimersByTime(60_000))
  expect(screen.getByText('now 09:06')).toBeInTheDocument()
  vi.useRealTimers()
})
