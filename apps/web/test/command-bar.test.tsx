import { at, TZ } from '@onti/shared/fixtures/jorge-week'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { CommandBar } from '../src/features/today/CommandBar'
import { messages } from '../src/messages'

const NOW = at('2026-10-06 11:12')
const C1 = 'Notify Ana: move repo permissions from me to Luis #client-a 17:00'

function setup(props: Partial<Parameters<typeof CommandBar>[0]> = {}) {
  const onSubmit = vi.fn()
  const onClose = vi.fn()
  const user = userEvent.setup()
  render(
    <CommandBar
      now={NOW}
      timezone={TZ}
      draft=""
      notice={null}
      onSubmit={onSubmit}
      onClose={onClose}
      {...props}
    />,
  )
  return {
    user,
    onSubmit,
    onClose,
    input: screen.getByRole('textbox', { name: messages.capture.label }),
  }
}

describe('CommandBar', () => {
  it('opens focused and shows the live italic preview from the display clock (C1)', async () => {
    const { user, input } = setup()
    expect(input).toHaveFocus()
    expect(screen.queryByText(/^→/)).not.toBeInTheDocument()

    await user.type(input, C1)

    expect(screen.getByText('→ Client A · today 17:00 · in 5h48')).toBeInTheDocument()
  })

  it('↵ sends the structured payload the preview described, once', async () => {
    const { user, onSubmit, input } = setup()

    await user.type(input, `${C1}{Enter}`)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      text: C1,
      capture: {
        title: 'Notify Ana: move repo permissions from me to Luis',
        tags: [{ slug: 'client-a', name: 'Client A' }],
        dueAt: at('2026-10-06 17:00'),
      },
    })
  })

  it('↵ on an empty title stays open with a one-line hint, then typing clears it', async () => {
    const { user, onSubmit, onClose, input } = setup()

    await user.type(input, '{Enter}')
    expect(screen.getByText(messages.capture.titleRequired)).toBeInTheDocument()
    await user.type(input, '#client-a 17:00{Enter}')
    expect(screen.getByText(messages.capture.titleRequired)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()

    await user.type(input, ' Call')
    expect(screen.queryByText(messages.capture.titleRequired)).not.toBeInTheDocument()
  })

  it('↵ on a 201-character title is blocked with its own hint', async () => {
    const { user, onSubmit, input } = setup({ draft: 'x'.repeat(201) })

    await user.type(input, '{Enter}')

    expect(screen.getByText(messages.capture.titleTooLong(200))).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('esc closes without sending', async () => {
    const { user, onSubmit, onClose } = setup({ draft: 'Call back' })

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('reopens with the typed text and the failure line after a failed capture', () => {
    const { input } = setup({ draft: 'Call back #client-a', notice: 'Could not save it.' })

    expect(input).toHaveValue('Call back #client-a')
    expect(screen.getByRole('status')).toHaveTextContent('Could not save it.')
    expect(screen.getByText('→ Client A · note, no reminder')).toBeInTheDocument()
  })

  it('the preview fades in with --motion-fade only (SG15, SG16)', () => {
    const css = readFileSync('src/features/today/CommandBar.module.css', 'utf8')
    expect(css).toMatch(/animation:[^;]*var\(--motion-fade\)/)
    expect(css).not.toMatch(/\d(ms|s)\b/)
    expect(css).not.toMatch(/#[0-9a-f]{3,6}\b|--core-/i)
  })
})
