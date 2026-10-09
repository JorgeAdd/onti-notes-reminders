import { messages } from '../../messages'
import { calendarDayLabel, clockTime, dayLabel } from './format'
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
  /** The viewed calendar date; without it the day is today's, from `now`. */
  date?: string | undefined
  isToday?: boolean
  /** The viewed day is loading: its counts are not known yet. */
  loading?: boolean
  /** The mode label; NORMAL unless a tag filter is applied. */
  mode?: string | undefined
  /** Slice 9: opens the help; the button exists only when the page can open it. */
  onHelp?: ((from: HTMLElement) => void) | undefined
}

/** Decision 13 · the footer landmark: mode, weekday + day, counts, hints for the keys that work, the help button, and the ticking clock. */
export function Statusline({
  now,
  timezone,
  todayCount,
  carriedCount,
  totalCount,
  hints = [],
  date,
  isToday = true,
  loading = false,
  mode = messages.statusline.mode,
  onHelp,
}: Props) {
  const counts = isToday
    ? messages.statusline.counts(todayCount, carriedCount, totalCount)
    : messages.statusline.dayCounts(todayCount, totalCount)
  return (
    <footer className={styles.bar}>
      <span className={styles.mode}>{mode}</span>
      <span className={styles.day}>
        {date === undefined ? dayLabel(now, timezone) : calendarDayLabel(date, timezone)}
      </span>
      <span className={styles.counts}>{loading ? null : counts}</span>
      <span className={styles.hints}>
        {hints.map((hint) => (
          <span key={hint}>{messages.statusline.keys[hint]}</span>
        ))}
      </span>
      {onHelp ? (
        <button
          type="button"
          className={styles.help}
          aria-haspopup="dialog"
          aria-label={messages.help.open}
          onClick={(event) => onHelp(event.currentTarget)}
        >
          {messages.help.button}
        </button>
      ) : null}
      <span className={styles.clock}>{clockTime(now, timezone)}</span>
    </footer>
  )
}
