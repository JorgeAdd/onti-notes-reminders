import type { TodayResponse } from '@onti/shared'
import { DateColumn } from './DateColumn'
import styles from './DayPage.module.css'
import { PageHeader } from './PageHeader'

interface Props {
  today: TodayResponse
  /** Ticking display time (use-now), never the device clock directly. */
  now: Date
  onSignOut: () => void
}

/** The page frame: date column, header and the area the day's items fill. */
export function DayPage({ today, now, onSignOut }: Props) {
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
        <main className={styles.main} />
      </div>
    </div>
  )
}
