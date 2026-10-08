import { relativeTo, type TodayItem } from '@onti/shared'
import { useEffect, useRef } from 'react'
import { messages } from '../../messages'
import { clockTime, originalLabel, relativeLabel } from './format'
import styles from './ItemRow.module.css'
import { isPendingId } from './mutations/use-reminder-actions'
import { IDLE_ROWS, type RowsState } from './rows'

interface Props {
  item: TodayItem
  /** Ticking display time (use-now). */
  now: Date
  timezone: string
  /** Focus and animation, owned by the container; idle by default. */
  rows?: RowsState | undefined
  /** "late"/"in" labels; off for another day's page, where a row shows its time only (R18). */
  showRelative?: boolean
}

/**
 * One note on the page: time, title, tags and "late 15h05" / "in 25 min" as plain text (SG3),
 * "was Tue 18:00 · 2×" once snoozed (SG11). A done item is struck through in ink (SG12) and drops
 * its relative label. The row is the focus target of the keys (roving tabindex, SG13) and its
 * accessible name states title, time and state.
 */
export function ItemRow({ item, now, timezone, rows = IDLE_ROWS, showRelative = true }: Props) {
  const ref = useRef<HTMLLIElement>(null)
  const focused = rows.focusedId === item.id
  useEffect(() => {
    if (focused) ref.current?.focus()
  }, [focused])

  const done = item.doneAt !== null
  const pending = isPendingId(item.id)
  const snoozed = item.snoozeCount > 0
  const late = showRelative && relativeTo(item.dueAt, now).kind === 'late'
  const changed = rows.changed?.id === item.id ? rows.changed.kind : undefined
  const time = clockTime(item.dueAt, timezone)
  const states = done
    ? [messages.today.stateDone]
    : [
        ...(late ? [relativeLabel(item.dueAt, now)] : []),
        ...(snoozed ? [messages.today.stateSnoozed(item.snoozeCount)] : []),
      ]
  const title = <span className={styles.title}>{item.title}</span>
  return (
    <li
      ref={ref}
      className={styles.row}
      aria-label={messages.today.rowLabel(
        item.title,
        time,
        states.join(', ') || messages.today.stateOpen,
      )}
      tabIndex={rows.tabStopId === item.id ? 0 : -1}
      aria-busy={pending ? 'true' : undefined}
      data-pending={pending ? 'true' : undefined}
      data-focused={focused ? 'true' : undefined}
      data-changed={changed}
      onClick={() => rows.onFocusRow(item.id)}
      onAnimationEnd={changed ? rows.onChangeSettled : undefined}
    >
      <span className={styles.time}>{time}</span>
      {done ? <s className={styles.done}>{title}</s> : title}
      <span className={styles.meta}>
        {item.tags.map((tag) => (
          <span key={tag.slug}>#{tag.slug}</span>
        ))}
        {snoozed ? (
          <>
            <span>
              {messages.today.snoozedFrom(originalLabel(item.originalDueAt, item.dueAt, timezone))}
            </span>
            <span>{messages.today.snoozeCount(item.snoozeCount)}</span>
          </>
        ) : null}
        {done || !showRelative ? null : <span>{relativeLabel(item.dueAt, now)}</span>}
      </span>
    </li>
  )
}
