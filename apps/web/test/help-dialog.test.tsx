import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HelpDialog from '../src/features/help/HelpDialog'
import { messages } from '../src/messages'

afterEach(() => vi.unstubAllGlobals())

function narrow(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

function open(isNarrow: boolean, returnTo: HTMLElement | null = null) {
  narrow(isNarrow)
  const onClose = vi.fn()
  const view = render(
    <div data-testid="dock">
      <HelpDialog onClose={onClose} returnTo={returnTo} />
    </div>,
  )
  return { onClose, user: userEvent.setup(), ...view }
}

describe('HelpDialog · accessibility', () => {
  it('is a modal dialog named by its title', () => {
    open(false)
    const dialog = screen.getByRole('dialog', { name: messages.help.title })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent(messages.help.title)
  })

  it('starts with focus on the close button, which closes it', async () => {
    const { onClose, user } = open(false)
    const close = screen.getByRole('button', { name: messages.help.close })
    expect(close).toHaveFocus()
    await user.click(close)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape', async () => {
    const { onClose, user } = open(false)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps Tab inside the dialog', async () => {
    const { user } = open(false)
    await user.tab()
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement)
    await user.tab({ shift: true })
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement)
  })

  it('returns focus to the trigger on close', () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    const { unmount } = open(false, trigger)
    unmount()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })
})

describe('HelpDialog · desktop', () => {
  it('is a portal over the page: a scrim click closes, a click inside does not', async () => {
    const { onClose, user, getByTestId } = open(false)
    const dialog = screen.getByRole('dialog')
    expect(getByTestId('dock')).not.toContainElement(dialog)
    await user.click(within(dialog).getByRole('heading', { level: 2 }))
    expect(onClose).not.toHaveBeenCalled()
    await user.click(dialog.parentElement as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows the four sections with their key rows and examples, and no touch wording', () => {
    open(false)
    const dialog = screen.getByRole('dialog')
    const titles = within(dialog)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent)
    expect(titles).toEqual(Object.values(messages.help.sections))
    for (const hint of Object.values(messages.statusline.keys))
      expect(dialog).toHaveTextContent(hint)
    expect(dialog).toHaveTextContent(messages.note.hints.delete)
    for (const { input, shows } of messages.help.examples) {
      expect(within(dialog).getByText(input)).toBeInTheDocument()
      expect(within(dialog).getByText(shows)).toBeInTheDocument()
    }
    expect(dialog).not.toHaveTextContent(messages.mobile.capture)
    expect(dialog).not.toHaveTextContent(messages.mobile.search)
  })
})

describe('HelpDialog · phone width', () => {
  it('renders inside the dock, with a backdrop that closes it', async () => {
    const { onClose, user, getByTestId } = open(true)
    expect(getByTestId('dock')).toContainElement(screen.getByRole('dialog'))
    await user.click(screen.getByTestId('help-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('replaces the keys with the touch equivalents and keeps the examples', () => {
    open(true)
    const dialog = screen.getByRole('dialog')
    for (const label of [
      messages.mobile.capture,
      messages.mobile.search,
      messages.mobile.tags,
      messages.actionSheet.done,
    ])
      expect(dialog).toHaveTextContent(label)
    expect(dialog).not.toHaveTextContent(messages.statusline.keys.move)
    expect(dialog).not.toHaveTextContent(messages.statusline.keys.capture)
    for (const { input } of messages.help.examples)
      expect(within(dialog).getByText(input)).toBeInTheDocument()
    expect(within(dialog).getAllByRole('heading', { level: 3 })).toHaveLength(4)
  })
})

describe('help components · copy and ids [static]', () => {
  const files = ['HelpDialog.tsx', 'HelpContent.tsx'].map((name) =>
    readFileSync(join(__dirname, '..', 'src', 'features', 'help', name), 'utf8'),
  )

  it('has no user-facing literal outside messages', () => {
    for (const source of files) {
      expect(source).not.toMatch(/>\s*[A-Za-z?][^<>{}]*</)
      expect(source).not.toMatch(/\b(aria-label|title|placeholder|alt)="/)
    }
  })

  it('shows no seed id', () => {
    for (const source of files) expect(source).not.toMatch(/\bN\d{1,2}\b/)
  })
})

describe('HelpDialog · v2 note', () => {
  it.each([false, true])(
    'ends with the "coming in v2" note, plain text (narrow: %s)',
    (isNarrow) => {
      open(isNarrow)
      const dialog = screen.getByRole('dialog', { name: messages.help.title })
      const note = within(dialog).getByText(messages.help.comingInV2)
      expect(note.closest('button, a')).toBeNull()
      expect(within(note).queryByRole('button')).toBeNull()
    },
  )
})
