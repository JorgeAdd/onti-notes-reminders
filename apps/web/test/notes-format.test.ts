import { describe, expect, it } from 'vitest'
import { dueLabel } from '../src/features/notes/format'

const TZ = 'America/Mexico_City'
const now = new Date('2026-10-07T15:05:00.000Z')

describe('dueLabel', () => {
  it('is the weekday, day and 24 h time in the profile timezone', () => {
    expect(dueLabel(new Date('2026-10-06T23:00:00.000Z'), now, TZ)).toBe('Tue 6 17:00')
  })

  it('follows the timezone, not the instant (the day can differ)', () => {
    const instant = new Date('2026-10-07T03:00:00.000Z')
    expect(dueLabel(instant, now, 'UTC')).toBe('Wed 7 03:00')
    expect(dueLabel(instant, now, TZ)).toBe('Tue 6 21:00')
  })

  it('adds the month and year only when the year differs from now', () => {
    expect(dueLabel(new Date('2027-03-02T15:00:00.000Z'), now, TZ)).toBe('Tue 2 Mar 2027 09:00')
    expect(dueLabel(new Date('2025-12-31T18:00:00.000Z'), now, TZ)).toBe('Wed 31 Dec 2025 12:00')
  })

  it('compares the year in the profile timezone (New Year across zones)', () => {
    const newYear = new Date('2027-01-01T03:00:00.000Z')
    const lateDecember = new Date('2026-12-31T20:00:00.000Z')
    expect(dueLabel(newYear, lateDecember, TZ)).toBe('Thu 31 21:00')
  })
})
