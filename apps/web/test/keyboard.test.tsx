import type { NoteResponse, TodayResponse } from '@onti/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { useState } from 'react'
import { flushSync } from 'react-dom'
import { describe, expect, it, vi } from 'vitest'
import { TodayContainer } from '../src/features/today/TodayContainer'
import { useKeyboardLayer } from '../src/features/today/use-keyboard-layer'
import type { ReminderApi } from '../src/features/today/mutations/use-reminder-actions'
import { messages } from '../src/messages'
import { c4Response } from './today-fixture'

const MARTA = 'Reply to Marta about the staging deploy window'
const STANDUP = 'Standup: mention the flaky checkout e2e test'
const SEND = 'Send rate-limit numbers to the infra team'

const pending = () => new Promise<NoteResponse>(() => undefined)

function setup(
  today: TodayResponse = c4Response(),
  api: Partial<ReminderApi> = {},
  onOpenNote?: (id: string, edit?: boolean) => void,
) {
  const reminders: ReminderApi = {
    snooze: vi.fn(pending),
    done: vi.fn(pending),
    undo: vi.fn(pending),
    capture: vi.fn(pending),
    ...api,
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={client}>
      <TodayContainer
        load={() => Promise.resolve(today)}
        onSessionExpired={() => undefined}
        onSignOut={() => undefined}
        syncTimezone={() => Promise.resolve()}
        reminders={reminders}
        browserTimeZone={() => 'America/Mexico_City'}
        {...(onOpenNote ? { onOpenNote } : {})}
      />
    </QueryClientProvider>,
  )
  return { user, reminders, today }
}

const row = (title: string) =>
  screen.getByRole('listitem', { name: (name) => name.startsWith(title) })
const idOf = (today: TodayResponse, title: string) =>
  [...today.carried.flatMap((g) => g.items), ...today.rail].find((i) => i.title === title)!.id
const footer = () => screen.getByRole('contentinfo')

async function ready() {
  const view = setup()
  await screen.findByRole('heading', { level: 1 })
  return view
}

describe('j / k move focus over the rows', () => {
  it('j walks carried then rail, k walks back, both stop at the ends', async () => {
    const { user } = await ready()

    await user.keyboard('j')
    expect(row(MARTA)).toHaveFocus()
    await user.keyboard('jj')
    expect(row(STANDUP)).toHaveFocus()
    await user.keyboard('jjj')
    expect(row(SEND)).toHaveFocus()
    await user.keyboard('k')
    expect(row(STANDUP)).toHaveFocus()
  })

  it('clicking a row focuses it and the next j continues from there', async () => {
    const { user } = await ready()

    await user.click(row(STANDUP))
    await user.keyboard('j')

    expect(row(SEND)).toHaveFocus()
  })
})

describe('x done and z undo', () => {
  it('x marks the focused open item done at once, keeps focus, and calls the API once', async () => {
    const { user, reminders, today } = await ready()
    await user.keyboard('jjj')

    await user.keyboard('x')

    expect(reminders.done).toHaveBeenCalledExactlyOnceWith(idOf(today, STANDUP))
    await waitFor(() => expect(within(row(STANDUP)).getByText(STANDUP).closest('s')).not.toBeNull())
    expect(row(STANDUP)).toHaveFocus()
  })

  it('done on a carried item sends it off the page and focus moves to the next row', async () => {
    const { user } = await ready()
    await user.keyboard('j')

    await user.keyboard('x')

    await waitFor(() => expect(screen.queryByText(MARTA)).not.toBeInTheDocument())
    expect(row('Update the estimate')).toHaveFocus()
  })

  it('z reopens a done item, and does nothing on an open one', async () => {
    const today = c4Response()
    today.rail = today.rail.map((i) => (i.title === STANDUP ? { ...i, doneAt: today.now } : i))
    const { user, reminders } = setup(today)
    await screen.findByRole('heading', { level: 1 })

    await user.keyboard('jj')
    await user.keyboard('z')
    expect(reminders.undo).not.toHaveBeenCalled()

    await user.keyboard('j')
    await user.keyboard('z')
    expect(reminders.undo).toHaveBeenCalledExactlyOnceWith(idOf(today, STANDUP))
    await waitFor(() => expect(within(row(STANDUP)).getByText(STANDUP).closest('s')).toBeNull())
  })

  it('a done item offers undo only: x and s do nothing on it', async () => {
    const today = c4Response()
    today.rail = today.rail.map((i) => (i.title === STANDUP ? { ...i, doneAt: today.now } : i))
    const { user, reminders } = setup(today)
    await screen.findByRole('heading', { level: 1 })
    await user.keyboard('jjj')

    await user.keyboard('xsh')

    expect(reminders.done).not.toHaveBeenCalled()
    expect(reminders.snooze).not.toHaveBeenCalled()
    expect(footer()).toHaveTextContent(messages.statusline.keys.undo)
    expect(footer()).not.toHaveTextContent(messages.statusline.keys.done)
    expect(footer()).not.toHaveTextContent(messages.statusline.keys.snooze)
  })
})

