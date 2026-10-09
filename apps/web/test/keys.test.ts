import { describe, expect, it } from 'vitest'
import { availableKeys, reduceKey, type KeyState } from '../src/features/today/keys'

const idle: KeyState = { pending: null }
const armed: KeyState = { pending: 's' }

describe('reduceKey · idle', () => {
  it.each([
    ['j', 'open', { type: 'move', delta: 1 }],
    ['k', 'done', { type: 'move', delta: -1 }],
    ['j', null, { type: 'move', delta: 1 }],
    ['x', 'open', { type: 'done' }],
    ['z', 'done', { type: 'undo' }],
  ] as const)('%s with a %s target -> %j', (key, target, command) => {
    expect(reduceKey(idle, key, target)).toEqual({ state: idle, command })
  })

  it.each([
    ['x', 'done'],
    ['x', null],
    ['z', 'open'],
    ['z', null],
    ['s', 'done'],
    ['s', null],
    ['q', 'open'],
    ['Escape', 'open'],
  ] as const)('%s with a %s target does nothing', (key, target) => {
    expect(reduceKey(idle, key, target)).toEqual({ state: idle, command: null })
  })

  it('s on an open item arms the menu without acting', () => {
    expect(reduceKey(idle, 's', 'open')).toEqual({ state: armed, command: null })
  })
})

describe('reduceKey · after s', () => {
  it('h snoozes +1 h and disarms', () => {
    expect(reduceKey(armed, 'h', 'open')).toEqual({
      state: idle,
      command: { type: 'snooze', preset: 'hour' },
    })
  })

  it('t snoozes to tomorrow and disarms', () => {
    expect(reduceKey(armed, 't', 'open')).toEqual({
      state: idle,
      command: { type: 'snooze', preset: 'tomorrow' },
    })
  })

  it.each(['Escape', 'x', 'j', 'z', 's', 'q'])('%s disarms and does nothing else', (key) => {
    expect(reduceKey(armed, key, 'open')).toEqual({ state: idle, command: null })
  })

  it('h with no open target (the row left the page) disarms without acting', () => {
    expect(reduceKey(armed, 'h', null)).toEqual({ state: idle, command: null })
    expect(reduceKey(armed, 't', 'done')).toEqual({ state: idle, command: null })
  })
})

describe('availableKeys · only keys that work now', () => {
  it('nothing focused: move only', () => {
    expect(availableKeys({ hasRows: true, target: null, armed: false })).toEqual([
      'move',
      'capture',
    ])
  })

  it('an open item adds x and s', () => {
    expect(availableKeys({ hasRows: true, target: 'open', armed: false })).toEqual([
      'move',
      'done',
      'snooze',
      'capture',
    ])
  })

  it('a done item adds z only', () => {
    expect(availableKeys({ hasRows: true, target: 'done', armed: false })).toEqual([
      'move',
      'undo',
      'capture',
    ])
  })

  it('after s: the menu keys and esc', () => {
    expect(availableKeys({ hasRows: true, target: 'open', armed: true })).toEqual([
      'hour',
      'tomorrow',
      'cancel',
    ])
  })

  it('an empty page can still capture, so c is its only hint', () => {
    expect(availableKeys({ hasRows: false, target: null, armed: false })).toEqual(['capture'])
  })
})

describe('c opens the command bar', () => {
  it.each([null, 'open', 'done'] as const)('from idle with target %s', (target) => {
    expect(reduceKey(idle, 'c', target)).toEqual({ state: idle, command: { type: 'capture' } })
  })

  it('while the snooze menu is armed it only disarms', () => {
    expect(reduceKey(armed, 'c', 'open')).toEqual({ state: idle, command: null })
  })
})

