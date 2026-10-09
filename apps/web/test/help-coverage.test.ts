/** Slice 9 · the help lists every key the app handles; a new key without a row fails here. */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildHelp, helpKeys, HINT_ROWS } from '../src/features/help/help-model'
import { reduceKey, type KeyContext, type KeyState, type Target } from '../src/features/today/keys'
import { messages } from '../src/messages'

const FEATURES = join(__dirname, '..', 'src', 'features')

const sources = (dir = FEATURES): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.tsx?$/.test(path) ? [path] : []
  })

/** Every key the layer acts on: a command, or arming the snooze menu. Any key disarms it, so a disarm is not a key of its own. */
function probed(): Set<string> {
  const keys = [
    ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)),
    'Escape',
    'Enter',
    'Tab',
  ]
  const states: KeyState[] = [{ pending: null }, { pending: 's' }]
  const targets: Target[] = [null, 'open', 'done']
  const contexts: KeyContext[] = [false, true].flatMap((filterActive) =>
    [false, true].flatMap((offToday) =>
      [false, true].map((hasTags) => ({ filterActive, offToday, hasTags })),
    ),
  )
  const handled = new Set<string>()
  for (const state of states)
    for (const target of targets)
      for (const context of contexts)
        for (const key of keys) {
          const next = reduceKey(state, key, target, context)
          const arms = state.pending === null && next.state.pending !== null
          if (next.command !== null || arms) handled.add(key)
        }
  return handled
}

/** The `key === '<x>'` literals of the handlers outside `reduceKey` (`/`, `#`, note view, tag bar). */
function scanned(): Set<string> {
  const found = new Set<string>()
  for (const path of sources())
    for (const match of readFileSync(path, 'utf8').matchAll(/\bkey === '([^']+)'/g))
      found.add(match[1]!)
  return found
}

const missing = (handled: Set<string>, covered: Set<string>) =>
  [...handled].filter((key) => !covered.has(key)).sort()

describe('help coverage · every handled key has a row', () => {
  it('covers every key `reduceKey` reacts to', () => {
    const handled = probed()
    expect(handled.size).toBeGreaterThan(10)
    expect(missing(handled, helpKeys())).toEqual([])
  })

  it('covers the `/`, `#`, note `e`/`d` and tag bar keys found in the handlers', () => {
    const handled = scanned()
    for (const key of ['/', '#', 'e', 'd', 'Enter', 'Tab', 'Escape']) expect(handled).toContain(key)
    expect(missing(handled, helpKeys())).toEqual([])
  })

  it('lists no dead key: every key of a row is handled somewhere', () => {
    const handled = new Set([...probed(), ...scanned()])
    expect(missing(helpKeys(), handled)).toEqual([])
  })

  it('fails when a row is removed', () => {
    const [first, ...rest] = buildHelp(false)
    const without = [
      { ...first!, rows: first!.rows.filter((row) => !row.keys.includes('c')) },
      ...rest,
    ]
    expect(missing(probed(), helpKeys(without))).toEqual(['c'])
  })
})

describe('help rows come from the statusline hints', () => {
  it('has a row for every KeyHint, each shown as the statusline hint text', () => {
    expect(Object.keys(HINT_ROWS).sort()).toEqual(Object.keys(messages.statusline.keys).sort())
    const lines = buildHelp(false).flatMap((section) => section.rows.map((row) => row.line))
    for (const hint of Object.values(messages.statusline.keys)) expect(lines).toContain(hint)
  })

  it('has the four sections in roadmap order, with titles from messages', () => {
    const sections = buildHelp(false)
    expect(sections.map((s) => s.id)).toEqual(['capture', 'days', 'note', 'find'])
    expect(sections.map((s) => s.title)).toEqual(['Capture', 'Days', 'On a note', 'Find'])
    for (const section of sections) expect(section.rows.length).toBeGreaterThan(0)
  })

  it('puts each roadmap key in its section', () => {
    const keysOf = (id: string) =>
      new Set(
        buildHelp(false)
          .find((s) => s.id === id)!
          .rows.flatMap((row) => row.keys),
      )
    expect(keysOf('capture')).toEqual(new Set(['c', 'Escape']))
    expect(keysOf('days')).toEqual(new Set(['[', ']', 't']))
    expect(keysOf('note')).toEqual(
      new Set(['j', 'k', 'x', 'z', 's', 'h', 't', 'Escape', 'e', 'd', 'Enter']),
    )
    expect(keysOf('find')).toEqual(new Set(['/', '#', 'Tab', 'Enter', 'Escape']))
  })
})

describe('help on touch', () => {
  const touch = buildHelp(true)
  const text = touch.flatMap((s) => s.rows.map((row) => row.line)).join('\n')

  it('keeps the four sections and holds no keys', () => {
    expect(touch.map((s) => s.id)).toEqual(['capture', 'days', 'note', 'find'])
    for (const section of touch) for (const row of section.rows) expect(row.keys).toEqual([])
    expect(helpKeys(touch).size).toBe(0)
  })

  it('names the real buttons, so a renamed label fails here', () => {
    const labels = [
      messages.mobile.capture,
      messages.mobile.search,
      messages.mobile.tags,
      messages.actionSheet.done,
      messages.capture.presets.today,
      messages.capture.presets.hour,
      messages.capture.presets.tomorrow,
      messages.day.prev,
      messages.day.next,
    ]
    for (const label of labels) expect(text).toContain(label)
  })
})
