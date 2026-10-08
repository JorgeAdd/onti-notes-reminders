import { messages } from '../../messages'
import styles from './DayNav.module.css'

export interface DayNavState {
  offToday: boolean
  onStep: (delta: 1 | -1) => void
  onToday: () => void
}

interface Props extends DayNavState {
  /** Phone width: ‹ › and Today buttons; desktop shows the keys as text (board 03). */
  mobile: boolean
}

/** D5 · day navigation beside the date block. The keys `[` `]` `t` work at every width. */
export function DayNav({ mobile, offToday, onStep, onToday }: Props) {
  if (!mobile) return <p className={styles.hint}>{messages.day.hint}</p>
  return (
    <nav className={styles.nav}>
      <button
        type="button"
        className={styles.button}
        aria-label={messages.day.prev}
        onClick={() => onStep(-1)}
      >
        ‹
      </button>
      <button
        type="button"
        className={styles.button}
        aria-label={messages.day.next}
        onClick={() => onStep(1)}
      >
        ›
      </button>
      {offToday ? (
        <button type="button" className={styles.today} onClick={onToday}>
          {messages.day.today}
        </button>
      ) : null}
    </nav>
  )
}
