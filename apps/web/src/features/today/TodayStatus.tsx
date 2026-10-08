import { messages } from '../../messages'
import styles from './TodayStatus.module.css'

interface Props {
  failed: boolean
  onRetry: () => void
}

/** Loading and failure share the quiet frame of the page, so nothing jumps when data arrives. */
export function TodayStatus({ failed, onRetry }: Props) {
  const t = messages.today
  return (
    <main className={styles.desk}>
      <div className={styles.page}>
        {failed ? (
          <>
            <p className={styles.message} role="alert">
              {t.loadError}
            </p>
            <button className={styles.retry} type="button" onClick={onRetry}>
              {t.retry}
            </button>
          </>
        ) : (
          <p className={styles.message} role="status">
            {t.loading}
          </p>
        )}
      </div>
    </main>
  )
}