describe('s then h / t snooze, with a which-key menu', () => {
  it('s h snoozes +1 h: due now + 1 h, count 1, focus follows the item', async () => {
    const { user, reminders, today } = await ready()
    await user.keyboard('jjj')

    await user.keyboard('sh')

    expect(reminders.snooze).toHaveBeenCalledExactlyOnceWith(idOf(today, STANDUP), 'hour')
    await waitFor(() => expect(row(STANDUP)).toHaveTextContent('10:05'))
    expect(row(STANDUP)).toHaveTextContent(messages.today.snoozeCount(1))
    expect(row(STANDUP)).toHaveFocus()
    expect(screen.queryByRole('list', { name: messages.whichKey.label })).not.toBeInTheDocument()
  })

  it('s t sends the item to tomorrow: it leaves the page and focus moves on', async () => {
    const { user, reminders, today } = await ready()
    await user.keyboard('jjj')

    await user.keyboard('st')

    expect(reminders.snooze).toHaveBeenCalledExactlyOnceWith(idOf(today, STANDUP), 'tomorrow')
    await waitFor(() => expect(screen.queryByText(STANDUP)).not.toBeInTheDocument())
    expect(row(SEND)).toHaveFocus()
  })

  it('s opens the menu with the resulting times, and the statusline switches to menu keys', async () => {
    const { user } = await ready()
    await user.keyboard('jjj')

    await user.keyboard('s')

    const menu = screen.getByRole('list', { name: messages.whichKey.label })
    expect(menu).toHaveTextContent(messages.whichKey.hour('10:05'))
    expect(menu).toHaveTextContent(messages.whichKey.tomorrow('Thu 09:00'))
    expect(footer()).toHaveTextContent(messages.statusline.keys.cancel)
  })

  it('esc cancels the pending s: no call, and a later h does nothing', async () => {
    const { user, reminders } = await ready()
    await user.keyboard('jjj')

    await user.keyboard('s{Escape}')
    expect(screen.queryByRole('list', { name: messages.whichKey.label })).not.toBeInTheDocument()
    await user.keyboard('h')

    expect(reminders.snooze).not.toHaveBeenCalled()
  })

  it('s does nothing with no item focused', async () => {
    const { user } = await ready()

    await user.keyboard('s')

    expect(screen.queryByRole('list', { name: messages.whichKey.label })).not.toBeInTheDocument()
  })
})

describe('statusline hints show only working keys', () => {
  it('nothing focused: move; an open item adds x and s', async () => {
    const { user } = await ready()
    expect(footer()).toHaveTextContent(messages.statusline.keys.move)
    expect(footer()).not.toHaveTextContent(messages.statusline.keys.done)

    await user.keyboard('j')

    expect(footer()).toHaveTextContent(messages.statusline.keys.done)
    expect(footer()).toHaveTextContent(messages.statusline.keys.snooze)
    expect(footer()).not.toHaveTextContent(messages.statusline.keys.undo)
  })
})

