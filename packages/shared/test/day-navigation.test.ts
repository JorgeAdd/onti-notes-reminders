/**
 * R4, R5, R12, R18 · the page of another day and the filtered page, on
 * Jorge's week (docs/CONTRACT.md). Wording is the web's; here the counts
 * that the wording is built from.
 */
import { describe, expect, it } from 'vitest'
import { buildDayPage, filterByTag, markDone, otherNotes } from '../src'
import { at, BEFORE_CAPTURE, N1, replace, TZ } from './fixtures/jorge-week'

const ids = (notes: { id: string }[]) => notes.map((n) => n.id)
const n1Done = replace([N1, ...BEFORE_CAPTURE], {
  ...N1,
  ...markDone(N1, at('2026-10-06 17:00')),
})
const now = at('2026-10-08 14:30') // Thu 8

describe('R18 · viewing Wed 7 from Thu 8 14:30', () => {
  const page = buildDayPage(n1Done, now, TZ, '2026-10-07')

  it('holds what is due that day, no carried group, N2/N3 stay on Tue', () => {
    expect(page.isToday).toBe(false)
    expect(page.carried).toEqual([])
    expect(ids(page.rail)).toEqual(['N4', 'N5'])
  })

  it('R4: "2 things on Wed 7" counts the open items of that day', () => {
    expect(page.openCount).toBe(2)
  })

  it('R5: other notes = total − items on that page (13)', () => {
    expect(page.otherCount).toBe(13)
  })

  it('a done item stays on its day, struck, and is not counted as open', () => {
    const tue = buildDayPage(n1Done, now, TZ, '2026-10-06')
    expect(ids(tue.rail)).toEqual(['N1', 'N2', 'N3'])
    expect(tue.openCount).toBe(2)
    expect(tue.rail[0]?.doneAt).toEqual(at('2026-10-06 17:00'))
  })
})

describe('R12 · filtered view of Thu 8 (C8) and across days', () => {
  const { matching, hiddenCount } = filterByTag(n1Done, 'client-b')

  it('today: 1 on the rail, 4 other notes, 10 hidden, header "5 notes"', () => {
    const page = buildDayPage(matching, now, TZ)
    const others = otherNotes(matching, page)
    expect(ids(page.rail)).toEqual(['N6'])
    expect(others).toHaveLength(4)
    expect(page.rail.length + others.length).toBe(5)
    expect(hiddenCount).toBe(10)
  })

  it('the filter persists on another day: empty rail, all 5 matches are other notes', () => {
    const page = buildDayPage(matching, now, TZ, '2026-10-07')
    expect(page.rail).toEqual([])
    expect(ids(otherNotes(matching, page))).toEqual(['N6', 'N7', 'N10', 'N9', 'N8'])
    expect(hiddenCount).toBe(10)
  })

  it('carried items are filtered too: client-a on Wed 7 carries only N2', () => {
    const a = filterByTag(n1Done, 'client-a')
    const page = buildDayPage(a.matching, at('2026-10-07 09:05'), TZ)
    expect(ids(page.carried[0]?.items ?? [])).toEqual(['N2'])
    expect(ids(page.rail)).toEqual(['N4'])
  })

  it('a tag with no match leaves an empty page and hides everything', () => {
    const none = filterByTag(n1Done, 'nope')
    const page = buildDayPage(none.matching, now, TZ)
    expect(page.rail).toEqual([])
    expect(otherNotes(none.matching, page)).toEqual([])
    expect(none.hiddenCount).toBe(15)
  })
})
