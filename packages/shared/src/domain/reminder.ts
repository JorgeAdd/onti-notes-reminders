import { localTimeOn, truncateToMinute } from './time'

const HOUR = 3_600_000
const MISSED_AFTER = 24 * HOUR

/** The reminder fields of a note (ADR-003). All null/0 when the note has no reminder. */
export interface Reminder {
  dueAt: Date | null
  originalDueAt: Date | null
  snoozeCount: number
  doneAt: Date | null
  notifiedDueAt: Date | null
}

export type ScheduledReminder = Reminder & { dueAt: Date; originalDueAt: Date }

export const NO_REMINDER: Reminder = {
  dueAt: null,
  originalDueAt: null,
  snoozeCount: 0,
  doneAt: null,
  notifiedDueAt: null,
}

export function hasReminder(reminder: Reminder): reminder is ScheduledReminder {
  return reminder.dueAt !== null && reminder.originalDueAt !== null
}

export function isOpen(reminder: Reminder): reminder is ScheduledReminder {
  return hasReminder(reminder) && reminder.doneAt === null
}

/** R2 · due time passed and not done. */
export function isOverdue(reminder: Reminder, now: Date): boolean {
  return isOpen(reminder) && reminder.dueAt.getTime() < now.getTime()
}

function assertOpen(reminder: Reminder): asserts reminder is ScheduledReminder {
  if (!isOpen(reminder)) throw new Error('Only open reminders can be snoozed')
}

/** R7 · the due time a snooze preset leads to: "+1 h" = now + 1 h (to the minute), "Tomorrow" = next local day 09:00. */
export function snoozeDue(preset: 'hour' | 'tomorrow', now: Date, timeZone: string): Date {
  return preset === 'hour'
    ? new Date(truncateToMinute(now).getTime() + HOUR)
    : localTimeOn(now, timeZone, 1, 9, 0)
}

/** R7 · "+1 h" = now + 1 h, truncated to the minute. */
export function snoozeOneHour(reminder: Reminder, now: Date): ScheduledReminder {
  assertOpen(reminder)
  return {
    ...reminder,
    dueAt: snoozeDue('hour', now, 'UTC'),
    snoozeCount: reminder.snoozeCount + 1,
  }
}

/** R7 · "Tomorrow 9:00" = next local day at 09:00. */
export function snoozeTomorrow(reminder: Reminder, now: Date, timeZone: string): ScheduledReminder {
  assertOpen(reminder)
  return {
    ...reminder,
    dueAt: snoozeDue('tomorrow', now, timeZone),
    snoozeCount: reminder.snoozeCount + 1,
  }
}

/** R8 · a manual reschedule resets the snooze history. */
export function reschedule(reminder: Reminder, dueAt: Date): ScheduledReminder {
  return { ...reminder, dueAt, originalDueAt: dueAt, snoozeCount: 0, doneAt: null }
}

/** R9 · done on a done note keeps the first `doneAt`. */
export function markDone(reminder: Reminder, now: Date): Reminder {
  if (!hasReminder(reminder)) throw new Error('A note without a reminder cannot be done')
  if (reminder.doneAt !== null) return reminder
  return { ...reminder, doneAt: now }
}

/** R9 */
export function undoDone(reminder: Reminder): Reminder {
  return { ...reminder, doneAt: null }
}

/** R10 · once per due_at value. */
export function isNotificationDue(reminder: Reminder, now: Date): boolean {
  return (
    isOpen(reminder) &&
    reminder.dueAt.getTime() <= now.getTime() &&
    reminder.notifiedDueAt?.getTime() !== reminder.dueAt.getTime()
  )
}

export function markNotified(reminder: ScheduledReminder): ScheduledReminder {
  return { ...reminder, notifiedDueAt: reminder.dueAt }
}

/** R17 · still open 24 h after the ORIGINAL due time (snoozing does not reset it). */
export function isMissed(reminder: Reminder, now: Date): boolean {
  return isOpen(reminder) && now.getTime() >= reminder.originalDueAt.getTime() + MISSED_AFTER
}
