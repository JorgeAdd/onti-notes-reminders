import { describe, expect, it } from 'vitest'
import { afterRemoval, orderedIds, step } from '../src/features/today/focus'
import { c4Response } from './today-fixture'

describe('orderedIds', () => {
  it('lists carried items (oldest day, then time) before the rail', () => {
    const today = c4Response()
    const titles = orderedIds(today).map(
      (id) =>
        [...today.carried.flatMap((g) => g.items), ...today.rail].find((i) => i.id === id)!.title,
    )
    expect(titles).toEqual([
      'Reply to Marta about the staging deploy window',
      'Update the estimate for the onboarding epic',
      'Standup: mention the flaky checkout e2e test',
      'Send rate-limit numbers to the infra team',
    ])
  })

  it('is empty on an empty page', () => {
    expect(orderedIds({ ...c4Response(), carried: [], rail: [] })).toEqual([])
  })
})

describe('step', () => {
  const ids = ['a', 'b', 'c']

  it('moves one row and stops at the ends (no wrap)', () => {
    expect(step(ids, 'a', 1)).toBe('b')
    expect(step(ids, 'c', -1)).toBe('b')
    expect(step(ids, 'c', 1)).toBe('c')
    expect(step(ids, 'a', -1)).toBe('a')
  })

  it('with nothing focused, j lands on the first row and k on the last', () => {
    expect(step(ids, null, 1)).toBe('a')
    expect(step(ids, null, -1)).toBe('c')
  })

  it('a focused id that is gone behaves like nothing focused', () => {
    expect(step(ids, 'zzz', 1)).toBe('a')
  })

  it('has no target on an empty page', () => {
    expect(step([], null, 1)).toBeNull()
  })
})

describe('afterRemoval', () => {
  it('goes to the next row that is still there', () => {
    expect(afterRemoval(['a', 'b', 'c'], ['a', 'c'], 'b')).toBe('c')
  })

  it('goes to the previous row when the last row left', () => {
    expect(afterRemoval(['a', 'b', 'c'], ['a', 'b'], 'c')).toBe('b')
  })

  it('skips next rows that left too', () => {
    expect(afterRemoval(['a', 'b', 'c', 'd'], ['a', 'd'], 'b')).toBe('d')
    expect(afterRemoval(['a', 'b', 'c'], ['a'], 'b')).toBe('a')
  })

  it('has no focus when the page is empty', () => {
    expect(afterRemoval(['a'], [], 'a')).toBeNull()
  })
})
