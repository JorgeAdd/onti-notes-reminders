import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { expect, it, vi } from 'vitest'
import { MobileBar } from '../src/features/today/MobileBar'
import { messages } from '../src/messages'

it('is one "+ Capture" button: no Search, no Tags, no Pick (SG14, Decision 16)', async () => {
  const onCapture = vi.fn()
  render(<MobileBar onCapture={onCapture} />)

  const buttons = screen.getAllByRole('button')
  expect(buttons).toHaveLength(1)
  expect(buttons[0]).toHaveAccessibleName(messages.mobile.capture)
  expect(messages.mobile.capture).toBe('+ Capture')
  expect(screen.queryByText(/search|tags|pick/i)).not.toBeInTheDocument()

  await userEvent.click(buttons[0]!)
  expect(onCapture).toHaveBeenCalledTimes(1)
})

it('styles the button at the 44 px target with tokens only', () => {
  const css = readFileSync('src/features/today/MobileBar.module.css', 'utf8')
  expect(css).toMatch(/min-height:\s*var\(--size-target\)/)
  expect(css).toMatch(/:focus-visible\s*\{[^}]*var\(--focus-ring\)/)
  expect(css).not.toMatch(/#[0-9a-f]{3,6}\b|--core-|font-size|(?<![\d.])(?!1px)\d+px/i)
})
