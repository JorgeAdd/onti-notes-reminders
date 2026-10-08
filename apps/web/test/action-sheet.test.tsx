import { at, TZ } from '@onti/shared/fixtures/jorge-week'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { ActionSheet } from '../src/features/today/ActionSheet'
import { WhichKey } from '../src/features/today/WhichKey'
import { messages } from '../src/messages'

const NOW = at('2026-10-07 09:05')
const item = (doneAt: Date | null) => ({
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Send rate-limit numbers to the infra team',
  tags: [],
  dueAt: at('2026-10-07 09:30'),
  originalDueAt: at('2026-10-07 09:30'),
  snoozeCount: 0,
  doneAt,
})

const noHandlers = { onDone: vi.fn(), onUndo: vi.fn(), onSnooze: vi.fn(), onClose: vi.fn() }

function setup(doneAt: Date | null = null) {
  const handlers = { onDone: vi.fn(), onUndo: vi.fn(), onSnooze: vi.fn(), onClose: vi.fn() }
  const user = userEvent.setup()
  render(<ActionSheet item={item(doneAt)} now={NOW} timezone={TZ} {...handlers} />)
  return { user, ...handlers }
}

describe('ActionSheet (SG14)', () => {
  it('an open item offers Done, +1 h and Tomorrow with their resulting times', async () => {
    const { user, onDone, onSnooze, onUndo, onClose } = setup()
    const sheet = screen.getByRole('dialog', {
      name: messages.actionSheet.label(item(null).title),
    })
    expect(sheet).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: messages.actionSheet.done }))
    await user.click(screen.getByRole('button', { name: messages.whichKey.hour('10:05') }))
    await user.click(screen.getByRole('button', { name: messages.whichKey.tomorrow('Thu 09:00') }))

    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onSnooze.mock.calls).toEqual([['hour'], ['tomorrow']])
    expect(onUndo).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it.each(['2026-10-07 09:05', '2026-10-07 23:30'])(
    'shows the same times WhichKey shows at %s (shared math, same clock)',
    (when) => {
      const now = at(when)
      render(<WhichKey now={now} timezone={TZ} />)
      const menu = screen.getByRole('list').textContent
      render(<ActionSheet item={item(null)} now={now} timezone={TZ} {...noHandlers} />)

      const snoozes = screen.getAllByRole('button', { name: /→/ })
      expect(snoozes).toHaveLength(2)
      for (const button of snoozes) expect(menu).toContain(button.textContent)
    },
  )

  it('a done item offers Undo only', async () => {
    const { user, onUndo } = setup(at('2026-10-07 09:00'))

    expect(
      screen.queryByRole('button', { name: messages.actionSheet.done }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^\+1 h/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: messages.actionSheet.undo }))

    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  it('esc and Close both close it', async () => {
    const { user, onClose } = setup()

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: messages.actionSheet.close }))

    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('every button is at least the 44 px target and uses tokens only', () => {
    const css = readFileSync('src/features/today/ActionSheet.module.css', 'utf8')
    expect(css).toMatch(/min-height:\s*var\(--size-target\)/)
    expect(css).toMatch(/:focus-visible\s*\{[^}]*var\(--focus-ring\)/)
    expect(css).not.toMatch(/#[0-9a-f]{3,6}\b|--core-|font-size|(?<![\d.])(?!1px)\d+px/i)
  })
})
