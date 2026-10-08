import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ActionMessage } from '../src/features/today/ActionMessage'
import { DayPage } from '../src/features/today/DayPage'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

afterEach(() => vi.useRealTimers())

const TEXT = messages.errors.actionFailed('done', 'Standup')

it('shows one status line with the message and a dismiss button', () => {
  const onDismiss = vi.fn()
  render(<ActionMessage message={TEXT} onDismiss={onDismiss} />)

  expect(screen.getByRole('status')).toHaveTextContent(TEXT)
  fireEvent.click(screen.getByRole('button', { name: messages.errors.dismiss }))
  expect(onDismiss).toHaveBeenCalledTimes(1)
})

it('clears itself after 6 s, not before', () => {
  vi.useFakeTimers()
  const onDismiss = vi.fn()
  render(<ActionMessage message={TEXT} onDismiss={onDismiss} />)

  act(() => void vi.advanceTimersByTime(5_999))
  expect(onDismiss).not.toHaveBeenCalled()
  act(() => void vi.advanceTimersByTime(1))
  expect(onDismiss).toHaveBeenCalledTimes(1)
})

it('clears on the next key press', () => {
  const onDismiss = vi.fn()
  render(<ActionMessage message={TEXT} onDismiss={onDismiss} />)

  fireEvent.keyDown(document, { key: 'j' })

  expect(onDismiss).toHaveBeenCalledTimes(1)
})

it('the day page shows the line above the statusline, and nothing without a message', () => {
  const now = c4Response().now
  const { rerender } = render(
    <DayPage today={c4Response()} now={now} onSignOut={() => undefined} />,
  )
  expect(screen.queryByRole('status')).not.toBeInTheDocument()

  rerender(
    <DayPage
      today={c4Response()}
      now={now}
      onSignOut={() => undefined}
      message={TEXT}
      onDismissMessage={() => undefined}
    />,
  )
  expect(screen.getByRole('status')).toHaveTextContent(TEXT)
})
