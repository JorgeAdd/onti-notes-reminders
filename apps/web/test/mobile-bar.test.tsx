import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { expect, it, vi } from 'vitest'
import { MobileBar } from '../src/features/today/MobileBar'
import { messages } from '../src/messages'

it('renders each button only when its handler exists: Search first, then + Capture (SG14)', async () => {
  const onCapture = vi.fn()
  const onSearch = vi.fn()
  render(<MobileBar onSearch={onSearch} onCapture={onCapture} />)

  const buttons = screen.getAllByRole('button')
  expect(buttons.map((button) => button.textContent)).toEqual(['Search', '+ Capture'])
  expect(messages.mobile.capture).toBe('+ Capture')
  expect(messages.mobile.search).toBe('Search')

  await userEvent.click(buttons[0]!)
  expect(onSearch).toHaveBeenCalledTimes(1)
  expect(onCapture).not.toHaveBeenCalled()
  await userEvent.click(buttons[1]!)
  expect(onCapture).toHaveBeenCalledTimes(1)
})

it('renders nothing for a missing handler: only Capture, or only Search', () => {
  const { rerender } = render(<MobileBar onCapture={vi.fn()} />)
  expect(screen.getAllByRole('button')).toHaveLength(1)
  expect(screen.queryByText('Search')).not.toBeInTheDocument()
  rerender(<MobileBar onSearch={vi.fn()} />)
  expect(screen.getByRole('button')).toHaveTextContent('Search')
})

it('styles the button at the 44 px target with tokens only', () => {
  const css = readFileSync('src/features/today/MobileBar.module.css', 'utf8')
  expect(css).toMatch(/min-height:\s*var\(--size-target\)/)
  expect(css).toMatch(/:focus-visible\s*\{[^}]*var\(--focus-ring\)/)
  expect(css).not.toMatch(/#[0-9a-f]{3,6}\b|--core-|font-size|(?<![\d.])(?!1px)\d+px/i)
})
