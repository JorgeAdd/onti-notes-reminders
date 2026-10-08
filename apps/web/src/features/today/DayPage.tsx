import type { TodayResponse } from '@onti/shared'
import { ActionMessage } from './ActionMessage'
import { CarriedGroup } from './CarriedGroup'
import { DateColumn } from './DateColumn'
import styles from './DayPage.module.css'
import { EmptyState } from './EmptyState'
import { HourRail } from './HourRail'
import { PageHeader } from './PageHeader'
import type { KeyHint } from './keys'
import type { RowsState } from './rows'
import { Statusline } from './Statusline'
import { WhichKey } from './WhichKey'

const noop = () => undefined

interface Props {
  today: TodayResponse
  /** Ticking display time (use-now), never the device clock directly. */
  now: Date
  onSignOut: () => void
  /** A failed action, in one line above the statusline (Decision 11). */
  message?: string | null
  onDismissMessage?: () => void
  /** Row focus and animation (Decision 13). */
  rows?: RowsState | undefined
  /** `s` was pressed on an open item: show the which-key menu. */
  snoozeMenu?: boolean
  hints?: KeyHint[] | undefined
}

/** The page frame: date column, header and the area the day's items fill. */
export function DayPage({
  today,
  now,
  onSignOut,
  message = null,
  onDismissMessage,
  rows,
  snoozeMenu = false,
  hints,
}: Props) {
  const carriedCount = today.carried.reduce((sum, group) => sum + group.items.length, 0)
  // Decision 13: total notes derive from the page itself, no extra wire field.
  const totalCount = carriedCount + today.rail.length + today.otherCount
  const empty = carriedCount === 0 && today.rail.length === 0
  return (
    <div className={styles.desk}>
      <div className={styles.page}>
        <DateColumn
          now={now}
          timezone={today.timezone}
          otherCount={today.otherCount}
          onSignOut={onSignOut}
        />
        <PageHeader openCount={today.openCount} anyDone={today.anyDoneToday} />
        <main className={styles.main}>
          {empty ? (
            <EmptyState hasNotes={totalCount > 0} />
          ) : (
            <>
              {today.carried.map((group) => (
                <CarriedGroup
                  key={group.day.getTime()}
                  group={group}
                  now={now}
                  timezone={today.timezone}
                  rows={rows}
                />
              ))}
              <HourRail items={today.rail} now={now} timezone={today.timezone} rows={rows} />
            </>
          )}
        </main>
      </div>
      {snoozeMenu ? <WhichKey now={now} timezone={today.timezone} /> : null}
      {message === null ? null : (
        <ActionMessage message={message} onDismiss={onDismissMessage ?? noop} />
      )}
      <Statusline
        now={now}
        timezone={today.timezone}
        todayCount={today.openCount}
        carriedCount={carriedCount}
        totalCount={totalCount}
        hints={hints}
      />
    </div>
  )
}
