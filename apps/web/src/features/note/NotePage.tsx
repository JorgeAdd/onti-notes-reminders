import { localCalendarDate, type NoteDetail } from '@onti/shared'
import { useEffect, useRef } from 'react'
import { messages } from '../../messages'
import { dueLabel } from '../notes/format'
import { DateColumn } from '../today/DateColumn'
import { NoteBody } from './NoteBody'
import styles from './NotePage.module.css'
import { NoteStatusline } from './NoteStatusline'

interface Props {
  now: Date
  timezone: string
  note: NoteDetail
  onBack: () => void
  onSignOut: () => void
}

/** The All notes frame around one note: date column, one h1, meta line, body and statusline. */
export function NotePage({ now, timezone, note, onBack, onSignOut }: Props) {
  const heading = useRef<HTMLHeadingElement>(null)
  // On open, focus moves into the view: its heading (SG13, spec "Accessibility").
  useEffect(() => heading.current?.focus(), [])
  const done = note.doneAt !== null
  const title = <span>{note.title}</span>
  return (
    <div className={styles.desk}>
      <div className={styles.page}>
        <DateColumn
          date={localCalendarDate(now, timezone)}
          isToday
          timezone={timezone}
          note={null}
          onSignOut={onSignOut}
        />
        <header className={styles.header}>
          <h1 className={styles.title} ref={heading} tabIndex={-1}>
            {done ? <s className={styles.done}>{title}</s> : title}
            {done ? <span className={styles.hidden}>{messages.note.done}</span> : null}
          </h1>
          <button className={styles.back} type="button" onClick={onBack}>
            {messages.note.back}
          </button>
        </header>
        <main className={styles.main}>
          <p className={styles.meta}>
            {note.tags.map((tag) => (
              <span key={tag.slug}>#{tag.slug}</span>
            ))}
            <span>
              {note.dueAt === null ? messages.note.noReminder : dueLabel(note.dueAt, now, timezone)}
            </span>
            <span>{messages.note.created(dueLabel(note.createdAt, now, timezone))}</span>
          </p>
          <NoteBody body={note.body} />
        </main>
      </div>
      <div className={styles.dock}>
        <NoteStatusline now={now} timezone={timezone} />
      </div>
    </div>
  )
}
