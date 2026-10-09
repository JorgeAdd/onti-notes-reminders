import { messages } from '../../messages'
import { clockTime } from '../today/format'
import styles from './NoteStatusline.module.css'

interface Props {
  now: Date
  timezone: string
}

/** `NOTE`, the keys that work in the view (`esc` only until editing ships), and the clock. */
export function NoteStatusline({ now, timezone }: Props) {
  return (
    <footer className={styles.bar}>
      <span className={styles.mode}>{messages.note.statusHead}</span>
      <span className={styles.hints}>
        <span>{messages.note.hints.back}</span>
      </span>
      <span className={styles.clock}>{clockTime(now, timezone)}</span>
    </footer>
  )
}
