import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { expect, it, vi } from 'vitest'
import { useFocusTrap } from '../src/features/help/use-focus-trap'

function Panel({ onEscape, returnTo }: { onEscape: () => void; returnTo: HTMLElement | null }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, { onEscape, returnTo })
  return (
    <div ref={ref} role="dialog" aria-label="panel" tabIndex={-1}>
      <button type="button" data-autofocus>
        close
      </button>
      <button type="button">middle</button>
      <button type="button">last</button>
      <button type="button" disabled>
        disabled
      </button>
    </div>
  )
}

function Harness({ onEscape = () => undefined }: { onEscape?: () => void }) {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState<HTMLElement | null>(null)
  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          setFrom(event.currentTarget)
          setOpen(true)
        }}
      >
        trigger
      </button>
      <button type="button">outside</button>
      {open ? (
        <Panel
          returnTo={from}
          onEscape={() => {
            onEscape()
            setOpen(false)
          }}
        />
      ) : null}
    </>
  )
}

const opened = async (onEscape?: () => void) => {
  const user = userEvent.setup()
  render(<Harness {...(onEscape ? { onEscape } : {})} />)
  await user.click(screen.getByRole('button', { name: 'trigger' }))
  return user
}

it('moves focus to the marked control on mount', async () => {
  await opened()
  expect(screen.getByRole('button', { name: 'close' })).toHaveFocus()
})

it('wraps Tab from the last control to the first, skipping disabled ones', async () => {
  const user = await opened()
  await user.tab()
  expect(screen.getByRole('button', { name: 'middle' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: 'last' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: 'close' })).toHaveFocus()
})

it('wraps Shift+Tab from the first control to the last', async () => {
  const user = await opened()
  await user.tab({ shift: true })
  expect(screen.getByRole('button', { name: 'last' })).toHaveFocus()
})

it('calls onEscape on Escape and stops the key for later layers', async () => {
  const onEscape = vi.fn()
  await opened(onEscape)
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
  document.dispatchEvent(event)
  expect(onEscape).toHaveBeenCalledTimes(1)
  expect(event.defaultPrevented).toBe(true)
})

it('does not react to other keys', async () => {
  const onEscape = vi.fn()
  const user = await opened(onEscape)
  await user.keyboard('abc')
  expect(onEscape).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog', { name: 'panel' })).toBeInTheDocument()
})

it('returns focus to the trigger on close', async () => {
  const user = await opened()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'trigger' })).toHaveFocus()
})

it('pulls focus back in when it fell to the body, on Tab and Shift+Tab', async () => {
  const user = await opened()
  ;(document.activeElement as HTMLElement).blur()
  expect(document.body).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: 'close' })).toHaveFocus()
  ;(document.activeElement as HTMLElement).blur()
  await user.tab({ shift: true })
  expect(screen.getByRole('button', { name: 'last' })).toHaveFocus()
})

it('still closes on Escape when focus is on the body', async () => {
  const user = await opened()
  ;(document.activeElement as HTMLElement).blur()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('does not throw when the trigger left the document', () => {
  const gone = document.createElement('button')
  const { unmount } = render(<Panel onEscape={() => undefined} returnTo={gone} />)
  expect(() => unmount()).not.toThrow()
})
