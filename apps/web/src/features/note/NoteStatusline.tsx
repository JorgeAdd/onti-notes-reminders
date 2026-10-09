import { messages } from '../../messages'
import { clockTime } from '../today/format'
import styles from './NoteStatusline.module.css'

export type NoteMode = 'read' | 'edit'

interface Props {
  now: Date
  timezone: string
  mode: NoteMode
}

/** The mode (`NOTE` or `EDIT`), the keys that work in it, and the clock. */
export function NoteStatusline({ now, timezone, mode }: Props) {
  const { note } = messages
  return (
    <footer className={styles.bar}>
      <span className={styles.mode}>
        {mode === 'edit' ? note.edit.statusHead : note.statusHead}
      </span>
      <span className={styles.hints}>
        {mode === 'edit' ? (
          <span>{note.edit.hints.cancel}</span>
        ) : (
          <>
            <span>{note.hints.edit}</span>
            <span>{note.hints.back}</span>
          </>
        )}
      </span>
      <span className={styles.clock}>{clockTime(now, timezone)}</span>
    </footer>
  )
}
