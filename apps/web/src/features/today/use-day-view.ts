import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { readView, writeView, type DayView } from './day-view'

/** `pushState` and `replaceState` fire no event, so this module tells its own subscribers. */
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('popstate', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('popstate', listener)
  }
}

const readSearch = () => window.location.search

/**
 * Decision 8 · the viewed day and tag, read from `location.search` (no router). `push` for a
 * user navigation so back restores it; `replace` to drop an invalid or redundant param.
 */
export function useDayView() {
  const search = useSyncExternalStore(subscribe, readSearch, () => '')
  const view = useMemo(() => readView(search), [search])

  const setView = useCallback((patch: Partial<DayView>, mode: 'push' | 'replace' = 'push') => {
    const current = window.location.search
    const next = writeView(current, { ...readView(current), ...patch })
    if (next === current) return
    const url = `${window.location.pathname}${next}${window.location.hash}`
    if (mode === 'push') window.history.pushState(null, '', url)
    else window.history.replaceState(null, '', url)
    listeners.forEach((listener) => listener())
  }, [])

  return { view, setView }
}
