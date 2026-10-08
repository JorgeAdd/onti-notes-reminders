import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useDebouncedValue } from '../src/features/notes/use-debounced-value'

afterEach(() => vi.useRealTimers())

it('returns the first value at once and follows changes only after the pause', () => {
  vi.useFakeTimers()
  const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
    initialProps: { value: 'a' },
  })
  expect(result.current).toBe('a')

  rerender({ value: 'ab' })
  act(() => void vi.advanceTimersByTime(199))
  expect(result.current).toBe('a')
  act(() => void vi.advanceTimersByTime(1))
  expect(result.current).toBe('ab')
})

it('restarts the pause on every change: only the last value arrives', () => {
  vi.useFakeTimers()
  const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
    initialProps: { value: '' },
  })
  for (const value of ['s', 'st', 'sta']) {
    rerender({ value })
    act(() => void vi.advanceTimersByTime(150))
  }
  expect(result.current).toBe('')
  act(() => void vi.advanceTimersByTime(50))
  expect(result.current).toBe('sta')
})
