import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useNow } from '../src/features/today/use-now'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-07T15:05:30Z'))
})
afterEach(() => vi.useRealTimers())

const iso = (date: Date) => date.toISOString()

it('starts at the current minute, then steps exactly when the minute changes (C7)', () => {
  const { result } = renderHook(() => useNow(0))
  expect(iso(result.current)).toBe('2026-10-07T15:05:00.000Z')

  act(() => void vi.advanceTimersByTime(29_000))
  expect(iso(result.current)).toBe('2026-10-07T15:05:00.000Z')

  act(() => void vi.advanceTimersByTime(1_000))
  expect(iso(result.current)).toBe('2026-10-07T15:06:00.000Z')

  act(() => void vi.advanceTimersByTime(60_000))
  expect(iso(result.current)).toBe('2026-10-07T15:07:00.000Z')
})

it('applies the server skew so a wrong device clock agrees with the server', () => {
  const { result } = renderHook(() => useNow(2 * 60_000 + 10_000))
  expect(iso(result.current)).toBe('2026-10-07T15:07:00.000Z')
  // 15:07:40 server time -> next minute boundary in 20 s.
  act(() => void vi.advanceTimersByTime(20_000))
  expect(iso(result.current)).toBe('2026-10-07T15:08:00.000Z')
})

it('re-reads immediately when the skew changes after a refetch', () => {
  const { result, rerender } = renderHook(({ skew }) => useNow(skew), {
    initialProps: { skew: 0 },
  })
  rerender({ skew: 3_600_000 })
  expect(iso(result.current)).toBe('2026-10-07T16:05:00.000Z')
})

it('clears its timer on unmount', () => {
  const { unmount } = renderHook(() => useNow(0))
  unmount()
  expect(vi.getTimerCount()).toBe(0)
})
