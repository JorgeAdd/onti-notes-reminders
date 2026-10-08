import { snoozeDue, type SnoozePreset, type TodayItem } from '@onti/shared'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { messages } from '../../messages'
import styles from './ActionSheet.module.css'
import { clockTime, weekdayTime } from './format'

interface Props {
  item: TodayItem
  /** Display time: the same clock and shared math as the which-key menu. */
  now: Date
  timezone: string
  onDone: () => void
  onUndo: () => void
  onSnooze: (preset: SnoozePreset) => void
  onClose: () => void
}

/** SG14 · what a row tap opens on a phone: the keys' actions as 44 px buttons with their times. */
export function ActionSheet({ item, now, timezone, onDone, onUndo, onSnooze, onClose }: Props) {
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => first.current?.focus(), [])
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose()
  }
  const done = item.doneAt !== null
  return (
    <div
      role="dialog"
      aria-label={messages.actionSheet.label(item.title)}
      className={styles.sheet}
      onKeyDown={onKeyDown}
    >
      {done ? (
        <button ref={first} type="button" className={styles.action} onClick={onUndo}>
          {messages.actionSheet.undo}
        </button>
      ) : (
        <>
          <button ref={first} type="button" className={styles.action} onClick={onDone}>
            {messages.actionSheet.done}
          </button>
          <button type="button" className={styles.action} onClick={() => onSnooze('hour')}>
            {messages.whichKey.hour(clockTime(snoozeDue('hour', now, timezone), timezone))}
          </button>
          <button type="button" className={styles.action} onClick={() => onSnooze('tomorrow')}>
            {messages.whichKey.tomorrow(
              weekdayTime(snoozeDue('tomorrow', now, timezone), timezone),
            )}
          </button>
        </>
      )}
      <button type="button" className={styles.action} onClick={onClose}>
        {messages.actionSheet.close}
      </button>
    </div>
  )
}
