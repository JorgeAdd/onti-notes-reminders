import { messages } from '../../messages'
import styles from './MobileBar.module.css'

interface Props {
  onCapture: () => void
}

/** SG14 · the bottom bar on a phone. Slice 2 ships only "+ Capture"; Search and Tags come later. */
export function MobileBar({ onCapture }: Props) {
  return (
    <nav className={styles.bar}>
      <button type="button" className={styles.capture} onClick={onCapture}>
        {messages.mobile.capture}
      </button>
    </nav>
  )
}
