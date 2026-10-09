import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { EmptyState } from '../src/features/today/EmptyState'
import { messages } from '../src/messages'

it('reads "Nothing today" when other notes exist', () => {
  render(<EmptyState hasNotes />)
  expect(screen.getByText('Nothing today')).toBeInTheDocument()
})

it('reads "No notes yet" for an account with no notes, with no onboarding', () => {
  render(<EmptyState hasNotes={false} />)
  expect(screen.getByText('No notes yet')).toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})

it('names the day off today, and keeps "No notes yet" when the account is empty', () => {
  const { unmount } = render(<EmptyState hasNotes day="Fri 9" />)
  expect(screen.getByText('Nothing on Fri 9')).toBeInTheDocument()
  unmount()
  render(<EmptyState hasNotes={false} day="Fri 9" />)
  expect(screen.getByText('No notes yet')).toBeInTheDocument()
})

it('hints at help on desktop: "Press ? to see how it works", plain text', () => {
  render(<EmptyState hasNotes={false} hint="key" />)
  expect(screen.getByText('Press ? to see how it works')).toBeInTheDocument()
  expect(messages.help.emptyHint).toBe('Press ? to see how it works')
  expect(screen.getByText('No notes yet')).toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})

it('hints at help on touch: "Tap ? to see how it works"', () => {
  render(<EmptyState hasNotes hint="touch" />)
  expect(screen.getByText('Tap ? to see how it works')).toBeInTheDocument()
  expect(messages.help.emptyHintTouch).toBe('Tap ? to see how it works')
  expect(screen.queryByText(messages.help.emptyHint)).not.toBeInTheDocument()
})

it('shows the hint in every empty variant: no notes, nothing today, nothing on a day', () => {
  for (const [hasNotes, day] of [
    [false, undefined],
    [true, undefined],
    [true, 'Fri 9'],
  ] as const) {
    const { unmount } = render(<EmptyState hasNotes={hasNotes} day={day} hint="key" />)
    expect(screen.getByText(messages.help.emptyHint)).toBeInTheDocument()
    unmount()
  }
})

it('shows no hint unless asked (the page has no help to open)', () => {
  render(<EmptyState hasNotes={false} />)
  expect(screen.queryByText(/to see how it works/)).not.toBeInTheDocument()
})
