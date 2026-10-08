import { messages } from '../../messages'
import { clockTime } from '../today/format'
import styles from './SearchStatusline.module.css'

export type NotesHint = keyof typeof messages.notes.hints

interface Props {
  now: Date
  timezone: string
  /** The term the list belongs to; empty reads "all notes". */
  term: string
  /** The applied tag filter (R12), or `null`. */
  tag: string | null
  shown: number
  /** Every note the user has, never narrowed by the term. */
  total: number
  hints: NotesHint[]
}

/** `SEARCH · term · n of total`, the hints that work now, and the ticking clock. */
export function SearchStatusline({ now, timezone, term, tag, shown, total, hints }: Props) {
  return (
    <footer className={styles.bar}>
      <span className={styles.head}>
        {messages.notes.statusHead(term === '' ? messages.notes.allNotes : term, tag)}
      </span>{' '}
      <span className={styles.tail}>{messages.notes.statusTail(shown, total)}</span>
      <span className={styles.hints}>
        {hints.map((hint) => (
          <span key={hint}>{messages.notes.hints[hint]}</span>
        ))}
      </span>
      <span className={styles.clock}>{clockTime(now, timezone)}</span>
    </footer>
  )
}
