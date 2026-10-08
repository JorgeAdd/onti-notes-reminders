import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { TodayItem } from '@onti/shared'
import { at, TZ } from '@onti/shared/fixtures/jorge-week'
import { HourRail } from '../src/features/today/HourRail'
import { c4Response } from './today-fixture'

const before = (a: Node, b: Node) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

const renderRail = (now: Date, items = c4Response().rail) =>
  render(<HourRail items={items} now={now} timezone={TZ} />)

function timed(label: string, local: string): TodayItem {
  const dueAt = at(local)
  return {
    id: label,
    title: label,
    tags: [],
    dueAt,
    originalDueAt: dueAt,
    snoozeCount: 0,
    doneAt: null,
  }
}

it('C4: the now line sits between the 09 hour and the 09:30 item, 16:00 sits at hour 16 (SG7)', () => {
  renderRail(c4Response().now)
  const nine = screen.getByText('09')
  const nowLine = screen.getByText('now 09:05')
  const standup = screen.getByText('Standup: mention the flaky checkout e2e test')
  const sixteen = screen.getByText('16')
  const rate = screen.getByText('Send rate-limit numbers to the infra team')
  expect(before(nine, nowLine)).toBe(true)
  expect(before(nowLine, standup)).toBe(true)
  expect(before(standup, sixteen)).toBe(true)
  expect(before(sixteen, rate)).toBe(true)
})

it('draws the empty hours one per line on desktop and one "10–15" gap row for mobile (board 05)', () => {
  renderRail(c4Response().now)
  for (const hour of ['10', '11', '12', '13', '14', '15']) {
    expect(screen.getByText(hour)).toBeInTheDocument()
  }
  expect(screen.getByText('10–15')).toBeInTheDocument()
})

it('reads the now line as text with an accessible label', () => {
  renderRail(c4Response().now)
  expect(screen.getByText('now 09:05')).toHaveTextContent('now 09:05')
})

it('moves the now line when now advances an hour (SG15, no animation)', () => {
  const { unmount } = renderRail(at('2026-10-07 10:05'))
  const nowLine = screen.getByText('now 10:05')
  expect(before(screen.getByText('Standup: mention the flaky checkout e2e test'), nowLine)).toBe(
    true,
  )
  expect(before(screen.getByText('10', { selector: 'span' }), nowLine)).toBe(true)
  expect(screen.queryByText('now 09:05')).toBeNull()
  unmount()
})

it('keeps a late item above the now line and the upcoming one below', () => {
  renderRail(at('2026-10-07 09:45'))
  const nowLine = screen.getByText('now 09:45')
  expect(before(screen.getByText('Standup: mention the flaky checkout e2e test'), nowLine)).toBe(
    true,
  )
  expect(before(nowLine, screen.getByText('Send rate-limit numbers to the infra team'))).toBe(true)
})

it('goes compact with 7 timed items: a time list, no hour labels or gaps (SG7)', () => {
  const items = [
    timed('a', '2026-10-07 08:00'),
    timed('b', '2026-10-07 09:30'),
    timed('c', '2026-10-07 11:00'),
    timed('d', '2026-10-07 13:00'),
    timed('e', '2026-10-07 15:00'),
    timed('f', '2026-10-07 16:00'),
    timed('g', '2026-10-07 18:00'),
  ]
  const { container } = renderRail(at('2026-10-07 09:05'), items)
  expect(screen.queryByText('10–15')).toBeNull()
  expect(container.querySelector('[data-hour]')).toBeNull()
  expect(before(screen.getByText('a'), screen.getByText('now 09:05'))).toBe(true)
  expect(before(screen.getByText('now 09:05'), screen.getByText('b'))).toBe(true)
  expect(within(container).getAllByRole('listitem').length).toBe(8)
})

it('stays per-hour with exactly 6 timed items', () => {
  const items = ['08', '09', '10', '11', '12', '13'].map((h) =>
    timed(`t${h}`, `2026-10-07 ${h}:30`),
  )
  renderRail(at('2026-10-07 09:05'), items)
  expect(screen.getByText('08')).toBeInTheDocument()
})

it('renders nothing for an empty rail', () => {
  const { container } = renderRail(c4Response().now, [])
  expect(container).toBeEmptyDOMElement()
})
