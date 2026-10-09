import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { messages } from '../../messages'
import { useNarrow } from '../today/use-narrow'
import { HelpContent } from './HelpContent'
import { buildHelp } from './help-model'
import { useFocusTrap } from './use-focus-trap'
import styles from './HelpDialog.module.css'

interface Props {
  onClose: () => void
  /** The element that opened it; focus goes back there on close. */
  returnTo: HTMLElement | null
}

/**
 * Slice 9 · the "How it works" help. A modal over the page on a desktop (portal and scrim); at
 * 640 px or less a sheet inside the dock, where the page puts it in place of the bars. Loaded
 * lazily on the first `?`.
 */
export default function HelpDialog({ onClose, returnTo }: Props) {
  const narrow = useNarrow()
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useFocusTrap(ref, { onEscape: onClose, returnTo })
  const dialog = (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={narrow ? styles.sheet : styles.card}
    >
      <header className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {messages.help.title}
        </h2>
        <button type="button" data-autofocus className={styles.close} onClick={onClose}>
          {messages.help.close}
        </button>
      </header>
      <HelpContent sections={buildHelp(narrow)} />
    </div>
  )
  if (narrow) {
    return (
      <>
        {/* Transparent and above the page: the outside tap closes help and never reaches a row. */}
        <div data-testid="help-backdrop" className={styles.backdrop} onClick={onClose} />
        {dialog}
      </>
    )
  }
  return createPortal(
    <div
      className={styles.scrim}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {dialog}
    </div>,
    document.body,
  )
}
