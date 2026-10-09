import {
  CAPTURE_LIMITS,
  parseCapture,
  startOfLocalDayPlus,
  todayWindow,
  type CaptureResult,
} from '@onti/shared'
import { messages } from '../../messages'
import { clockTime, relativeLabel, weekdayTime } from './format'

export interface CaptureSubmit {
  /** What was typed, kept so a failed save can reopen the bar with it. */
  text: string
  capture: CaptureResult
}

export type Preview =
  { kind: 'empty' } | { kind: 'tooLong' } | { kind: 'ok'; text: string; capture: CaptureResult }

/** "today 17:00", "tomorrow 09:00" or "Fri 11:12": the day word the user would expect. */
function whenLabel(dueAt: Date, now: Date, timeZone: string): string {
  const { start, end } = todayWindow(now, timeZone)
  if (dueAt >= start && dueAt < end) return messages.capture.today(clockTime(dueAt, timeZone))
  if (dueAt >= end && dueAt < startOfLocalDayPlus(now, timeZone, 2)) {
    return messages.capture.tomorrow(clockTime(dueAt, timeZone))
  }
  return weekdayTime(dueAt, timeZone)
}

/** "today 17:00 · in 5h48": a due time as the preview words it (also used by the note edit form). */
export function describeDue(dueAt: Date, now: Date, timeZone: string): string {
  return `${whenLabel(dueAt, now, timeZone)} · ${relativeLabel(dueAt, now)}`
}

/**
 * C1 · what the bar shows before ↵: "→ Client A · today 17:00 · in 5h48". The same shared parse
 * and the same display clock produce the payload, so preview equals saved (R11).
 */
export function previewCapture(input: string, now: Date, timeZone: string): Preview {
  const capture = parseCapture(input, now, timeZone)
  if (capture.title === '') return { kind: 'empty' }
  if (capture.title.length > CAPTURE_LIMITS.titleMax) return { kind: 'tooLong' }
  const when =
    capture.dueAt === null ? messages.capture.noReminder : describeDue(capture.dueAt, now, timeZone)
  const tags = capture.tags.map((tag) => tag.name).join(', ')
  return {
    kind: 'ok',
    text: messages.capture.preview([...(tags === '' ? [] : [tags]), when].join(' · ')),
    capture,
  }
}
