import { messages } from '../../messages'
import styles from './NotesStatus.module.css'

interface Props {
  kind: 'loading' | 'error' | 'empty' | 'noMatch'
  /** The term of a "no match" message, shown as plain text. */
  term?: string
  onRetry?: () => void
  /** First load: the whole quiet frame. Otherwise the message sits where the list would be. */
  framed?: boolean
}

/** Loading, failure, empty and no-match, in calm copy (no onboarding). */
export function NotesStatus({ kind, term = '', onRetry, framed = false }: Props) {
  const m = messages.notes
  const body =
    kind === 'error' ? (
      <>
        <p className={styles.message} role="alert">
          {m.loadError}
        </p>
        <button className={styles.retry} type="button" onClick={onRetry}>
          {m.retry}
        </button>
      </>
    ) : (
      <p className={styles.message} role="status">
        {kind === 'loading' ? m.loading : kind === 'empty' ? m.empty : m.noMatch(term)}
      </p>
    )
  return framed ? (
    <main className={styles.desk}>
      <div className={styles.page}>{body}</div>
    </main>
  ) : (
    <div className={styles.inline}>{body}</div>
  )
}
