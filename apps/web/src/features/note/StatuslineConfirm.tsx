import { messages } from '../../messages'
import { clockTime } from '../today/format'
import styles from './StatuslineConfirm.module.css'

interface Props {
  now: Date
  timezone: string
  /** The DELETE is in flight: the buttons are off, so nothing fires twice. */
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * The inline delete confirm (SG20): it takes the statusline slot, no modal. `↵` and `esc` are
 * heard by the note view's key layer; the two buttons are the touch way (44 px).
 */
export function StatuslineConfirm({ now, timezone, busy, onConfirm, onCancel }: Props) {
  const { delete: del } = messages.note
  return (
    <footer className={styles.bar}>
      <span className={styles.mode}>{del.statusHead}</span>
      <span className={styles.prompt}>{del.prompt}</span>
      <span className={styles.actions}>
        <button type="button" className={styles.button} disabled={busy} onClick={onConfirm}>
          {del.confirm}
        </button>
        <button type="button" className={styles.button} disabled={busy} onClick={onCancel}>
          {del.cancel}
        </button>
      </span>
      <span className={styles.clock}>{clockTime(now, timezone)}</span>
    </footer>
  )
}
