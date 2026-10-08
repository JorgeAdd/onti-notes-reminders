import { messages } from '../../messages'
import styles from './DateColumn.module.css'
import { dateBlock } from './format'

interface Props {
  now: Date
  timezone: string
  otherCount: number
  onSignOut: () => void
}

export function DateColumn({ now, timezone, otherCount, onSignOut }: Props) {
  const { day, weekday, month } = dateBlock(now, timezone)
  return (
    <aside className={styles.column}>
      {/* The single accent (SG2): the date block, nothing else. */}
      <div className={styles.block}>
        <span className={styles.numeral}>{day}</span>
        <span className={styles.weekday}>{weekday}</span>
      </div>
      <p className={styles.month}>{month}</p>
      <p className={styles.muted}>{timezone}</p>
      <p className={styles.muted}>{messages.today.otherNotes(otherCount)}</p>
      <button className={styles.signOut} type="button" onClick={onSignOut}>
        {messages.today.signOut}
      </button>
    </aside>
  )
}
