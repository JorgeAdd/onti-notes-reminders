import { messages } from '../../messages'
import styles from './DateColumn.module.css'
import { DayNav, type DayNavState } from './DayNav'
import { calendarDateBlock } from './format'

interface Props {
  /** The viewed calendar date ("2026-10-08"), not the ticking clock. */
  date: string
  isToday: boolean
  timezone: string
  /** `null` while the viewed day loads: the count on screen would be the previous page's. */
  otherCount: number | null
  onSignOut: () => void
  nav?: (DayNavState & { mobile: boolean }) | undefined
}

export function DateColumn({ date, isToday, timezone, otherCount, onSignOut, nav }: Props) {
  const { day, weekday, month } = calendarDateBlock(date, timezone)
  return (
    <aside className={styles.column}>
      {/* The single accent (SG2): the date block, nothing else. */}
      <div className={styles.block} aria-current={isToday ? 'date' : undefined}>
        <span className={styles.numeral}>{day}</span>
        <span className={styles.weekday}>{weekday}</span>
      </div>
      <p className={styles.month}>{month}</p>
      <p className={styles.muted}>{timezone}</p>
      {otherCount === null ? null : (
        <p className={styles.muted}>{messages.today.otherNotes(otherCount)}</p>
      )}
      {nav ? <DayNav {...nav} /> : null}
      <button className={styles.signOut} type="button" onClick={onSignOut}>
        {messages.today.signOut}
      </button>
    </aside>
  )
}
