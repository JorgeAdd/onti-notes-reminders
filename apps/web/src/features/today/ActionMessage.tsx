import { useEffect } from 'react'
import { messages } from '../../messages'
import styles from './ActionMessage.module.css'

/** Decision 11 · how long a failed-action line stays before it clears by itself. */
const VISIBLE_MS = 6_000

interface Props {
  message: string
  onDismiss: () => void
}

/** One status line above the statusline: what failed and that the item is back where it was. */
export function ActionMessage({ message, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, VISIBLE_MS)
    document.addEventListener('keydown', onDismiss)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', onDismiss)
    }
  }, [message, onDismiss])

  return (
    <p role="status" className={styles.line}>
      <span>{message}</span>
      <button type="button" className={styles.dismiss} onClick={onDismiss}>
        {messages.errors.dismiss}
      </button>
    </p>
  )
}
