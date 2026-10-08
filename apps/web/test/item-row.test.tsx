import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ItemRow } from '../src/features/today/ItemRow'
import { IDLE_ROWS, type RowsState } from '../src/features/today/rows'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

const today = c4Response()
const [late] = today.carried[0]!.items
const [upcoming] = today.rail

const renderRow = (item = late!) =>
  render(
    <ul>
      <ItemRow item={item} now={today.now} timezone={today.timezone} />
    </ul>,
  )

it('shows time, title, tags as #slug and the relative label as plain text (R2)', () => {
  renderRow()
  expect(screen.getByRole('listitem')).toHaveTextContent('18:00')
  expect(screen.getByText('Reply to Marta about the staging deploy window')).toBeInTheDocument()
  expect(screen.getByText('#client-a')).toBeInTheDocument()
  expect(screen.getByText('late 15h05')).toBeInTheDocument()
})

it('reads "in {duration}" for an upcoming item (R6)', () => {
  renderRow(upcoming)
  expect(screen.getByText('in 25 min')).toBeInTheDocument()
})

it('strikes a done item through, without a relative label (SG12)', () => {
  renderRow({ ...upcoming!, doneAt: today.now })
  const title = screen.getByText(upcoming!.title)
  expect(title.closest('s')).not.toBeNull()
  expect(screen.queryByText(/^(late|in) /)).not.toBeInTheDocument()
})

it('is read-only: no controls, no internal ids (rule 13)', () => {
  renderRow()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/\bN\d{1,2}\b/)
})

const snoozed = { ...upcoming!, dueAt: new Date('2026-10-07T16:05:00Z'), snoozeCount: 2 }

it('a snoozed item reads "{time} · was {original} · {count}×" (SG11)', () => {
  renderRow({
    ...snoozed,
    originalDueAt: new Date('2026-10-06T23:00:00Z'),
  })
  const row = screen.getByRole('listitem')
  expect(row).toHaveTextContent('10:05')
  expect(screen.getByText(messages.today.snoozedFrom('Tue 17:00'))).toBeInTheDocument()
  expect(screen.getByText(messages.today.snoozeCount(2))).toBeInTheDocument()
})

it('an item that was never snoozed shows neither "was" nor a count', () => {
  renderRow(upcoming)
  expect(screen.queryByText(/^was /)).not.toBeInTheDocument()
  expect(screen.queryByText(/×/)).not.toBeInTheDocument()
})

describe('accessible name', () => {
  it.each([
    ['open', upcoming!, messages.today.rowLabel(upcoming!.title, '09:30', 'open')],
    ['late', late!, messages.today.rowLabel(late!.title, '18:00', 'late 15h05')],
    [
      'done',
      { ...upcoming!, doneAt: today.now },
      messages.today.rowLabel(upcoming!.title, '09:30', 'done'),
    ],
    [
      'snoozed',
      { ...upcoming!, snoozeCount: 2 },
      messages.today.rowLabel(upcoming!.title, '09:30', 'snoozed 2×'),
    ],
  ])('%s row states title, time and state', (_state, item, label) => {
    renderRow(item)
    expect(screen.getByRole('listitem', { name: label })).toBeInTheDocument()
  })
})

describe('focus', () => {
  const rows = (patch: Partial<RowsState>): RowsState => ({ ...IDLE_ROWS, ...patch })
  const renderFocus = (state: RowsState, item = upcoming!) =>
    render(
      <ul>
        <ItemRow item={item} now={today.now} timezone={today.timezone} rows={state} />
      </ul>,
    )

  it('the focused row is the tab stop, marked and holds DOM focus', () => {
    renderFocus(rows({ focusedId: upcoming!.id, tabStopId: upcoming!.id }))
    const row = screen.getByRole('listitem')
    expect(row).toHaveAttribute('tabindex', '0')
    expect(row).toHaveAttribute('data-focused', 'true')
    expect(row).toHaveFocus()
  })

  it('other rows are out of the tab order and do not steal focus', () => {
    renderFocus(rows({ focusedId: 'other', tabStopId: 'other' }))
    const row = screen.getByRole('listitem')
    expect(row).toHaveAttribute('tabindex', '-1')
    expect(row).not.toHaveAttribute('data-focused')
    expect(row).not.toHaveFocus()
  })

  it('with nothing focused, the tab stop row is reachable but not focused', () => {
    renderFocus(rows({ tabStopId: upcoming!.id }))
    const row = screen.getByRole('listitem')
    expect(row).toHaveAttribute('tabindex', '0')
    expect(row).not.toHaveFocus()
  })

  it('clicking a row focuses it', () => {
    const onFocusRow = vi.fn()
    renderFocus(rows({ onFocusRow }))
    fireEvent.click(screen.getByRole('listitem'))
    expect(onFocusRow).toHaveBeenCalledWith(upcoming!.id)
  })

  it('animates only the changed row, and tells the container when it settles', () => {
    const onChangeSettled = vi.fn()
    const state = rows({ changed: { id: upcoming!.id, kind: 'snooze' }, onChangeSettled })
    const { rerender } = renderFocus(state)
    const row = screen.getByRole('listitem')
    expect(row).toHaveAttribute('data-changed', 'snooze')

    fireEvent.animationEnd(row)
    expect(onChangeSettled).toHaveBeenCalledTimes(1)

    rerender(
      <ul>
        <ItemRow item={late!} now={today.now} timezone={today.timezone} rows={state} />
      </ul>,
    )
    expect(screen.getByRole('listitem')).not.toHaveAttribute('data-changed')
  })
})
