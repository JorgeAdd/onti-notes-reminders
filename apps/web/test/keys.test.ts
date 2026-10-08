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
    expect(availableKeys({ hasRows: true, target: null, armed: false })).toEqual(['move'])
  })

  it('an open item adds x and s', () => {
    expect(availableKeys({ hasRows: true, target: 'open', armed: false })).toEqual([
      'move',
      'done',
      'snooze',
    ])
  })

  it('a done item adds z only', () => {
    expect(availableKeys({ hasRows: true, target: 'done', armed: false })).toEqual(['move', 'undo'])
  })

  it('after s: the menu keys and esc', () => {
    expect(availableKeys({ hasRows: true, target: 'open', armed: true })).toEqual([
      'hour',
      'tomorrow',
      'cancel',
    ])
  })

  it('an empty page has no hints', () => {
    expect(availableKeys({ hasRows: false, target: null, armed: false })).toEqual([])
  })
})
