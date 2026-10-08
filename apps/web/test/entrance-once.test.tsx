import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthForm } from '../src/features/auth/AuthForm'
import { DayPage } from '../src/features/today/DayPage'
import { TodayStatus } from '../src/features/today/TodayStatus'
import { resetEntranceForTests } from '../src/lib/entrance'
import { messages } from '../src/messages'
import { blocks, readSrc } from './css-tokens'
import { c4Response } from './today-fixture'

beforeEach(() => resetEntranceForTests())

const now = c4Response().now
const day = (today = c4Response(), onSignOut = () => undefined) => (
  <DayPage today={today} now={now} onSignOut={onSignOut} />
)
const auth = (
  <AuthForm
    mode="signIn"
    busy={false}
    expired={false}
    notice={null}
    error={null}
    onSubmit={() => undefined}
    onToggleMode={() => undefined}
  />
)
const entranceNodes = (container: HTMLElement) => container.querySelectorAll('[data-entrance]')

describe('plays once per full page load', () => {
  it('marks the first DayPage and no later one', () => {
    const first = render(day())
    expect(entranceNodes(first.container)).toHaveLength(1)
    first.unmount()
    // All notes round trip: Today mounts again in the same page load.
    const second = render(day())
    expect(entranceNodes(second.container)).toHaveLength(0)
  })

  it('marks the first sign-in card, and the DayPage after signing in gets none', () => {
    const card = render(auth)
    expect(entranceNodes(card.container)).toHaveLength(1)
    card.unmount()
    const page = render(day())
    expect(entranceNodes(page.container)).toHaveLength(0)
  })

  it('plays again after a fresh load (the flag lives in the module)', async () => {
    render(day()).unmount()
    vi.resetModules()
    const fresh = await import('../src/features/today/DayPage')
    const { container } = render(
      <fresh.DayPage today={c4Response()} now={now} onSignOut={() => undefined} />,
    )
    expect(entranceNodes(container)).toHaveLength(1)
  })

  it('keeps the same node on re-render, refetch data and day navigation', () => {
    const { container, rerender } = render(day())
    const sheet = container.querySelector('[data-entrance]')
    rerender(day({ ...c4Response('2026-10-09'), openCount: 2 }))
    expect(container.querySelector('[data-entrance]')).toBe(sheet)
    expect(entranceNodes(container)).toHaveLength(1)
  })

  it('counts a StrictMode double mount once', () => {
    const strict = render(<StrictMode>{day()}</StrictMode>)
    expect(entranceNodes(strict.container)).toHaveLength(1)
    strict.unmount()
    expect(entranceNodes(render(<StrictMode>{day()}</StrictMode>).container)).toHaveLength(0)
  })

  it('is not consumed by the pending status card', () => {
    render(<TodayStatus failed={false} onRetry={() => undefined} />).unmount()
    expect(entranceNodes(render(day()).container)).toHaveLength(1)
  })
})

describe('does not replay after it ends', () => {
  const phone = (capture: boolean) => (
    <DayPage
      today={c4Response()}
      now={now}
      onSignOut={() => undefined}
      mobile
      capture={
        capture
          ? { draft: '', notice: null, onSubmit: () => undefined, onClose: () => undefined }
          : null
      }
    />
  )
  const desk = (container: HTMLElement) => container.firstElementChild as HTMLElement

  it('clears the attribute on animationend, so a remounted bar does not fade in again', async () => {
    const { container, rerender } = render(phone(false))
    expect(desk(container)).toHaveAttribute('data-entrance')
    fireEvent.animationEnd(desk(container))
    expect(desk(container)).not.toHaveAttribute('data-entrance')
    rerender(phone(true))
    rerender(phone(false))
    expect(entranceNodes(container)).toHaveLength(0)
    await act(() => Promise.resolve())
  })

  it('keeps the attribute while another entrance animation is still running', () => {
    const { container } = render(phone(false))
    const el = desk(container)
    el.getAnimations = (() => [{ playState: 'running' }]) as unknown as typeof el.getAnimations
    fireEvent.animationEnd(el)
    expect(el).toHaveAttribute('data-entrance')
    el.getAnimations = (() => [{ playState: 'finished' }]) as unknown as typeof el.getAnimations
    fireEvent.animationEnd(el)
    expect(el).not.toHaveAttribute('data-entrance')
  })

  it('does the same on the sign-in card', () => {
    const { container } = render(auth)
    fireEvent.animationEnd(container.querySelector('[data-entrance]')!)
    expect(entranceNodes(container)).toHaveLength(0)
  })
})

describe('interactive from the first frame', () => {
  it('signs out while the entrance is marked', () => {
    const onSignOut = vi.fn()
    const { container } = render(day(c4Response(), onSignOut))
    expect(entranceNodes(container)).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: messages.today.signOut }))
    expect(onSignOut).toHaveBeenCalledOnce()
  })

  it('types into the sign-in card while the entrance is marked', async () => {
    const { container } = render(auth)
    expect(entranceNodes(container)).toHaveLength(1)
    const email = screen.getByLabelText(messages.auth.email)
    await userEvent.type(email, 'a@b.co')
    expect(email).toHaveValue('a@b.co')
    expect(screen.queryByText(/skip/i)).not.toBeInTheDocument()
  })
})

describe('entrance classes [static]', () => {
  const composed = (file: string, selector: string, name: string) => {
    const rule = blocks(readSrc(file)).find((b) => b.header === selector)
    expect(rule?.body).toMatch(
      new RegExp(`composes:\\s*${name}\\s+from\\s+['"][./]*styles/entrance\\.module\\.css['"]`),
    )
  }

  it('composes the sheet on both sheets, the date block, and the capture bar', () => {
    composed('features/today/DayPage.module.css', '.page', 'sheet')
    composed('features/auth/AuthForm.module.css', '.page', 'sheet')
    composed('features/today/DateColumn.module.css', '.block', 'date')
    composed('features/today/MobileBar.module.css', '.bar', 'last')
  })

  it('animates no field or row', () => {
    expect(readSrc('features/auth/AuthForm.module.css').match(/entrance\.module/g)).toHaveLength(1)
    expect(readSrc('features/today/ItemRow.module.css')).not.toMatch(/entrance\.module/)
  })

  it('carries the flag on the desk, an ancestor of the sheet', () => {
    expect(readSrc('features/today/DayPage.tsx')).toMatch(/\{\.\.\.entrance\}/)
    expect(readSrc('features/auth/AuthForm.tsx')).toMatch(/\{\.\.\.entrance\}/)
  })
})
