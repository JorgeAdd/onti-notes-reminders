import { snoozeDue } from '@onti/shared'
import { messages } from '../../messages'
import { clockTime, weekdayTime } from './format'
import { SNOOZE_KEYS } from './keys'
import styles from './WhichKey.module.css'

interface Props {
  /** Display time: the same clock the optimistic snooze uses. */
  now: Date
  timezone: string
}

/** SG11 · the menu after `s`: each key with the time it leads to (shared R7 math). */
export function WhichKey({ now, timezone }: Props) {
  return (
    <ul className={styles.menu} aria-label={messages.whichKey.label}>
      <li>
        <kbd className={styles.key}>{SNOOZE_KEYS.hour}</kbd>
        {messages.whichKey.hour(clockTime(snoozeDue('hour', now, timezone), timezone))}
      </li>
      <li>
        <kbd className={styles.key}>{SNOOZE_KEYS.tomorrow}</kbd>
        {messages.whichKey.tomorrow(weekdayTime(snoozeDue('tomorrow', now, timezone), timezone))}
      </li>
    </ul>
  )
}
