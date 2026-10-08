import { localCalendarDate } from '@onti/shared'
import type { ReactNode, RefObject } from 'react'
import { messages } from '../../messages'
import { DateColumn } from '../today/DateColumn'
import styles from './NotesPage.module.css'
import { SearchInput } from './SearchInput'
import { SearchStatusline, type NotesHint } from './SearchStatusline'

interface Props {
  now: Date
  timezone: string
  inputRef: RefObject<HTMLInputElement | null>
  term: string
  onTermChange: (term: string) => void
  onInputFocusChange: (focused: boolean) => void
  onBack: () => void
  onSignOut: () => void
  /** The rows or the message that stands in for them. */
  results: ReactNode
  /** The term the rows belong to, with the shown and total counts for the statusline. */
  shown: { term: string; count: number; total: number }
  hints: NotesHint[]
}

/** The day-page frame for All notes: date column, one h1, the results, and the search dock. */
export function NotesPage({
  now,
  timezone,
  inputRef,
  term,
  onTermChange,
  onInputFocusChange,
  onBack,
  onSignOut,
  results,
  shown,
  hints,
}: Props) {
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
          <h1 className={styles.title}>{messages.notes.title}</h1>
          <button className={styles.back} type="button" onClick={onBack}>
            {messages.notes.back}
          </button>
        </header>
        <main className={styles.main}>
          {results}
          {/* Announced politely when the count changes; empty while a message stands in. */}
          <p className={styles.hidden} aria-live="polite">
            {shown.count === 0 ? '' : messages.notes.count(shown.count)}
          </p>
        </main>
      </div>
      <div className={styles.dock}>
        <SearchInput
          inputRef={inputRef}
          value={term}
          onChange={onTermChange}
          onFocusChange={onInputFocusChange}
        />
        <SearchStatusline
          now={now}
          timezone={timezone}
          term={shown.term}
          shown={shown.count}
          total={shown.total}
          hints={hints}
        />
      </div>
    </div>
  )
}
