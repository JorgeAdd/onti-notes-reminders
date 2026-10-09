import { useEffect, useRef, type RefObject } from 'react'

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

interface Options {
  /** Escape was pressed anywhere on the page. */
  onEscape: () => void
  /** The element to give focus back to on close, if it is still in the document. */
  returnTo: HTMLElement | null
}

/**
 * Decision 6 · the dialog's focus lifecycle. On mount focus moves to the `[data-autofocus]`
 * control (else the first one, else the container); one document `keydown` keeps Tab inside
 * (also when focus fell to the body) and turns Escape into `onEscape`, with `preventDefault` so
 * no later layer reuses the key; on unmount focus goes back to `returnTo`. No dependency.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, options: Options) {
  const latest = useRef(options)
  useEffect(() => {
    latest.current = options
  })

  useEffect(() => {
    const container = ref.current
    if (!container) return
    const tabbable = () => [...container.querySelectorAll<HTMLElement>(TABBABLE)]
    const first = container.querySelector<HTMLElement>('[data-autofocus]') ?? tabbable()[0]
    ;(first ?? container).focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        latest.current.onEscape()
        return
      }
      if (event.key !== 'Tab') return
      const items = tabbable()
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (!firstItem || !lastItem) {
        event.preventDefault()
        return
      }
      const active = document.activeElement
      const inside = active !== null && container.contains(active)
      const edge = event.shiftKey
        ? active === firstItem || active === container
        : active === lastItem
      if (!inside || edge) {
        event.preventDefault()
        ;(event.shiftKey ? lastItem : firstItem).focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const { returnTo } = latest.current
      if (returnTo?.isConnected) returnTo.focus()
    }
  }, [ref])
}
