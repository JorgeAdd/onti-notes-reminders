import { useEffect } from 'react'

const TEXT_FIELD = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

/**
 * Decision 12 · one `keydown` listener on the document. Ignored while typing in a field, with
 * ctrl/meta/alt, or while `enabled` is false (command bar or sheet open). `handle` returns true
 * when it used the key, which stops the browser's own action for it.
 */
export function useKeyboardLayer(enabled: boolean, handle: (key: string) => boolean) {
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return
      if (event.target instanceof Element && event.target.closest(TEXT_FIELD)) return
      if (handle(event.key)) event.preventDefault()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [enabled, handle])
}
