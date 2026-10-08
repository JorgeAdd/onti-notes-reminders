import { useSyncExternalStore } from 'react'

/** Same breakpoint as the `@media (max-width: 640px)` rules in the CSS modules. */
const NARROW = '(max-width: 640px)'

const query = () => (typeof matchMedia === 'function' ? matchMedia(NARROW) : null)

function subscribe(onChange: () => void) {
  const list = query()
  list?.addEventListener('change', onChange)
  return () => list?.removeEventListener('change', onChange)
}

/** True on a phone-width screen: the bottom bar, the preset row and the row-tap sheet apply. */
export function useNarrow(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => query()?.matches ?? false,
    () => false,
  )
}
