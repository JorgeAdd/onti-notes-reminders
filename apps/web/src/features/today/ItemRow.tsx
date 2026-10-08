import type { TodayItem } from '@onti/shared'
import { relativeLabel, clockTime } from './format'
import styles from './ItemRow.module.css'

interface Props {
  item: TodayItem
  /** Ticking display time (use-now). */
  now: Date
  timezone: string
}

/**
 * One note on the page, read-only: time, title, tags and "late 15h05" / "in 25 min" as plain
 * text (SG3). A done item is struck through in ink (SG12) and drops its relative label.
 */
export function ItemRow({ item, now, timezone }: Props) {
  const done = item.doneAt !== null
  const title = <span className={styles.title}>{item.title}</span>
  return (
    <li className={styles.row}>
      <span className={styles.time}>{clockTime(item.dueAt, timezone)}</span>
      {done ? <s className={styles.done}>{title}</s> : title}
      <span className={styles.meta}>
        {item.tags.map((tag) => (
          <span key={tag.slug}>#{tag.slug}</span>
        ))}
        {done ? null : <span>{relativeLabel(item.dueAt, now)}</span>}
      </span>
    </li>
  )
}