describe('keys are ignored where they must be', () => {
  it('with ctrl, meta or alt held', async () => {
    const { user, reminders } = await ready()
    await user.keyboard('jjj')

    await user.keyboard('{Control>}x{/Control}{Meta>}x{/Meta}{Alt>}x{/Alt}')

    expect(reminders.done).not.toHaveBeenCalled()
  })

  function Harness({ enabled }: { enabled: boolean }) {
    const handled = vi.fn(() => true)
    useKeyboardLayer(enabled, (key) => {
      document.body.dataset.last = key
      return handled()
    })
    return (
      <>
        <input aria-label="field" />
        <textarea aria-label="area" />
        <div contentEditable suppressContentEditableWarning aria-label="editable" />
      </>
    )
  }

  it.each(['field', 'area', 'editable'])('while typing in %s', async (label) => {
    delete document.body.dataset.last
    const user = userEvent.setup()
    render(<Harness enabled />)

    await user.click(screen.getByLabelText(label))
    await user.keyboard('x')

    expect(document.body.dataset.last).toBeUndefined()
  })

  it('while the layer is disabled (bar or sheet open), and is live otherwise', async () => {
    delete document.body.dataset.last
    const user = userEvent.setup()
    const { rerender } = render(<Harness enabled={false} />)
    await user.keyboard('x')
    expect(document.body.dataset.last).toBeUndefined()

    rerender(<Harness enabled />)
    await user.keyboard('x')
    expect(document.body.dataset.last).toBe('x')
  })
})

describe('the layer keeps its listener stable', () => {
  function Latest({ tag }: { tag: string }) {
    useKeyboardLayer(true, (key) => {
      document.body.dataset.last = `${tag}:${key}`
      return false
    })
    return null
  }

  it('does not re-register when only the handle changes, and calls the latest handle', async () => {
    delete document.body.dataset.last
    const user = userEvent.setup()
    const { rerender } = render(<Latest tag="a" />)
    const add = vi.spyOn(document, 'addEventListener')
    const remove = vi.spyOn(document, 'removeEventListener')

    rerender(<Latest tag="b" />)
    await user.keyboard('x')

    expect(add).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
    expect(document.body.dataset.last).toBe('b:x')
    add.mockRestore()
    remove.mockRestore()
  })

  it('still reaches a later layer when an earlier one re-renders synchronously', async () => {
    delete document.body.dataset.last
    const user = userEvent.setup()
    function First() {
      const [, setN] = useState(0)
      useKeyboardLayer(true, () => {
        flushSync(() => setN((n) => n + 1))
        return false
      })
      return null
    }
    function Second() {
      useKeyboardLayer(true, (key) => {
        document.body.dataset.last = `second:${key}`
        return false
      })
      return null
    }
    render(
      <>
        <First />
        <Second />
      </>,
    )

    await user.keyboard('/')

    expect(document.body.dataset.last).toBe('second:/')
  })
})

describe('motion and focus use tokens only (rules 8-10, SG13, SG15, SG16)', () => {
  const css = ['ItemRow', 'WhichKey', 'Statusline'].map((name) =>
    readFileSync(`src/features/today/${name}.module.css`, 'utf8'),
  )
  const all = css.join('\n')

  it('has no raw durations, hex colors, core tokens or px font sizes', () => {
    expect(all).not.toMatch(/\b\d+(\.\d+)?m?s\b/)
    expect(all).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(all).not.toMatch(/--core-/)
    expect(all).not.toMatch(/font-size:\s*\d+px/)
  })

  it('plays strike, snooze and the which-key entrance from motion tokens, and focus from --focus-ring', () => {
    expect(all).toContain('var(--motion-strike)')
    expect(all).toContain('var(--motion-snooze)')
    expect(all).toContain('var(--motion-whichkey-delay)')
    expect(all).toContain('var(--motion-fade)')
    expect(all).toContain('var(--focus-ring)')
  })
})

