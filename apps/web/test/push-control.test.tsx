import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  env: {
    VITE_SUPABASE_URL: 'http://localhost:54321',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'test-key',
    VITE_API_URL: 'http://localhost:3000',
    VITE_VAPID_PUBLIC_KEY: undefined as string | undefined,
  },
  api: { subscribePush: vi.fn(), unsubscribePush: vi.fn() },
  session: { access_token: 'jwt-1', user: { id: 'user-1' } },
}))
vi.mock('../src/lib/env', () => ({ env: mocks.env }))
vi.mock('../src/features/push/push-api', () => mocks.api)
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: mocks.session } }) },
  },
}))

import { PushContainer } from '../src/features/push/PushContainer'
import { PushControl } from '../src/features/push/PushControl'
import { DateColumn } from '../src/features/today/DateColumn'
import { DayPage } from '../src/features/today/DayPage'
import { MobileBar } from '../src/features/today/MobileBar'
import { messages } from '../src/messages'
import { calls, fakeSubscription, installBrowser, KEY, removeBrowser } from './push-browser'
import { c4Response } from './today-fixture'

const t = messages.notifications

beforeEach(() => {
  calls.length = 0
  mocks.env.VITE_VAPID_PUBLIC_KEY = KEY
  mocks.api.subscribePush.mockReset().mockResolvedValue(undefined)
  mocks.api.unsubscribePush.mockReset().mockResolvedValue(undefined)
})
afterEach(() => {
  removeBrowser()
  vi.restoreAllMocks()
})

const noop = () => undefined
const control = (props: Partial<Parameters<typeof PushControl>[0]> = {}) =>
  render(
    <PushControl
      state="default"
      busy={false}
      failed={false}
      onEnable={noop}
      onDisable={noop}
      {...props}
    />,
  )

