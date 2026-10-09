import { messages } from '../../messages'
import styles from './EmptyState.module.css'

interface Props {
  /** Other notes exist, just none for this day: "Nothing today" vs "No notes yet". */
  hasNotes: boolean
  /** The viewed day's label ("Fri 9"), only off today. */
  day?: string | undefined
  /** Slice 9: a plain-text pointer to the help, by input (`key` on a desktop, `touch` on a phone). */
  hint?: 'key' | 'touch'
}

/** Same page, calm copy, no onboarding (option A). */
export function EmptyState({ hasNotes, day, hint }: Props) {
  const nothing = day === undefined ? messages.today.nothingToday : messages.day.nothing(day)
  return (
    <>
      <p className={styles.empty}>{hasNotes ? nothing : messages.today.noNotes}</p>
      {hint === undefined ? null : (
        <p className={styles.hint}>
          {hint === 'key' ? messages.help.emptyHint : messages.help.emptyHintTouch}
        </p>
      )}
    </>
  )
}
