/**
 * R1 · calendar-date navigation and any-day windows (D5, D6).
 * Dates are calendar strings; windows come from local midnights, never "+24 h".
 */
import { describe, expect, it } from 'vitest'
import {
  addCalendarDays,
  dayWindow,
  localCalendarDate,
  parseCalendarDate,
  todayWindow,
} from '../src'

const NY = 'America/New_York'
const HOUR = 3_600_000
const hoursOf = (w: { start: Date; end: Date }) => (w.end.getTime() - w.start.getTime()) / HOUR

describe('parseCalendarDate', () => {
  it('reads a real date inside 2000..2099', () => {
    expect(parseCalendarDate('2026-10-08')).toEqual({ year: 2026, month: 10, day: 8 })
    expect(parseCalendarDate('2000-01-01')).toEqual({ year: 2000, month: 1, day: 1 })
    expect(parseCalendarDate('2099-12-31')).toEqual({ year: 2099, month: 12, day: 31 })
    expect(parseCalendarDate('2028-02-29')).toEqual({ year: 2028, month: 2, day: 29 })
  })

  it.each([
    ['Feb 30', '2026-02-30'],
    ['Feb 29 in a common year', '2026-02-29'],
    ['unpadded month and day', '2026-1-5'],
    ['empty', ''],
    ['garbage', 'garbage'],
    ['before the range', '1999-12-31'],
    ['after the range', '2100-01-01'],
    ['trailing text', '2026-10-08T00:00'],
    ['month 13', '2026-13-01'],
  ])('rejects %s', (_label, value) => {
    expect(parseCalendarDate(value)).toBeNull()
  })
})

describe('addCalendarDays', () => {
  it('crosses a month, a year and a leap day', () => {
    expect(addCalendarDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addCalendarDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addCalendarDays('2028-02-29', 1)).toBe('2028-03-01')
    expect(addCalendarDays('2027-02-28', 1)).toBe('2027-03-01')
  })

  it('goes back and by several days', () => {
    expect(addCalendarDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addCalendarDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addCalendarDays('2026-10-08', 30)).toBe('2026-11-07')
    expect(addCalendarDays('2026-10-08', 0)).toBe('2026-10-08')
  })

  it('ignores DST: Sat 7 -> Sun 8 -> Mon 9 Mar 2026 never skips or repeats', () => {
    expect(addCalendarDays('2026-03-07', 1)).toBe('2026-03-08')
    expect(addCalendarDays('2026-03-08', 1)).toBe('2026-03-09')
  })
})

describe('localCalendarDate', () => {
  it('reads the local date of an instant in the profile zone', () => {
    const instant = new Date('2026-10-08T03:00:00Z')
    expect(localCalendarDate(instant, 'America/Mexico_City')).toBe('2026-10-07')
    expect(localCalendarDate(instant, 'UTC')).toBe('2026-10-08')
    expect(localCalendarDate(instant, 'Asia/Tokyo')).toBe('2026-10-08')
  })

  it('switches at local midnight (04:59Z / 05:00Z on 2 Nov in New York)', () => {
    expect(localCalendarDate(new Date('2026-11-02T04:59:00Z'), NY)).toBe('2026-11-01')
    expect(localCalendarDate(new Date('2026-11-02T05:00:00Z'), NY)).toBe('2026-11-02')
  })
})

describe('dayWindow (R1, D5, D6)', () => {
  it('an ordinary day is [local midnight, next local midnight)', () => {
    const w = dayWindow('2026-10-08', 'America/Mexico_City')
    expect(w.start.toISOString()).toBe('2026-10-08T06:00:00.000Z')
    expect(w.end.toISOString()).toBe('2026-10-09T06:00:00.000Z')
  })

  it('the last navigable day, 2099-12-31, has a window ending at the start of 2100', () => {
    const w = dayWindow('2099-12-31', 'America/Mexico_City')
    expect(w.start.toISOString()).toBe('2099-12-31T06:00:00.000Z')
    expect(w.end.toISOString()).toBe('2100-01-01T06:00:00.000Z')
  })

  it('Sun 8 Mar 2026 in New York is 23 h (D5)', () => {
    const w = dayWindow('2026-03-08', NY)
    expect(w.start.toISOString()).toBe('2026-03-08T05:00:00.000Z')
    expect(w.end.toISOString()).toBe('2026-03-09T04:00:00.000Z')
    expect(hoursOf(w)).toBe(23)
  })

  it('Sun 1 Nov 2026 in New York is 25 h (D6)', () => {
    const w = dayWindow('2026-11-01', NY)
    expect(w.start.toISOString()).toBe('2026-11-01T04:00:00.000Z')
    expect(w.end.toISOString()).toBe('2026-11-02T05:00:00.000Z')
    expect(hoursOf(w)).toBe(25)
  })

  it('Sat 7 -> Sun 8 -> Mon 9 Mar: each window ends where the next starts (D5)', () => {
    const sat = dayWindow('2026-03-07', NY)
    const sun = dayWindow('2026-03-08', NY)
    const mon = dayWindow('2026-03-09', NY)
    expect(sat.end).toEqual(sun.start)
    expect(sun.end).toEqual(mon.start)
    expect([hoursOf(sat), hoursOf(sun), hoursOf(mon)]).toEqual([24, 23, 24])
  })

  it('an item at 04:59Z is on Sun 1 Nov and one at 05:00Z on Mon 2 Nov (D6)', () => {
    const sun = dayWindow('2026-11-01', NY)
    const mon = dayWindow('2026-11-02', NY)
    const last = new Date('2026-11-02T04:59:00Z')
    const first = new Date('2026-11-02T05:00:00Z')
    expect(last >= sun.start && last < sun.end).toBe(true)
    expect(first >= sun.end).toBe(true)
    expect(first >= mon.start && first < mon.end).toBe(true)
  })

  it('today equals the window of its local date', () => {
    const now = new Date('2026-03-08T12:00:00Z')
    expect(dayWindow(localCalendarDate(now, NY), NY)).toEqual(todayWindow(now, NY))
  })

  it.each(['America/New_York', 'America/Mexico_City', 'America/Havana', 'Pacific/Kiritimati'])(
    'consecutive windows tile a whole year in %s',
    (zone) => {
      let date = '2026-01-01'
      let previousEnd: Date | null = null
      for (let i = 0; i < 365; i += 1) {
        const w = dayWindow(date, zone)
        expect(w.end.getTime()).toBeGreaterThan(w.start.getTime())
        if (previousEnd) expect(w.start).toEqual(previousEnd)
        previousEnd = w.end
        date = addCalendarDays(date, 1)
      }
      expect(date).toBe('2027-01-01')
    },
  )

  it('Havana: the day whose midnight is skipped starts at its first valid instant (D5 rule)', () => {
    // Cuba 2026-03-08: 00:00 -> 01:00 local, so the day is 23 h and starts at 05:00Z.
    const w = dayWindow('2026-03-08', 'America/Havana')
    expect(w.start.toISOString()).toBe('2026-03-08T05:00:00.000Z')
    expect(hoursOf(w)).toBe(23)
  })
})
