/** R1, R3-R5, R18 · buildDayPage with a calendar-date anchor. */
import { describe, expect, it } from 'vitest'
import { buildDayPage, markDone } from '../src'
import { at, BEFORE_CAPTURE, byId, N1, replace, TZ, type FixtureNote } from './fixtures/jorge-week'

const ids = (notes: { id: string }[]) => notes.map((n) => n.id)
const all: FixtureNote[] = [N1, ...BEFORE_CAPTURE]
const n1Done = replace(all, { ...N1, ...markDone(N1, at('2026-10-06 17:00')) })

describe('buildDayPage · date argument', () => {
  const now = at('2026-10-07 09:05') // Wed 7

  it('defaults to today: same page as before, plus date, isToday and window', () => {
    const page = buildDayPage(n1Done, now, TZ)
    expect(page.date).toBe('2026-10-07')
    expect(page.isToday).toBe(true)
    expect(page.window.start).toEqual(at('2026-10-07 00:00'))
    expect(page.window.end).toEqual(at('2026-10-08 00:00'))
    expect(ids(page.carried[0]?.items ?? [])).toEqual(['N2', 'N3'])
    expect(page).toEqual(buildDayPage(n1Done, now, TZ, '2026-10-07'))
  })

  it('a past day (Tue 6) has no carried group; done items stay; counts are its own (R18)', () => {
    const page = buildDayPage(n1Done, now, TZ, '2026-10-06')
    expect(page.isToday).toBe(false)
    expect(page.date).toBe('2026-10-06')
    expect(page.carried).toEqual([])
    expect(ids(page.rail)).toEqual(['N1', 'N2', 'N3'])
    expect(byId(page.rail, 'N1').doneAt).toEqual(at('2026-10-06 17:00'))
    expect(page.openCount).toBe(2)
    expect(page.anyDoneToday).toBe(true)
    expect(page.otherCount).toBe(12)
  })

  it('a future day (Thu 8) shows only what is due then, open items before it are not carried', () => {
    const page = buildDayPage(n1Done, now, TZ, '2026-10-08')
    expect(page.carried).toEqual([])
    expect(ids(page.rail)).toEqual(['N6'])
    expect(page.openCount).toBe(1)
    expect(page.anyDoneToday).toBe(false)
    expect(page.otherCount).toBe(14)
  })

  it('an empty day has an empty rail and every note is "other" (R5)', () => {
    const page = buildDayPage(n1Done, now, TZ, '2026-10-20')
    expect(page.rail).toEqual([])
    expect(page.openCount).toBe(0)
    expect(page.otherCount).toBe(15)
  })

  it('viewing today by its date equals viewing it by default (isToday)', () => {
    const byDate = buildDayPage(n1Done, now, TZ, '2026-10-07')
    expect(byDate.isToday).toBe(true)
    expect(byDate.carried).toHaveLength(1)
  })

  it('on a DST day the window is the calendar day (23 h)', () => {
    const page = buildDayPage(
      [],
      new Date('2026-03-07T15:00:00Z'),
      'America/New_York',
      '2026-03-08',
    )
    expect(page.window.end.getTime() - page.window.start.getTime()).toBe(23 * 3_600_000)
    expect(page.isToday).toBe(false)
  })
})
