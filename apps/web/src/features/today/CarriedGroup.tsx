import type { TodayResponse } from '@onti/shared'
import { messages } from '../../messages'
import styles from './CarriedGroup.module.css'
import { dayLabel } from './format'
import { ItemRow } from './ItemRow'
import type { RowsState } from './rows'

interface Props {
  group: TodayResponse['carried'][number]
  now: Date
  timezone: string
  rows?: RowsState | undefined
}

/** R3 · "Still open from Tue 6": the unfinished items of one earlier day, oldest first. */
export function CarriedGroup({ group, now, timezone, rows }: Props) {
  const heading = `carried-${group.day.getTime()}`
  const items = [...group.items].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
  return (
    <section className={styles.group} aria-labelledby={heading}>
      <h2 id={heading} className={styles.title}>
        {messages.today.carriedFrom(dayLabel(group.day, timezone))}
      </h2>
      <ul className={styles.list}>
        {items.map((item) => (
          <ItemRow key={item.id} item={item} now={now} timezone={timezone} rows={rows} />
        ))}
      </ul>
    </section>
  )
}
