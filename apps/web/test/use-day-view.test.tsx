import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useDayView } from '../src/features/today/use-day-view'

afterEach(() => window.history.replaceState(null, '', '/'))

describe('useDayView', () => {
  it('reads the initial view from the URL', () => {
    window.history.replaceState(null, '', '/?d=2026-10-06&tag=client-b')
    const { result } = renderHook(() => useDayView())
    expect(result.current.view).toEqual({ date: '2026-10-06', tag: 'client-b' })
  })

  it('pushes a history entry on navigation and keeps unknown params', () => {
    window.history.replaceState(null, '', '/?panel=notes')
    const { result } = renderHook(() => useDayView())
    const before = window.history.length

    act(() => result.current.setView({ date: '2026-10-06' }))

    expect(window.location.search).toBe('?panel=notes&d=2026-10-06')
    expect(window.history.length).toBe(before + 1)
    expect(result.current.view).toEqual({ date: '2026-10-06', tag: null })
  })

  it('back restores the previous view', async () => {
    const { result } = renderHook(() => useDayView())
    act(() => result.current.setView({ date: '2026-10-06' }))
    act(() => window.history.back())
    await waitFor(() => expect(result.current.view).toEqual({ date: null, tag: null }))
    expect(window.location.search).toBe('')
  })

  it('reads the view again on popstate', () => {
    const { result } = renderHook(() => useDayView())
    act(() => {
      window.history.pushState(null, '', '/?tag=client-b')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current.view).toEqual({ date: null, tag: 'client-b' })
  })

  it('replace drops a param without a new history entry; a no-change set pushes nothing', () => {
    window.history.replaceState(null, '', '/?d=2026-10-06&tag=nope')
    const { result } = renderHook(() => useDayView())
    const before = window.history.length

    act(() => result.current.setView({ tag: null }, 'replace'))
    expect(window.location.search).toBe('?d=2026-10-06')
    expect(result.current.view.tag).toBeNull()

    act(() => result.current.setView({ date: '2026-10-06' }))
    expect(window.history.length).toBe(before)
  })
})
