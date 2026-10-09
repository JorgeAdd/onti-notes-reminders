import type { TodayResponse } from '@onti/shared'
import { fireEvent, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useTodayRows } from '../src/features/today/use-today-rows'
import { c4Response } from './today-fixture'

const today: TodayResponse = c4Response()
const actions = { snooze: vi.fn(), done: vi.fn(), undo: vi.fn() }
const days = {
  offToday: false,
  filterActive: false,
  hasTags: false,
  onStep: vi.fn(),
  onToday: vi.fn(),
  onTags: vi.fn(),
  onClearFilter: vi.fn(),
}

const mount = (bar: Partial<Parameters<typeof useTodayRows>[2]>) =>
  renderHook(() =>
    useTodayRows(
      today,
      actions,
      { open: false, onOpen: vi.fn(), mobile: false, blocked: false, ...bar },
      undefined,
      days,
    ),
  )

const press = (key: string) => fireEvent.keyDown(document, { key })

it('calls onHelp on ? and runs no row action', () => {
  const onHelp = vi.fn()
  mount({ onHelp })
  press('?')
  expect(onHelp).toHaveBeenCalledTimes(1)
  expect(actions.done).not.toHaveBeenCalled()
  expect(actions.snooze).not.toHaveBeenCalled()
  expect(actions.undo).not.toHaveBeenCalled()
})

it('does not call onHelp for other keys', () => {
  const onHelp = vi.fn()
  mount({ onHelp })
  press('q')
  press('/')
  expect(onHelp).not.toHaveBeenCalled()
})

it('is inert while a bar is open (the layer is off)', () => {
  const onHelp = vi.fn()
  mount({ onHelp, open: true })
  press('?')
  expect(onHelp).not.toHaveBeenCalled()
})

it('does not consume ? when nothing handles it', () => {
  mount({})
  const event = new KeyboardEvent('keydown', { key: '?', cancelable: true })
  document.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(false)
})

it('consumes ? when it opens help', () => {
  mount({ onHelp: vi.fn() })
  const event = new KeyboardEvent('keydown', { key: '?', cancelable: true })
  document.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(true)
})
