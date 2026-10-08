import { messages } from '../../messages'
import { clockTime, dayLabel } from './format'
import styles from './Statusline.module.css'

interface Props {
  now: Date
  timezone: string
  todayCount: number
  carriedCount: number
  totalCount: number
}

/** Decision 13 · the footer landmark: mode, weekday + day, counts and the ticking clock. No key hints yet. */
export function Statusline({ now, timezone, todayCount, carriedCount, totalCount }: Props) {
  return (
    <footer className={styles.bar}>
      <span className={styles.mode}>{messages.statusline.mode}</span>
      <span className={styles.day}>{dayLabel(now, timezone)}</span>
      <span className={styles.counts}>
        {messages.statusline.counts(todayCount, carriedCount, totalCount)}
      </span>
      <span className={styles.clock}>{clockTime(now, timezone)}</span>
    </footer>
  )
}
