import type { TodayResponse } from '@onti/shared'
import { CarriedGroup } from './CarriedGroup'
import { DateColumn } from './DateColumn'
import styles from './DayPage.module.css'
import { EmptyState } from './EmptyState'
import { HourRail } from './HourRail'
import { PageHeader } from './PageHeader'
import { Statusline } from './Statusline'

interface Props {
  today: TodayResponse
  /** Ticking display time (use-now), never the device clock directly. */
  now: Date
  onSignOut: () => void
}

/** The page frame: date column, header and the area the day's items fill. */
export function DayPage({ today, now, onSignOut }: Props) {
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
                />
              ))}
              <HourRail items={today.rail} now={now} timezone={today.timezone} />
            </>
          )}
        </main>
      </div>
      <Statusline
        now={now}
        timezone={today.timezone}
        todayCount={today.openCount}
        carriedCount={carriedCount}
        totalCount={totalCount}
      />
    </div>
  )
}
