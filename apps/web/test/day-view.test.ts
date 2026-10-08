import { describe, expect, it } from 'vitest'
import { dayKey, readView, stepView, writeView } from '../src/features/today/day-view'

describe('readView', () => {
  it('reads the viewed day and the tag from the query string', () => {
    expect(readView('?d=2026-10-06&tag=client-b')).toEqual({ date: '2026-10-06', tag: 'client-b' })
    expect(readView('')).toEqual({ date: null, tag: null })
  })

  it.each([
    ['an impossible date', '?d=2026-02-30&tag=client-b', { date: null, tag: 'client-b' }],
    ['an unpadded date', '?d=2026-1-5', { date: null, tag: null }],
    ['an empty date', '?d=&tag=client-b', { date: null, tag: 'client-b' }],
    ['a repeated date', '?d=2026-10-06&d=2026-10-07', { date: null, tag: null }],
    ['a malformed tag', '?d=2026-10-06&tag=Client%20B!', { date: '2026-10-06', tag: null }],
    ['an empty tag', '?tag=', { date: null, tag: null }],
    ['a 41 character tag', `?tag=${'a'.repeat(41)}`, { date: null, tag: null }],
  ])('drops %s without losing the other param', (_label, search, expected) => {
    expect(readView(search)).toEqual(expected)
  })

  it('ignores unknown params', () => {
    expect(readView('?panel=notes&d=2026-10-06')).toEqual({ date: '2026-10-06', tag: null })
  })
})

describe('writeView', () => {
  it('writes no d for today and no tag when there is none', () => {
    expect(writeView('?d=2026-10-06&tag=client-b', { date: null, tag: null })).toBe('')
  })

  it('keeps unknown params and replaces d and tag in place', () => {
    expect(writeView('?x=1&d=2026-10-06', { date: '2026-10-09', tag: 'client-b' })).toBe(
      '?x=1&d=2026-10-09&tag=client-b',
    )
    expect(writeView('?x=1', { date: null, tag: null })).toBe('?x=1')
  })
})

describe('stepView', () => {
  const TODAY = '2026-10-07'

  it('steps by calendar days from the viewed date, or from today when there is none', () => {
    expect(stepView({ date: null, tag: null }, -1, TODAY)).toEqual({
      date: '2026-10-06',
      tag: null,
    })
    expect(stepView({ date: '2026-10-08', tag: 'client-b' }, 1, TODAY)).toEqual({
      date: '2026-10-09',
      tag: 'client-b',
    })
  })

  it("lands on today's own date as the no-date view, so it keeps following midnight", () => {
    expect(stepView({ date: '2026-10-06', tag: null }, 1, TODAY)).toEqual({ date: null, tag: null })
  })

  it('does nothing past 2099-12-31 or before 2000-01-01', () => {
    expect(stepView({ date: '2099-12-31', tag: null }, 1, TODAY)).toBeNull()
    expect(stepView({ date: '2000-01-01', tag: null }, -1, TODAY)).toBeNull()
    expect(stepView({ date: '2099-12-30', tag: null }, 1, TODAY)).toEqual({
      date: '2099-12-31',
      tag: null,
    })
  })
})

describe('dayKey', () => {
  it('is the one query key factory: day, date or "today", tag', () => {
    expect(dayKey({ date: null, tag: null })).toEqual(['day', 'today', null])
    expect(dayKey({ date: '2026-10-06', tag: 'client-b' })).toEqual([
      'day',
      '2026-10-06',
      'client-b',
    ])
  })
})
