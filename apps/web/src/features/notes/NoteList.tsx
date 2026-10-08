import type { NoteListItem } from '@onti/shared'
import { NoteRow } from './NoteRow'
import styles from './NoteList.module.css'

interface Props {
  notes: NoteListItem[]
  now: Date
  timezone: string
}

export function NoteList({ notes, now, timezone }: Props) {
  return (
    <ul className={styles.list}>
      {notes.map((note) => (
        <NoteRow key={note.id} note={note} now={now} timezone={timezone} />
      ))}
    </ul>
  )
}
