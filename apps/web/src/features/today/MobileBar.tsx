import { messages } from '../../messages'
import styles from './MobileBar.module.css'

interface Props {
  onCapture: () => void
  /** Rendered only when given. Append-only: a later slice adds Search before Tags. */
  onTags?: (() => void) | undefined
}

/** SG14 · the bottom bar on a phone: [Search?] [Tags?] "+ Capture". Each button exists only when its handler does. */
export function MobileBar({ onCapture, onTags }: Props) {
  return (
    <nav className={styles.bar}>
      {onTags ? (
        <button type="button" className={styles.secondary} onClick={onTags}>
          {messages.mobile.tags}
        </button>
      ) : null}
      <button type="button" className={styles.capture} onClick={onCapture}>
        {messages.mobile.capture}
      </button>
    </nav>
  )
}
