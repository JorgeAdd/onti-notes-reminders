import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { EmptyState } from '../src/features/today/EmptyState'

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
