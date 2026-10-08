import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { DayPage } from '../src/features/today/DayPage'
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