describe('e opens the focused row in edit mode (slice 4)', () => {
  async function withOpen() {
    const onOpenNote = vi.fn<(id: string, edit?: boolean) => void>()
    const view = setup(c4Response(), {}, onOpenNote)
    await screen.findByRole('heading', { level: 1 })
    return { ...view, onOpenNote }
  }

  it('e on a focused open row opens that note with edit on, and nothing is written', async () => {
    const { user, today, onOpenNote, reminders } = await withOpen()
    await user.keyboard('j')
    await user.keyboard('e')
    expect(onOpenNote).toHaveBeenCalledTimes(1)
    expect(onOpenNote.mock.calls[0]?.[1]).toBe(true)
    expect([...today.carried.flatMap((g) => g.items), ...today.rail].map((i) => i.id)).toContain(
      onOpenNote.mock.calls[0]?.[0],
    )
    expect(reminders.done).not.toHaveBeenCalled()
    expect(reminders.snooze).not.toHaveBeenCalled()
  })

  it('opens the row that is focused: a different row gives a different id', async () => {
    const { user, onOpenNote } = await withOpen()
    await user.keyboard('j')
    await user.keyboard('e')
    await user.keyboard('j')
    await user.keyboard('e')
    expect(onOpenNote).toHaveBeenCalledTimes(2)
    expect(onOpenNote.mock.calls[0]?.[0]).not.toBe(onOpenNote.mock.calls[1]?.[0])
  })

  it('e on a done row works too', async () => {
    const base = c4Response()
    const group = base.carried[0]!
    const doneItem = { ...group.items[0]!, doneAt: new Date('2026-10-06T22:00:00.000Z') }
    const today = {
      ...base,
      carried: [{ ...group, items: [doneItem, ...group.items.slice(1)] }, ...base.carried.slice(1)],
    }
    const onOpenNote = vi.fn<(id: string, edit?: boolean) => void>()
    const { user } = setup(today, {}, onOpenNote)
    await screen.findByRole('heading', { level: 1 })
    await user.keyboard('j')
    expect(footer()).toHaveTextContent(messages.statusline.keys.undo)
    await user.keyboard('e')
    expect(onOpenNote).toHaveBeenCalledExactlyOnceWith(doneItem.id, true)
  })

  it('e with no focused row does nothing', async () => {
    const { user, onOpenNote } = await withOpen()
    await user.keyboard('e')
    expect(onOpenNote).not.toHaveBeenCalled()
  })

  it('hints e only while a row is focused and the app can open notes', async () => {
    const { user } = await withOpen()
    expect(footer()).not.toHaveTextContent(messages.statusline.keys.edit)
    await user.keyboard('j')
    expect(footer()).toHaveTextContent(messages.statusline.keys.edit)
  })

  it('does not hint e when the container cannot open notes', async () => {
    const { user } = await ready()
    await user.keyboard('j')
    expect(footer()).not.toHaveTextContent(messages.statusline.keys.edit)
    await user.keyboard('e')
  })

  it('is off while the capture bar is open: typing e inserts the letter', async () => {
    const { user, onOpenNote } = await withOpen()
    await user.keyboard('j')
    await user.keyboard('c')
    const input = await screen.findByLabelText(messages.capture.label)
    await user.keyboard('e')
    expect(onOpenNote).not.toHaveBeenCalled()
    expect(input).toHaveValue('e')
  })

  it('is off while the tag bar is open', async () => {
    const { user, onOpenNote } = await withOpen()
    await user.keyboard('j')
    await user.keyboard('#')
    expect(await screen.findByRole('group', { name: messages.filter.label })).toBeInTheDocument()
    await user.keyboard('e')
    expect(onOpenNote).not.toHaveBeenCalled()
  })
})
