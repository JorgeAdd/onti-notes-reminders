import { messages } from '../../messages'
import styles from './EmptyState.module.css'

interface Props {
  /** Other notes exist, just none for this day: "Nothing today" vs "No notes yet". */
  hasNotes: boolean
  /** The viewed day's label ("Fri 9"), only off today. */
  day?: string | undefined
}

/** Same page, calm copy, no onboarding (option A). */
export function EmptyState({ hasNotes, day }: Props) {
  const nothing = day === undefined ? messages.today.nothingToday : messages.day.nothing(day)
  return <p className={styles.empty}>{hasNotes ? nothing : messages.today.noNotes}</p>
}
