import type { ReactNode } from 'react'
import { messages } from '../../messages'
import { ThemeControl } from '../theme/ThemeControl'
import styles from './DateColumn.module.css'
import { DayNav, type DayNavState } from './DayNav'
import { calendarDateBlock } from './format'

interface Props {
  /** The viewed calendar date ("2026-10-08"), not the ticking clock. */
  date: string
  isToday: boolean
  timezone: string
  /** The muted side note (R5, or R12's "hidden"); `null` while the day loads, as the count on
   *  screen would be the previous page's. */
  note: string | null
  onSignOut: () => void
  nav?: (DayNavState & { mobile: boolean }) | undefined
  /** Today only: the theme control sits above Sign out (not on All notes). */
  showTheme?: boolean
  /** R19: the "Without a reminder" list (or its phone link), below Sign out. */
  undated?: ReactNode
}

export function DateColumn({
  date,
  isToday,
  timezone,
  note,
  onSignOut,
  nav,
  showTheme = false,
  undated = null,
}: Props) {
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
      {note === null ? null : <p className={styles.muted}>{note}</p>}
      {nav ? <DayNav {...nav} /> : null}
      <div className={styles.account}>
        {showTheme ? <ThemeControl /> : null}
        <button className={styles.signOut} type="button" onClick={onSignOut}>
          {messages.today.signOut}
        </button>
      </div>
      {undated}
    </aside>
  )
}