describe('PushControl', () => {
  it('default: offers to enable, and a click runs onEnable', async () => {
    const onEnable = vi.fn()
    control({ onEnable })
    await userEvent.click(screen.getByRole('button', { name: t.enable }))
    expect(onEnable).toHaveBeenCalledTimes(1)
  })

  it('granted: says it is on and offers to turn off', async () => {
    const onDisable = vi.fn()
    control({ state: 'granted', onDisable })
    expect(screen.getByText(t.on)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: t.turnOff }))
    expect(onDisable).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: t.enable })).not.toBeInTheDocument()
  })

  it('denied: explains that items still appear in Today (C7), with no action', () => {
    control({ state: 'denied' })
    expect(screen.getByText(t.denied)).toBeInTheDocument()
    expect(t.denied).toMatch(/Today/)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('unsupported: explains, with no action', () => {
    control({ state: 'unsupported' })
    expect(screen.getByText(t.unsupported)).toBeInTheDocument()
    expect(t.unsupported).toMatch(/Today/)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('busy disables the action; failed adds one error line', () => {
    const { rerender } = control({ busy: true })
    expect(screen.getByRole('button', { name: t.enable })).toBeDisabled()
    rerender(<PushControl state="default" busy={false} failed onEnable={noop} onDisable={noop} />)
    expect(screen.getByRole('alert')).toHaveTextContent(t.failed)
    expect(screen.getByRole('button', { name: t.enable })).toBeEnabled()
  })
})

describe('PushContainer', () => {
  it('renders nothing and touches no browser API without VITE_VAPID_PUBLIC_KEY', () => {
    mocks.env.VITE_VAPID_PUBLIC_KEY = undefined
    const { notification, pushManager } = installBrowser({ permission: 'granted' })
    const { container } = render(<PushContainer />)
    expect(container).toBeEmptyDOMElement()
    expect(pushManager.getSubscription).not.toHaveBeenCalled()
    expect(notification.requestPermission).not.toHaveBeenCalled()
  })

  it('never prompts on mount: it only offers', async () => {
    const { notification } = installBrowser({ permission: 'default' })
    render(<PushContainer />)
    expect(await screen.findByRole('button', { name: t.enable })).toBeInTheDocument()
    expect(notification.requestPermission).not.toHaveBeenCalled()
  })

  it('enables on click: permission, subscribe, POST with the session token, then on', async () => {
    installBrowser({ permission: 'default', requested: 'granted' })
    render(<PushContainer />)
    await userEvent.click(await screen.findByRole('button', { name: t.enable }))
    expect(await screen.findByRole('button', { name: t.turnOff })).toBeInTheDocument()
    expect(calls).toEqual(['requestPermission', 'subscribe'])
    expect(mocks.api.subscribePush).toHaveBeenCalledWith('jwt-1', expect.anything())
  })

  it('shows the denied copy after a refused prompt and makes no subscribe call', async () => {
    installBrowser({ permission: 'default', requested: 'denied' })
    render(<PushContainer />)
    await userEvent.click(await screen.findByRole('button', { name: t.enable }))
    expect(await screen.findByText(t.denied)).toBeInTheDocument()
    expect(mocks.api.subscribePush).not.toHaveBeenCalled()
  })

  it('shows one error line when the subscribe call fails, and offers to try again', async () => {
    installBrowser({ permission: 'default', requested: 'granted' })
    mocks.api.subscribePush.mockRejectedValue(new Error('503'))
    render(<PushContainer />)
    await userEvent.click(await screen.findByRole('button', { name: t.enable }))
    expect(await screen.findByRole('alert')).toHaveTextContent(t.failed)
    expect(screen.getByRole('button', { name: t.enable })).toBeEnabled()
  })

  it('turns off: unsubscribes, deletes the row, and offers to enable again', async () => {
    const existing = fakeSubscription('https://push.example.com/off')
    installBrowser({ permission: 'granted', existing })
    render(<PushContainer />)
    await userEvent.click(await screen.findByRole('button', { name: t.turnOff }))
    expect(await screen.findByRole('button', { name: t.enable })).toBeInTheDocument()
    expect(existing.unsubscribe).toHaveBeenCalledTimes(1)
    expect(mocks.api.unsubscribePush).toHaveBeenCalledWith('jwt-1', 'https://push.example.com/off')
  })

  it('shows the unsupported copy in a browser without Notification', async () => {
    render(<PushContainer />)
    expect(await screen.findByText(t.unsupported)).toBeInTheDocument()
  })

  it('re-syncs a granted, subscribed browser once per load, not on every remount', async () => {
    const existing = fakeSubscription('https://push.example.com/resync')
    installBrowser({ permission: 'granted', existing })
    const first = render(<PushContainer />)
    await screen.findByRole('button', { name: t.turnOff })
    await waitFor(() => expect(mocks.api.subscribePush).toHaveBeenCalledTimes(1))
    expect(mocks.api.subscribePush).toHaveBeenCalledWith(
      'jwt-1',
      expect.objectContaining({ endpoint: 'https://push.example.com/resync' }),
    )
    first.unmount()
    render(<PushContainer />)
    await screen.findByRole('button', { name: t.turnOff })
    expect(mocks.api.subscribePush).toHaveBeenCalledTimes(1)
  })

  it('does not re-sync a browser that is not subscribed', async () => {
    installBrowser({ permission: 'default' })
    render(<PushContainer />)
    await screen.findByRole('button', { name: t.enable })
    expect(mocks.api.subscribePush).not.toHaveBeenCalled()
  })
})

describe('placement', () => {
  const column = (showTheme: boolean) =>
    render(
      <DateColumn
        date="2026-10-07"
        isToday
        timezone="America/Mexico_City"
        note={null}
        onSignOut={noop}
        showTheme={showTheme}
        notifications={<p>slot</p>}
      />,
    )

  it('sits in the date column right under the theme control, above Sign out', () => {
    column(true)
    const group = screen.getByRole('radiogroup', { name: messages.theme.label })
    const slot = screen.getByText('slot')
    expect(slot.previousElementSibling).toBe(group)
    expect(slot.nextElementSibling).toBe(
      screen.getByRole('button', { name: messages.today.signOut }),
    )
  })

  it('follows the theme control gate: Today only, absent without showTheme', () => {
    column(false)
    expect(screen.queryByText('slot')).not.toBeInTheDocument()
  })

  it('is a slot of the mobile bar, after the other buttons', () => {
    render(<MobileBar onSearch={noop} onCapture={noop} notifications={<p>slot</p>} />)
    const bar = screen.getByRole('navigation')
    expect(bar.lastElementChild).toBe(screen.getByText('slot'))
  })

  it('desktop DayPage puts the control in the date column, not in the bar', async () => {
    installBrowser({ permission: 'default' })
    render(<DayPage today={c4Response()} now={c4Response().now} onSignOut={noop} />)
    const aside = screen.getByRole('complementary')
    expect(await within(aside).findByRole('button', { name: t.enable })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: t.enable })).toHaveLength(1)
  })

  it('phone DayPage puts the one control in the bottom bar, not in the column', async () => {
    installBrowser({ permission: 'default' })
    render(<DayPage today={c4Response()} now={c4Response().now} onSignOut={noop} mobile />)
    const bar = screen.getByRole('navigation')
    expect(await within(bar).findByRole('button', { name: t.enable })).toBeInTheDocument()
    expect(
      within(screen.getByRole('complementary')).queryByRole('button', { name: t.enable }),
    ).toBeNull()
  })

  it('DayPage shows nothing without the key', () => {
    mocks.env.VITE_VAPID_PUBLIC_KEY = undefined
    installBrowser({ permission: 'default' })
    render(<DayPage today={c4Response()} now={c4Response().now} onSignOut={noop} />)
    expect(screen.queryByRole('button', { name: t.enable })).not.toBeInTheDocument()
  })

  it('is not part of All notes or the sign-in card [static]', () => {
    for (const path of ['features/notes/NotesPage.tsx', 'features/auth/AuthForm.tsx']) {
      expect(readFileSync(`src/${path}`, 'utf8')).not.toMatch(/PushContainer|notifications/)
    }
  })
})

describe('copy and style [static]', () => {
  const source = readFileSync('src/features/push/PushControl.tsx', 'utf8')
  const css = readFileSync('src/features/push/PushControl.module.css', 'utf8')

  it('takes every string from messages.notifications', () => {
    for (const text of Object.values(t)) {
      expect(source).not.toContain(text)
    }
    expect(source).toContain('messages.notifications')
  })

  it('has 44 px targets, an ink focus ring, tokens only, no vermilion and no motion', () => {
    expect(css).toMatch(/min-height:\s*var\(--size-target\)/)
    expect(css).toMatch(/:focus-visible[^{]*\{[^}]*var\(--focus-ring\)/)
    expect(css).not.toMatch(/--color-date|--core-|transition|animation|font-size/)
    expect(css).not.toMatch(/#[0-9a-f]{3,6}\b|(?<![\d.])(?!1px)\d+px/i)
  })

  it('lets the phone bar wrap instead of scrolling when four targets do not fit at 375 px', () => {
    expect(readFileSync('src/features/today/MobileBar.module.css', 'utf8')).toMatch(
      /\.bar\s*\{[^}]*flex-wrap:\s*wrap/,
    )
  })
})
