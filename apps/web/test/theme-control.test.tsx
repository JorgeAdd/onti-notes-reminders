import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthForm } from '../src/features/auth/AuthForm'
import { DateColumn } from '../src/features/today/DateColumn'
import { DayPage } from '../src/features/today/DayPage'
import { TodayStatus } from '../src/features/today/TodayStatus'
import { ThemeControl } from '../src/features/theme/ThemeControl'
import { THEME_KEY } from '../src/features/theme/theme'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

const root = document.documentElement

beforeEach(() => localStorage.clear())
afterEach(() => {
  root.removeAttribute('data-theme')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const group = () => screen.getByRole('radiogroup', { name: messages.theme.label })
const radio = (name: string) => within(group()).getByRole('radio', { name })
const checked = () => within(group()).getAllByRole('radio', { checked: true })

describe('ThemeControl', () => {
  it('is a radiogroup of System, Light and Dark with one checked option', () => {
    render(<ThemeControl />)
    expect(
      within(group())
        .getAllByRole('radio')
        .map((r) => r.getAttribute('aria-label') ?? r.closest('label')?.textContent),
    ).toEqual([messages.theme.system, messages.theme.light, messages.theme.dark])
    expect(checked()).toHaveLength(1)
    expect(radio(messages.theme.system)).toBeChecked()
  })

  it('starts from the theme the page shows', () => {
    root.setAttribute('data-theme', 'dark')
    render(<ThemeControl />)
    expect(radio(messages.theme.dark)).toBeChecked()
  })

  it('applies and stores a choice at once, and clears the key for System', async () => {
    const user = userEvent.setup()
    render(<ThemeControl />)
    await user.click(radio(messages.theme.dark))
    expect(root.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    await user.click(radio(messages.theme.light))
    expect(root.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
    await user.click(radio(messages.theme.system))
    expect(root.hasAttribute('data-theme')).toBe(false)
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
  })

  it('moves with the arrow keys and applies the new choice', async () => {
    const user = userEvent.setup()
    render(<ThemeControl />)
    radio(messages.theme.system).focus()
    await user.keyboard('{ArrowRight}')
    expect(radio(messages.theme.light)).toBeChecked()
    expect(root.getAttribute('data-theme')).toBe('light')
    await user.keyboard('{ArrowRight}')
    expect(root.getAttribute('data-theme')).toBe('dark')
  })

  it('keeps the choice when the write fails, also after a remount', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => undefined,
    })
    const user = userEvent.setup()
    const { unmount } = render(<ThemeControl />)
    await user.click(radio(messages.theme.dark))
    expect(radio(messages.theme.dark)).toBeChecked()
    expect(root.getAttribute('data-theme')).toBe('dark')
    unmount()
    render(<ThemeControl />)
    expect(radio(messages.theme.dark)).toBeChecked()
  })

  it('makes no network call and answers to no global key', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    const user = userEvent.setup()
    render(<ThemeControl />)
    await user.click(radio(messages.theme.dark))
    await user.click(radio(messages.theme.system))
    await user.keyboard('t')
    await user.keyboard('d')
    await user.keyboard('{Control>}{Shift>}L{/Shift}{/Control}')
    expect(root.hasAttribute('data-theme')).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('placement', () => {
  const now = c4Response().now

  it('sits in the date column of Today, next to Sign out', () => {
    render(<DayPage today={c4Response()} now={now} onSignOut={() => undefined} />)
    const column = screen.getByRole('complementary')
    expect(within(column).getAllByRole('radiogroup')).toHaveLength(1)
    expect(within(column).getByRole('button', { name: messages.today.signOut })).toBeInTheDocument()
  })

  it('is on the sign-in card', () => {
    render(
      <AuthForm
        mode="signIn"
        busy={false}
        expired={false}
        notice={null}
        error={null}
        onSubmit={() => undefined}
        onToggleMode={() => undefined}
      />,
    )
    expect(screen.getAllByRole('radiogroup')).toHaveLength(1)
  })

  it('is absent from a date column rendered without the prop (All notes) and from the status card', () => {
    render(
      <DateColumn
        date="2026-10-07"
        isToday
        timezone="America/Mexico_City"
        note={null}
        onSignOut={() => undefined}
      />,
    )
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: messages.today.signOut })).toBeInTheDocument()
    render(<TodayStatus failed={false} onRetry={() => undefined} />)
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('is not passed by NotesPage [static]', () => {
    expect(readFileSync('src/features/notes/NotesPage.tsx', 'utf8')).not.toMatch(/showTheme/)
  })
})

describe('copy and style [static]', () => {
  const source = readFileSync('src/features/theme/ThemeControl.tsx', 'utf8')
  const css = readFileSync('src/features/theme/ThemeControl.module.css', 'utf8')

  it('takes every label from the messages module', () => {
    for (const label of Object.values(messages.theme)) {
      expect(source).not.toMatch(new RegExp(`['"\`>]${label}['"\`<]`))
    }
    expect(source).toContain('messages.theme')
  })

  it('has 44 px targets, a visible focus ring, an ink selected state and no vermilion', () => {
    expect(css).toMatch(/min-width:\s*var\(--size-target\)/)
    expect(css).toMatch(/min-height:\s*var\(--size-target\)/)
    expect(css).toMatch(/:focus-visible[^{]*\{[^}]*var\(--focus-ring\)/)
    expect(css).toMatch(/:checked[^{]*\{[^}]*background:\s*var\(--color-ink\)/)
    expect(css).not.toMatch(/--color-date|--core-|transition|animation/)
  })
})
