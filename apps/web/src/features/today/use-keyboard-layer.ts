import { useEffect, useRef } from 'react'

const TEXT_FIELD = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

/**
 * Decision 12 · one `keydown` listener on the document. Ignored while typing in a field, with
 * ctrl/meta/alt, or while `enabled` is false (command bar or sheet open). `handle` returns true
 * when it used the key, which stops the browser's own action for it. The listener is registered
 * only when `enabled` changes; the latest `handle` is read from a ref, so a re-render between two
 * layers during one dispatch never removes and re-adds the listeners (a later layer would be skipped).
 */
export function useKeyboardLayer(enabled: boolean, handle: (key: string) => boolean) {
  const latest = useRef(handle)
  useEffect(() => {
    latest.current = handle
  })
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return
      if (event.target instanceof Element && event.target.closest(TEXT_FIELD)) return
      if (latest.current(event.key)) event.preventDefault()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
