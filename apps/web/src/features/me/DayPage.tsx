import type { MeResponse } from '@onti/shared'
import { messages } from '../../messages'
import styles from './DayPage.module.css'

interface Props {
  me: MeResponse | null
  error: string | null
  now: Date
  onSignOut: () => void
}

function part(now: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', { timeZone, ...options }).format(now)
}

export function DayPage({ me, error, now, onSignOut }: Props) {
  const t = messages.me
  const timeZone = me?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const day = part(now, timeZone, { day: 'numeric' })
  const weekday = part(now, timeZone, { weekday: 'long' })
  const month = part(now, timeZone, { month: 'long', year: 'numeric' })
  const clock = part(now, timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const shortDay = part(now, timeZone, { weekday: 'short', day: 'numeric' })

  return (
    <div className={styles.desk}>
      <main className={styles.page}>
        <aside className={styles.dateColumn}>
          <div className={styles.dateBlock}>
            <span className={styles.numeral}>{day}</span>
            <span className={styles.weekday}>{weekday}</span>
          </div>
          <p className={styles.meta}>{month}</p>
          <p className={styles.metaMuted}>{timeZone}</p>
        </aside>

        <section className={styles.content}>
          <h1 className={styles.title}>{messages.appName}</h1>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {!me && !error && <p className={styles.metaMuted}>{t.loading}</p>}
          {me && (
            <dl className={styles.facts}>
              <dt>{t.signedInAs}</dt>
              <dd>{me.email}</dd>
              <dt>{t.timezone}</dt>
              <dd>{me.timezone}</dd>
              <dt>{t.apiCheck}</dt>
              <dd>{t.apiOk}</dd>
            </dl>
          )}
          <button className={styles.signOut} type="button" onClick={onSignOut}>
            {t.signOut}
          </button>
        </section>
      </main>

      <footer className={styles.statusline}>
        <span className={styles.mode}>{t.modeNormal}</span>
        <span className={styles.segment}>{shortDay}</span>
        <span className={styles.spacer} />
        <span className={styles.clock}>{clock}</span>
      </footer>
    </div>
  )
}
