import { messages } from '../../messages'
import styles from './NoteStatus.module.css'

interface Props {
  kind: 'loading' | 'notFound' | 'error'
  onBack: () => void
  onRetry?: () => void
}

/** The note view while it loads, when the note is gone, and when the request failed: calm copy. */
export function NoteStatus({ kind, onBack, onRetry }: Props) {
  const m = messages.note
  const back = (
    <button className={styles.button} type="button" onClick={onBack}>
      {m.back}
    </button>
  )
  return (
    <main className={styles.desk}>
      <div className={styles.page}>
        {kind === 'loading' ? (
          <p className={styles.message} role="status">
            {m.loading}
          </p>
        ) : kind === 'notFound' ? (
          <>
            <p className={styles.message} role="status">
              {m.notFound}
            </p>
            {back}
          </>
        ) : (
          <>
            <p className={styles.message} role="alert">
              {m.loadError}
            </p>
            <button className={styles.button} type="button" onClick={onRetry}>
              {m.retry}
            </button>
            {back}
          </>
        )}
      </div>
    </main>
  )
}
