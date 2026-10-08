import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { at, TZ } from '@onti/shared/fixtures/jorge-week'
import { WhichKey } from '../src/features/today/WhichKey'
import { messages } from '../src/messages'

it('lists each snooze key with the time it leads to, from the display clock (SG11)', () => {
  render(<WhichKey now={at('2026-10-07 09:05')} timezone={TZ} />)

  const menu = screen.getByRole('list', { name: messages.whichKey.label })
  expect(menu).toHaveTextContent(messages.whichKey.hour('10:05'))
  expect(menu).toHaveTextContent(messages.whichKey.tomorrow('Thu 09:00'))
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
})

it('follows the clock and the zone', () => {
  render(<WhichKey now={at('2026-10-07 23:30')} timezone={TZ} />)

  const menu = screen.getByRole('list')
  expect(menu).toHaveTextContent(messages.whichKey.hour('00:30'))
  expect(menu).toHaveTextContent(messages.whichKey.tomorrow('Thu 09:00'))
})
