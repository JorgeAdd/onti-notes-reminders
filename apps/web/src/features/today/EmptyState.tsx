import { messages } from '../../messages'
import styles from './EmptyState.module.css'

interface Props {
  /** Other notes exist, just none for today: "Nothing today" vs "No notes yet". */
  hasNotes: boolean
}

/** Same page, calm copy, no onboarding (option A). */
export function EmptyState({ hasNotes }: Props) {
  return (
    <p className={styles.empty}>
      {hasNotes ? messages.today.nothingToday : messages.today.noNotes}
    </p>
  )
}
