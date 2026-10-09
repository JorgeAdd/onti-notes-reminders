import { isValidTimeZone, PUSH_COPY, type PushPayload } from '@onti/shared'
import { firstLines } from '../domain/plain-text'
import type { ClaimedReminder } from './push-ports'

const BODY_LINES = 2
const BODY_MAX_CODE_POINTS = 120

function localTime(instant: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: isValidTimeZone(timezone) ? timezone : 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant)
}

/**
 * The notification of a claimed reminder (R16 title in the profile zone, SG17 real content).
 * Internal ids travel only in `tag` and `noteId`, never in visible text (rule 13).
 */
export function buildPushPayload(
  reminder: ClaimedReminder,
  extras: { token: string; apiUrl: string },
): PushPayload {
  const text = firstLines(reminder.body, BODY_LINES, BODY_MAX_CODE_POINTS)
  const tags = reminder.tagNames.join(', ')
  return {
    v: 1,
    title: `${localTime(reminder.dueAt, reminder.timezone)} · ${reminder.title}`,
    body: [text, tags].filter((part) => part !== '').join('\n'),
    tag: reminder.noteId,
    noteId: reminder.noteId,
    dueAt: reminder.dueAt.getTime(),
    apiUrl: extras.apiUrl,
    token: extras.token,
    appName: PUSH_COPY.appName,
    actions: [
      { action: 'done', title: PUSH_COPY.done },
      { action: 'snooze', title: PUSH_COPY.snooze },
    ],
  }
}
