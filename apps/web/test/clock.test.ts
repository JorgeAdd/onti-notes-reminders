import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { skewOf, timeWithSkew } from '../src/lib/clock'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

it('skew is the server instant minus the moment the response was received', () => {
  const received = Date.parse('2026-10-07T15:05:00Z')
  expect(skewOf(new Date('2026-10-07T15:05:03Z'), received)).toBe(3_000)
  expect(skewOf(new Date('2026-10-07T15:04:58Z'), received)).toBe(-2_000)
})

it('shows device time shifted by the skew, so a wrong device clock agrees with the server', () => {
  vi.setSystemTime(new Date('2026-10-07T10:00:00Z'))
  expect(timeWithSkew(0).toISOString()).toBe('2026-10-07T10:00:00.000Z')
  expect(timeWithSkew(3_600_000).toISOString()).toBe('2026-10-07T11:00:00.000Z')
  vi.advanceTimersByTime(60_000)
  expect(timeWithSkew(3_600_000).toISOString()).toBe('2026-10-07T11:01:00.000Z')
})
