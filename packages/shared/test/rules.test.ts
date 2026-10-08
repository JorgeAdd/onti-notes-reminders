/** Edge cases of the general rules, beyond the scenario rows. */
import { describe, expect, it } from 'vitest'
import {
  formatDuration,
  markDone,
  NO_REMINDER,
  parseCapture,
  relativeTo,
  reschedule,
  snoozeOneHour,
} from '../src'
import { at, TZ } from './fixtures/jorge-week'

const MIN = 60_000

describe('R6 · durations', () => {
  it.each([
    [0, '0 min'],
    [59 * MIN + 59_999, '59 min'],
    [60 * MIN, '1 h'],
    [61 * MIN, '1h01'],
    [348 * MIN, '5h48'],
    [905 * MIN, '15h05'],
    [-905 * MIN, '15h05'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected)
  })
})

describe('R2/R6 · at exactly the due time', () => {
  it('is not late yet (R2 is strict) and reads "in 0 min"', () => {
    const due = at('2026-10-07 09:30')
    expect(relativeTo(due, due)).toEqual({ kind: 'in', duration: '0 min' })
    expect(relativeTo(due, new Date(due.getTime() + 60_000))).toEqual({
      kind: 'late',
      duration: '1 min',
    })
  })
})

describe('R11 · capture parsing', () => {
  const now = at('2026-10-06 11:12')

  it('a time already passed means tomorrow', () => {
    expect(parseCapture('Call Diego 09:00', now, TZ).dueAt).toEqual(at('2026-10-07 09:00'))
  })

  it('accepts "tomorrow HH:MM" and "+Nh"', () => {
    expect(parseCapture('Ping Luis tomorrow 08:30', now, TZ)).toMatchObject({
      title: 'Ping Luis',
      dueAt: at('2026-10-07 08:30'),
    })
    expect(parseCapture('Ping Luis +2h', now, TZ).dueAt).toEqual(at('2026-10-06 13:12'))
  })

  it('accepts "today HH:MM" even when it is already past', () => {
    expect(parseCapture('Retro today 09:00', now, TZ)).toMatchObject({
      title: 'Retro',
      dueAt: at('2026-10-06 09:00'),
    })
    expect(parseCapture('Retro today 17:00', now, TZ).dueAt).toEqual(at('2026-10-06 17:00'))
  })

  it('accepts "+Nm", truncated to the minute', () => {
    expect(parseCapture('Ping Luis +45m', now, TZ).dueAt).toEqual(at('2026-10-06 11:57'))
    expect(parseCapture('Ping Luis +5M', now, TZ).dueAt).toEqual(at('2026-10-06 11:17'))
  })

  it('does not treat "today" without a time as a time expression', () => {
    expect(parseCapture('Plan today', now, TZ)).toMatchObject({ title: 'Plan today', dueAt: null })
  })

  it('keeps a second time expression in the title', () => {
    expect(parseCapture('Move 15:00 call 16:00', now, TZ)).toMatchObject({
      title: 'Move call 16:00',
      dueAt: at('2026-10-06 15:00'),
    })
  })

  it('dedupes tags, lowercases slugs and ignores invalid ones', () => {
    expect(parseCapture('Note #Client-A #client-a #not_valid', now, TZ)).toEqual({
      title: 'Note #not_valid',
      tags: [{ slug: 'client-a', name: 'Client A' }],
      dueAt: null,
    })
  })

  it('returns an empty title when there is only metadata', () => {
    expect(parseCapture('#client-a 17:00', now, TZ).title).toBe('')
  })
})

describe('R8–R9 · lifecycle', () => {
  it('a manual reschedule resets the snooze history', () => {
    const snoozed = snoozeOneHour(
      reschedule(NO_REMINDER, at('2026-10-06 18:00')),
      at('2026-10-07 09:05'),
    )
    const moved = reschedule(snoozed, at('2026-10-09 10:00'))
    expect(moved).toMatchObject({
      dueAt: at('2026-10-09 10:00'),
      originalDueAt: at('2026-10-09 10:00'),
      snoozeCount: 0,
    })
  })

  it('a note without a reminder cannot be done', () => {
    expect(() => markDone(NO_REMINDER, at('2026-10-06 17:00'))).toThrow()
  })

  it('done on an already-done note keeps the first done_at', () => {
    const first = at('2026-10-06 17:00')
    const done = markDone(reschedule(NO_REMINDER, at('2026-10-06 16:00')), first)
    expect(markDone(done, at('2026-10-06 18:30')).doneAt).toEqual(first)
  })

  it('done never touches due_at', () => {
    const open = reschedule(NO_REMINDER, at('2026-10-06 16:00'))
    expect(markDone(open, at('2026-10-06 17:00')).dueAt).toEqual(at('2026-10-06 16:00'))
  })
})
