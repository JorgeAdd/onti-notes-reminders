import type { NoteListItem } from '@onti/shared'
import { messages } from '../../messages'
import { dueLabel } from './format'
import styles from './NoteRow.module.css'

interface Props {
  note: NoteListItem
  /** Display time: only used to decide whether the due label needs a year. */
  now: Date
  timezone: string
  /** Opens the note view for this row (click, or Enter on the focused button). */
  onOpen: (id: string) => void
}

/**
 * One note in the All notes list: a single button inside the `<li>` (Tab and Enter; there are no
 * row actions, so `x`, `s` and `z` have nothing to act on). The excerpt is a text node, never markup.
 */
export function NoteRow({ note, now, timezone, onOpen }: Props) {
  const done = note.doneAt !== null
  const title = <span className={styles.title}>{note.title}</span>
  return (
    <li className={styles.item}>
      <button className={styles.row} type="button" onClick={() => onOpen(note.id)}>
        {done ? <s className={styles.done}>{title}</s> : title}
        {done ? <span className={styles.hidden}>{messages.notes.done}</span> : null}
        <span className={styles.meta}>
          {note.tags.map((tag) => (
            <span key={tag.slug}>#{tag.slug}</span>
          ))}
          {note.dueAt === null ? null : <span>{dueLabel(note.dueAt, now, timezone)}</span>}
        </span>
        {note.excerpt === '' ? null : <span className={styles.excerpt}>{note.excerpt}</span>}
      </button>
    </li>
  )
}
