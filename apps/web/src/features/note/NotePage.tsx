import { localCalendarDate, type NoteDetail } from '@onti/shared'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { messages } from '../../messages'
import { dueLabel } from '../notes/format'
import { ActionMessage } from '../today/ActionMessage'
import { DateColumn } from '../today/DateColumn'
import { NoteBody } from './NoteBody'
import styles from './NotePage.module.css'
import { NoteStatusline, type NoteMode } from './NoteStatusline'

interface Props {
  now: Date
  timezone: string
  note: NoteDetail
  mode: NoteMode
  /** The edit form, shown instead of the meta line and the body in edit mode. */
  form: ReactNode
  /** One line above the statusline (a failed save). */
  message: string | null
  onDismissMessage: () => void
  onEdit: () => void
  onBack: () => void
  onSignOut: () => void
}

/** The All notes frame around one note: date column, one h1, meta line, body and statusline. */
export function NotePage({
  now,
  timezone,
  note,
  mode,
  form,
  message,
  onDismissMessage,
  onEdit,
  onBack,
  onSignOut,
}: Props) {
  const heading = useRef<HTMLHeadingElement>(null)
  // On open, and on return from edit mode, focus moves to the heading (SG13, spec "Accessibility").
  useEffect(() => {
    if (mode === 'read') heading.current?.focus()
  }, [mode])
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
          <div className={styles.actions}>
            {mode === 'read' ? (
              <button className={styles.action} type="button" onClick={onEdit}>
                {messages.note.edit.open}
              </button>
            ) : null}
            <button className={styles.back} type="button" onClick={onBack}>
              {messages.note.back}
            </button>
          </div>
        </header>
        <main className={styles.main}>
          {mode === 'edit' ? (
            form
          ) : (
            <>
              <p className={styles.meta}>
                {note.tags.map((tag) => (
                  <span key={tag.slug}>#{tag.slug}</span>
                ))}
                <span>
                  {note.dueAt === null
                    ? messages.note.noReminder
                    : dueLabel(note.dueAt, now, timezone)}
                </span>
                <span>{messages.note.created(dueLabel(note.createdAt, now, timezone))}</span>
              </p>
              <NoteBody body={note.body} />
            </>
          )}
        </main>
      </div>
      <div className={styles.dock}>
        {message === null ? null : <ActionMessage message={message} onDismiss={onDismissMessage} />}
        <NoteStatusline now={now} timezone={timezone} mode={mode} />
      </div>
    </div>
  )
}
