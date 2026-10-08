import { describe, expect, it } from 'vitest'
import { at, TZ } from '@onti/shared/fixtures/jorge-week'
import {
  clockTime,
  dateBlock,
  dayLabel,
  originalLabel,
  relativeLabel,
  weekdayTime,
} from '../src/features/today/format'
import { messages } from '../src/messages'

describe('relativeLabel (R2, R6)', () => {
  const now = at('2026-10-07 09:05')

  it('reads "late {duration}" for an overdue instant (C4)', () => {
    expect(relativeLabel(at('2026-10-06 18:00'), now)).toBe('late 15h05')
    expect(relativeLabel(at('2026-10-06 18:30'), now)).toBe('late 14h35')
  })

  it('reads "in {duration}" for an upcoming instant (C4)', () => {
    expect(relativeLabel(at('2026-10-07 09:30'), now)).toBe('in 25 min')
    expect(relativeLabel(at('2026-10-07 16:00'), now)).toBe('in 6h55')
  })

  it('steps by the minute (C7: 09:31 reads "late 1 min")', () => {
    expect(relativeLabel(at('2026-10-07 09:30'), at('2026-10-07 09:31'))).toBe('late 1 min')
    expect(relativeLabel(at('2026-10-07 09:30'), at('2026-10-07 09:06'))).toBe('in 24 min')
    expect(relativeLabel(at('2026-10-07 09:30'), at('2026-10-07 09:30'))).toBe('in 0 min')
  })
})

describe('date parts in the profile timezone', () => {
  it('labels the local day, not the UTC day', () => {
    // 2026-10-07 02:00 UTC is still Tue 6 in Mexico City.
    expect(dayLabel(new Date('2026-10-07T02:00:00Z'), TZ)).toBe('Tue 6')
    expect(dayLabel(new Date('2026-10-07T02:00:00Z'), 'UTC')).toBe('Wed 7')
  })

  it('formats the local clock as HH:mm, 24 h', () => {
    expect(clockTime(at('2026-10-07 09:05'), TZ)).toBe('09:05')
    expect(clockTime(at('2026-10-07 16:00'), TZ)).toBe('16:00')
    expect(clockTime(new Date('2026-10-07T00:00:00Z'), 'UTC')).toBe('00:00')
  })
})

describe('messages.today header (R4)', () => {
  it('uses the plural, the singular, and "left" once something is done', () => {
    expect(messages.today.header(4, false)).toBe('4 things today')
    expect(messages.today.header(1, false)).toBe('1 thing today')
    expect(messages.today.header(0, false)).toBe('0 things today')
    expect(messages.today.header(2, true)).toBe('2 left today')
  })

  it('writes the carried group and other notes copy (R3, R5)', () => {
    expect(messages.today.carriedFrom('Tue 6')).toBe('Still open from Tue 6')
    expect(messages.today.otherNotes(11)).toBe('11 other notes on the back of the pad')
    expect(messages.today.otherNotes(1)).toBe('1 other note on the back of the pad')
  })
})

describe('dateBlock', () => {
  it('splits the day into numeral, weekday and month in the profile timezone', () => {
    expect(dateBlock(new Date('2026-10-07T15:05:00Z'), 'America/Mexico_City')).toEqual({
      day: '7',
      weekday: 'Wednesday',
      month: 'October 2026',
    })
  })

  it('follows the timezone across the date line', () => {
    const instant = new Date('2026-10-07T23:30:00Z')
    expect(dateBlock(instant, 'Pacific/Auckland')).toEqual({
      day: '8',
      weekday: 'Thursday',
      month: 'October 2026',
    })
  })
})

describe('weekdayTime', () => {
  it('reads "Thu 09:00" in the profile timezone', () => {
    expect(weekdayTime(at('2026-10-08 09:00'), TZ)).toBe('Thu 09:00')
  })
})

describe('originalLabel (SG11)', () => {
  it('is the time alone when the original was on the same day as the due time', () => {
    expect(originalLabel(at('2026-10-07 09:30'), at('2026-10-07 10:05'), TZ)).toBe('09:30')
  })

  it('adds the weekday when the original was on another day', () => {
    expect(originalLabel(at('2026-10-06 18:00'), at('2026-10-07 10:05'), TZ)).toBe('Tue 18:00')
  })
})