describe('[ ] t · day keys (D5)', () => {
  const ctx = { filterActive: false, offToday: true }

  it.each([
    ['[', { type: 'day', delta: -1 }],
    [']', { type: 'day', delta: 1 }],
  ] as const)('%s steps the day from idle, with any target', (key, command) => {
    expect(reduceKey(idle, key, null, ctx)).toEqual({ state: idle, command })
    expect(reduceKey(idle, key, 'open')).toEqual({ state: idle, command })
  })

  it('t goes back to today only off today', () => {
    expect(reduceKey(idle, 't', null, ctx)).toEqual({ state: idle, command: { type: 'today' } })
    expect(reduceKey(idle, 't', 'open')).toEqual({ state: idle, command: null })
    expect(reduceKey(idle, 't', 'open', { filterActive: false, offToday: false })).toEqual({
      state: idle,
      command: null,
    })
  })

  it('after s, t is still Tomorrow even off today', () => {
    expect(reduceKey(armed, 't', 'open', ctx)).toEqual({
      state: idle,
      command: { type: 'snooze', preset: 'tomorrow' },
    })
  })

  it('after s, [ and ] only disarm', () => {
    expect(reduceKey(armed, '[', 'open', ctx)).toEqual({ state: idle, command: null })
  })

  it('hints days always and today only off today', () => {
    expect(availableKeys({ hasRows: true, target: null, armed: false, days: true })).toEqual([
      'move',
      'capture',
      'days',
    ])
    expect(
      availableKeys({ hasRows: false, target: null, armed: false, days: true, offToday: true }),
    ).toEqual(['capture', 'days', 'today'])
    expect(availableKeys({ hasRows: true, target: 'open', armed: true, days: true })).toEqual([
      'hour',
      'tomorrow',
      'cancel',
    ])
  })
})

describe('# and esc · the tag filter keys (R12)', () => {
  const tagged = { filterActive: false, offToday: false, hasTags: true }
  const filtered = { filterActive: true, offToday: false, hasTags: true }

  it('# opens the tag bar only when the account has tags', () => {
    expect(reduceKey(idle, '#', null, tagged)).toEqual({ state: idle, command: { type: 'tags' } })
    expect(reduceKey(idle, '#', 'open', { ...tagged, hasTags: false })).toEqual({
      state: idle,
      command: null,
    })
    expect(reduceKey(idle, '#', 'open')).toEqual({ state: idle, command: null })
  })

  it('esc clears the filter from idle, and only while one is applied', () => {
    expect(reduceKey(idle, 'Escape', null, filtered)).toEqual({
      state: idle,
      command: { type: 'clearFilter' },
    })
    expect(reduceKey(idle, 'Escape', null, tagged)).toEqual({ state: idle, command: null })
  })

  it('esc order: with the snooze menu armed, esc only disarms and the filter stays', () => {
    expect(reduceKey(armed, 'Escape', 'open', filtered)).toEqual({ state: idle, command: null })
  })

  it('hints # when tags exist and "esc clear" only while filtered', () => {
    expect(availableKeys({ hasRows: true, target: null, armed: false, tags: true })).toEqual([
      'move',
      'capture',
      'tags',
    ])
    expect(
      availableKeys({ hasRows: true, target: null, armed: false, tags: true, filterActive: true }),
    ).toEqual(['move', 'capture', 'tags', 'clear'])
    expect(availableKeys({ hasRows: true, target: null, armed: false })).toEqual([
      'move',
      'capture',
    ])
    expect(
      availableKeys({ hasRows: true, target: 'open', armed: true, tags: true, filterActive: true }),
    ).toEqual(['hour', 'tomorrow', 'cancel'])
  })
})

describe('reduceKey · e opens the note in edit mode (slice 4)', () => {
  it.each(['open', 'done'] as const)('e with a %s target -> edit', (target) => {
    expect(reduceKey(idle, 'e', target)).toEqual({ state: idle, command: { type: 'edit' } })
  })

  it('e with no focused row does nothing', () => {
    expect(reduceKey(idle, 'e', null)).toEqual({ state: idle, command: null })
  })

  it('e inside the snooze menu only disarms it', () => {
    expect(reduceKey(armed, 'e', 'open')).toEqual({ state: idle, command: null })
  })

  it('leaves the other keys alone: d is not a Today key', () => {
    for (const target of ['open', 'done', null] as const) {
      expect(reduceKey(idle, 'd', target).command).toBeNull()
    }
    expect(reduceKey(idle, 'x', 'open').command).toEqual({ type: 'done' })
  })
})

describe('availableKeys · the e hint (slice 4)', () => {
  const base = { hasRows: true, armed: false, edit: true } as const

  it('an open item adds e after s; a done item adds it after z', () => {
    expect(availableKeys({ ...base, target: 'open' })).toEqual([
      'move',
      'done',
      'snooze',
      'edit',
      'capture',
    ])
    expect(availableKeys({ ...base, target: 'done' })).toEqual(['move', 'undo', 'edit', 'capture'])
  })

  it('no focused row, the armed menu, or an unavailable edit show no e hint', () => {
    expect(availableKeys({ ...base, target: null })).toEqual(['move', 'capture'])
    expect(availableKeys({ ...base, target: 'open', armed: true })).toEqual([
      'hour',
      'tomorrow',
      'cancel',
    ])
    expect(availableKeys({ hasRows: true, target: 'open', armed: false })).not.toContain('edit')
  })
})
