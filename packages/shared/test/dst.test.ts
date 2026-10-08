/**
 * R16 · DST edges for local-time math (design Decision 18).
 * America/New_York 2026: spring forward Sun 8 Mar 02:00 → 03:00 (EST → EDT);
 * fall back Sun 1 Nov 02:00 → 01:00 (EDT → EST).
 */
import { describe, expect, it } from 'vitest'
import { parseCapture, snoozeTomorrow, type ScheduledReminder } from '../src'
import { localTimeOn } from '../src/domain/time'

const NY = 'America/New_York'
const iso = (d: Date | null) => d?.toISOString()

describe('R16 · gap (spring forward): a nonexistent local time resolves to the first valid instant after it', () => {
  const now = new Date('2026-03-08T12:00:00Z') // Sun 8 Mar 08:00 EDT

  it('localTimeOn 02:30 on the gap day is 03:00 EDT (07:00Z)', () => {
    expect(iso(localTimeOn(now, NY, 0, 2, 30))).toBe('2026-03-08T07:00:00.000Z')
  })

  it('localTimeOn 02:00 and 02:59 on the gap day are also 07:00Z', () => {
    expect(iso(localTimeOn(now, NY, 0, 2, 0))).toBe('2026-03-08T07:00:00.000Z')
    expect(iso(localTimeOn(now, NY, 0, 2, 59))).toBe('2026-03-08T07:00:00.000Z')
  })

  it('times either side of the gap are exact', () => {
    expect(iso(localTimeOn(now, NY, 0, 1, 59))).toBe('2026-03-08T06:59:00.000Z')
    expect(iso(localTimeOn(now, NY, 0, 3, 0))).toBe('2026-03-08T07:00:00.000Z')
    expect(iso(localTimeOn(now, NY, 0, 3, 30))).toBe('2026-03-08T07:30:00.000Z')
  })

  it('capture "today 02:30" on the gap day is 07:00Z', () => {
    expect(iso(parseCapture('Call today 02:30', now, NY).dueAt)).toBe('2026-03-08T07:00:00.000Z')
  })

  it('capture "tomorrow 02:30" from the day before is 07:00Z', () => {
    const eve = new Date('2026-03-07T15:00:00Z') // Sat 7 Mar 10:00 EST
    expect(iso(parseCapture('Call tomorrow 02:30', eve, NY).dueAt)).toBe('2026-03-08T07:00:00.000Z')
  })

  it('capture bare "02:30" on the eve resolves to the gap day, 07:00Z (still ahead)', () => {
    const eve = new Date('2026-03-08T05:00:00Z') // Sun 8 Mar 00:00 EST
    expect(iso(parseCapture('Call 02:30', eve, NY).dueAt)).toBe('2026-03-08T07:00:00.000Z')
  })
})

describe('R16 · overlap (fall back): an ambiguous local time resolves to the FIRST occurrence', () => {
  const now = new Date('2026-11-01T12:00:00Z') // Sun 1 Nov 07:00 EST

  it('localTimeOn 01:30 on 2026-11-01 is 01:30 EDT (05:30Z)', () => {
    expect(iso(localTimeOn(now, NY, 0, 1, 30))).toBe('2026-11-01T05:30:00.000Z')
  })

  it('times either side of the overlap are exact', () => {
    expect(iso(localTimeOn(now, NY, 0, 0, 59))).toBe('2026-11-01T04:59:00.000Z')
    expect(iso(localTimeOn(now, NY, 0, 2, 0))).toBe('2026-11-01T07:00:00.000Z')
  })

  it('capture "today 01:30" on the overlap day is 05:30Z', () => {
    expect(iso(parseCapture('Call today 01:30', now, NY).dueAt)).toBe('2026-11-01T05:30:00.000Z')
  })
})

describe('R7/R16 · Tomorrow 9:00 across both transitions', () => {
  const open = (): ScheduledReminder => ({
    dueAt: new Date('2026-03-07T20:00:00Z'),
    originalDueAt: new Date('2026-03-07T20:00:00Z'),
    snoozeCount: 0,
    doneAt: null,
    notifiedDueAt: null,
  })

  it('spring: Sat 7 Mar 22:00 EST → Sun 8 Mar 09:00 EDT = 13:00Z', () => {
    const now = new Date('2026-03-08T03:00:00Z')
    expect(iso(snoozeTomorrow(open(), now, NY).dueAt)).toBe('2026-03-08T13:00:00.000Z')
  })

  it('fall: Sat 31 Oct 22:00 EDT → Sun 1 Nov 09:00 EST = 14:00Z', () => {
    const now = new Date('2026-11-01T02:00:00Z')
    expect(iso(snoozeTomorrow(open(), now, NY).dueAt)).toBe('2026-11-01T14:00:00.000Z')
  })
})
