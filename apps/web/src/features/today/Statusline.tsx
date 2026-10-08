import { messages } from '../../messages'
import { clockTime, dayLabel } from './format'
import type { KeyHint } from './keys'
import styles from './Statusline.module.css'

interface Props {
  now: Date
  timezone: string
  todayCount: number
  carriedCount: number
  totalCount: number
  /** Keys that work right now; nothing else is hinted. */
  hints?: KeyHint[] | undefined
}

/** Decision 13 · the footer landmark: mode, weekday + day, counts, hints for the keys that work, and the ticking clock. */
export function Statusline({
  now,
  timezone,
  todayCount,
  carriedCount,
  totalCount,
  hints = [],
}: Props) {
  return (
    <footer className={styles.bar}>
      <span className={styles.mode}>{messages.statusline.mode}</span>
      <span className={styles.day}>{dayLabel(now, timezone)}</span>
      <span className={styles.counts}>
        {messages.statusline.counts(todayCount, carriedCount, totalCount)}
      </span>
      <span className={styles.hints}>
        {hints.map((hint) => (
          <span key={hint}>{messages.statusline.keys[hint]}</span>
        ))}
      </span>
      <span className={styles.clock}>{clockTime(now, timezone)}</span>
    </footer>
  )
}
