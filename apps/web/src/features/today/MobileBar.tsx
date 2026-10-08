import { messages } from '../../messages'
import styles from './MobileBar.module.css'

interface Props {
  /** Each button renders only when its handler exists. */
  onSearch?: (() => void) | undefined
  onTags?: (() => void) | undefined
  onCapture?: (() => void) | undefined
}

/** SG14 · the bottom bar on a phone: [Search?] [Tags?] [+ Capture?]. Each button exists only when its handler does. */
export function MobileBar({ onSearch, onTags, onCapture }: Props) {
  return (
    <nav className={styles.bar}>
      {onSearch ? (
        <button type="button" className={styles.search} onClick={onSearch}>
          {messages.mobile.search}
        </button>
      ) : null}
      {onTags ? (
        <button type="button" className={styles.secondary} onClick={onTags}>
          {messages.mobile.tags}
        </button>
      ) : null}
      {onCapture ? (
        <button type="button" className={styles.capture} onClick={onCapture}>
          {messages.mobile.capture}
        </button>
      ) : null}
    </nav>
  )
}
