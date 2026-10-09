import type { NoteListItem } from '@onti/shared'
import { NoteRow } from './NoteRow'
import styles from './NoteList.module.css'

interface Props {
  notes: NoteListItem[]
  now: Date
  timezone: string
  onOpen: (id: string) => void
}

export function NoteList({ notes, now, timezone, onOpen }: Props) {
  return (
    <ul className={styles.list}>
      {notes.map((note) => (
        <NoteRow key={note.id} note={note} now={now} timezone={timezone} onOpen={onOpen} />
      ))}
    </ul>
  )
}
