import type { TodayItem } from '@onti/shared'
import { messages } from '../../messages'
import { clockTime } from './format'
import styles from './HourRail.module.css'
import { ItemRow } from './ItemRow'
import { buildRail } from './rail-model'
import type { RowsState } from './rows'

interface Props {
  items: TodayItem[]
  /** Ticking display time (use-now); the only clock the rail reads. */
  now: Date
  timezone: string
  rows?: RowsState | undefined
}

const hourText = (hour: number) => String(hour).padStart(2, '0')

/**
 * The day's timed items on an hour rail (board 03/05, SG7): hour labels, items at their hour and
 * a "now HH:MM" line in ink that steps with `now` (no animation, SG15). Layout comes from the pure
 * rail-model; empty-hour runs render as per-hour lines (desktop) and one gap row (mobile), CSS
 * shows one of them. Above the compact threshold it is a plain time list with the now line.
 */
export function HourRail({ items, now, timezone, rows: rowState }: Props) {
  const { compact, rows } = buildRail(items, now, timezone)
  if (rows.length === 0) return null
  return (
    <ol className={compact ? styles.compact : styles.rail}>
      {rows.map((row, index) => {
        switch (row.kind) {
          case 'hour':
            return (
              <li
                key={`hour-${row.hour}-${index}`}
                className={row.empty ? styles.emptyHour : styles.hour}
              >
                <span className={styles.hourLabel} data-hour={row.hour}>
                  {hourText(row.hour)}
                </span>
              </li>
            )
          case 'gap':
            return (
              <li key={`gap-${row.from}`} className={styles.gap}>
                <span className={styles.gapLabel}>
                  {hourText(row.from)}–{hourText(row.to)}
                </span>
              </li>
            )
          case 'now': {
            const label = messages.today.nowAt(clockTime(now, timezone))
            return (
              <li key="now" className={styles.now}>
                <span className={styles.nowLabel}>{label}</span>
              </li>
            )
          }
          case 'item':
            return (
              <ItemRow
                key={row.item.id}
                item={row.item}
                now={now}
                timezone={timezone}
                rows={rowState}
              />
            )
        }
      })}
    </ol>
  )
}
