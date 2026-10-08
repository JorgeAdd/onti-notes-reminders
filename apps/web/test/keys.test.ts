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
