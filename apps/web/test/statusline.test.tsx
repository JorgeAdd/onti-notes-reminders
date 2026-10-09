import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { Statusline } from '../src/features/today/Statusline'
import { messages } from '../src/messages'
import { blocks, props, readSrc, resolve, tokens } from './css-tokens'
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

it('hints c for capture from messages', () => {
  hinted(['move', 'capture'])
  expect(screen.getByRole('contentinfo')).toHaveTextContent(messages.statusline.keys.capture)
  expect(messages.statusline.keys.capture).toBe('c capture')
})

it('shows the menu keys while a snooze is armed', () => {
  hinted(['hour', 'tomorrow', 'cancel'])
  expect(screen.getByRole('contentinfo')).toHaveTextContent(messages.statusline.keys.cancel)
})

const withHelp = (onHelp?: (from: HTMLElement) => void) =>
  render(
    <Statusline
      now={today.now}
      timezone={today.timezone}
      todayCount={4}
      carriedCount={2}
      totalCount={15}
      {...(onHelp ? { onHelp } : {})}
    />,
  )

it('has no help button without a handler', () => {
  withHelp()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

it('shows a "?" help button that calls back with the element', async () => {
  const onHelp = vi.fn()
  withHelp(onHelp)
  const button = screen.getByRole('button', { name: messages.help.open })
  expect(button).toHaveTextContent(messages.help.button)
  expect(button).toHaveAttribute('aria-haspopup', 'dialog')
  expect(screen.getByRole('contentinfo')).toContainElement(button)
  await userEvent.click(button)
  expect(onHelp).toHaveBeenCalledTimes(1)
  expect(onHelp).toHaveBeenCalledWith(button)
})

it('keeps the button apart from the key hints: it is not one of them', () => {
  render(
    <Statusline
      now={today.now}
      timezone={today.timezone}
      todayCount={4}
      carriedCount={2}
      totalCount={15}
      hints={['move', 'capture']}
      onHelp={() => undefined}
    />,
  )
  const button = screen.getByRole('button', { name: messages.help.open })
  expect(screen.getByText(messages.statusline.keys.move)).not.toContainElement(button)
})

it('styles the button as a 44 px target with the ink focus ring, visible at every width [static]', () => {
  const css = readSrc('features/today/Statusline.module.css')
  const root = tokens().root
  const help = props(blocks(css).find((b) => b.header === '.help')!.body)
  expect(resolve(help['min-height']!, root)).toBe('44px')
  expect(resolve(help['min-width']!, root)).toBe('44px')
  expect(props(blocks(css).find((b) => b.header === '.help:focus-visible')!.body)['outline']).toBe(
    'var(--focus-ring)',
  )
  const hidden = blocks(blocks(css).find((b) => b.header === '@media (max-width: 640px)')!.body)
    .filter((b) => props(b.body)['display'] === 'none')
    .map((b) => b.header)
    .join(',')
  expect(hidden).not.toContain('.help')
  expect(css).not.toMatch(/--color-date|--core-/)
})
