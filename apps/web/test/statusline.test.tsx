import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Statusline } from '../src/features/today/Statusline'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

const today = c4Response()

it('is the footer landmark with mode, weekday+day, counts and the clock (C4)', () => {
  render(
    <Statusline
      now={today.now}
      timezone={today.timezone}
      todayCount={4}
      carriedCount={2}
      totalCount={15}
    />,
  )
  const footer = screen.getByRole('contentinfo')
  expect(footer).toHaveTextContent('NORMAL')
  expect(footer).toHaveTextContent('Wed 7')
  expect(footer).toHaveTextContent('4 today · 2 carried · 15 notes')
  expect(footer).toHaveTextContent('09:05')
})

it('shows no key hints, nor hints for unshipped features, unless it is given working keys', () => {
  render(
    <Statusline
      now={today.now}
      timezone={today.timezone}
      todayCount={0}
      carriedCount={0}
      totalCount={0}
    />,
  )
  expect(screen.queryByText(/capture|search|help/i)).not.toBeInTheDocument()
})

const hinted = (hints: Parameters<typeof Statusline>[0]['hints']) =>
  render(
    <Statusline
      now={today.now}
      timezone={today.timezone}
      todayCount={4}
      carriedCount={2}
      totalCount={15}
      hints={hints}
    />,
  )

it('renders a hint for each working key, from messages, and nothing else', () => {
  hinted(['move', 'done', 'snooze'])
  const footer = screen.getByRole('contentinfo')
  expect(footer).toHaveTextContent(messages.statusline.keys.move)
  expect(footer).toHaveTextContent(messages.statusline.keys.done)
  expect(footer).toHaveTextContent(messages.statusline.keys.snooze)
  expect(footer).not.toHaveTextContent(messages.statusline.keys.undo)
})

it('shows the menu keys while a snooze is armed', () => {
  hinted(['hour', 'tomorrow', 'cancel'])
  expect(screen.getByRole('contentinfo')).toHaveTextContent(messages.statusline.keys.cancel)
})
