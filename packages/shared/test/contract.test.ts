/**
 * docs/CONTRACT.md — every matrix row, asserted with an injected clock.
 * Rows that need HTTP or rendering (C9 search, C10, C11) are todos here and
 * are asserted in the API and web test suites.
 */
import { describe, expect, it } from 'vitest'
import {
  buildDayPage,
  filterByTag,
  formatDuration,
  isMissed,
  isNotificationDue,
  isOverdue,
  markDone,
  markNotified,
  parseCapture,
  relativeTo,
  reschedule,
  snoozeOneHour,
  snoozeTomorrow,
  todayWindow,
  undoDone,
  type ScheduledReminder,
} from '../src'
import { at, BEFORE_CAPTURE, byId, N1, replace, TZ, type FixtureNote } from './fixtures/jorge-week'

const ids = (notes: { id: string }[]) => notes.map((n) => n.id)
const afterCapture: FixtureNote[] = [N1, ...BEFORE_CAPTURE]
const n1Done = replace(afterCapture, { ...N1, ...markDone(N1, at('2026-10-06 17:00')) })

describe('C1 · Tue 6 11:12 — mid-call capture', () => {
  const now = at('2026-10-06 11:12')

  it('before: 14 notes, 2 on the page, header 2, 12 others', () => {
    const page = buildDayPage(BEFORE_CAPTURE, now, TZ)
    expect(BEFORE_CAPTURE).toHaveLength(14)
    expect(ids(page.rail)).toEqual(['N2', 'N3'])
    expect(page.openCount).toBe(2)
    expect(page.otherCount).toBe(12)
  })

  it('parses the command bar (R11) with a preview of "in 5h48" (R6)', () => {
    const parsed = parseCapture(
      'Notify Ana: move repo permissions from me to Luis #client-a 17:00',
      now,
      TZ,
    )
    expect(parsed).toEqual({
      title: 'Notify Ana: move repo permissions from me to Luis',
      tags: [{ slug: 'client-a', name: 'Client A' }],
      dueAt: at('2026-10-06 17:00'),
    })
    expect(parsed.dueAt?.toISOString()).toBe('2026-10-06T23:00:00.000Z')
    expect(relativeTo(parsed.dueAt as Date, now)).toEqual({ kind: 'in', duration: '5h48' })
  })

  it('after: 15 notes, 3 on the page, header 3, 12 others', () => {
    const page = buildDayPage(afterCapture, now, TZ)
    expect(afterCapture).toHaveLength(15)
    expect(ids(page.rail)).toEqual(['N1', 'N2', 'N3'])
    expect(page.openCount).toBe(3)
    expect(page.anyDoneToday).toBe(false)
    expect(page.otherCount).toBe(12)
  })
})

describe('C2 · Tue 6 17:00 — scheduler tick (R10)', () => {
  it('fires once per due_at value', () => {
    const now = at('2026-10-06 17:00')
    expect(isNotificationDue(N1, at('2026-10-06 16:59'))).toBe(false)
    expect(isNotificationDue(N1, now)).toBe(true)
    const notified = markNotified(N1 as ScheduledReminder)
    expect(isNotificationDue(notified, now)).toBe(false)
    expect(isNotificationDue(notified, at('2026-10-06 17:30'))).toBe(false)
  })
})

describe('C3 · Tue 6 17:00 — done from the notification (R9)', () => {
  it('header "2 left today", N1 struck on the rail, page 3, 12 others', () => {
    const page = buildDayPage(n1Done, at('2026-10-06 17:00'), TZ)
    expect(page.openCount).toBe(2)
    expect(page.anyDoneToday).toBe(true)
    expect(ids(page.rail)).toEqual(['N1', 'N2', 'N3'])
    expect(page.rail[0]?.doneAt).toEqual(at('2026-10-06 17:00'))
    expect(page.otherCount).toBe(12)
  })

  it('undo reopens it', () => {
    const reopened = undoDone(byId(n1Done, 'N1'))
    expect(reopened.doneAt).toBeNull()
    expect(reopened.dueAt).toEqual(at('2026-10-06 17:00'))
  })
})

describe('C4 · Wed 7 09:05 — morning view', () => {
  const now = at('2026-10-07 09:05')
  const page = buildDayPage(n1Done, now, TZ)

  it('carries N2 and N3 from Tue 6, late 15h05 and 14h35', () => {
    expect(page.carried).toHaveLength(1)
    expect(page.carried[0]?.day).toEqual(at('2026-10-06 00:00'))
    expect(ids(page.carried[0]?.items ?? [])).toEqual(['N2', 'N3'])
    expect(relativeTo(byId(n1Done, 'N2').dueAt as Date, now)).toEqual({
      kind: 'late',
      duration: '15h05',
    })
    expect(relativeTo(byId(n1Done, 'N3').dueAt as Date, now)).toEqual({
      kind: 'late',
      duration: '14h35',
    })
  })

  it('rail N4 "in 25 min" and N5; header 4; 11 others; N1 gone', () => {
    expect(ids(page.rail)).toEqual(['N4', 'N5'])
    expect(relativeTo(byId(n1Done, 'N4').dueAt as Date, now)).toEqual({
      kind: 'in',
      duration: '25 min',
    })
    expect(page.openCount).toBe(4)
    expect(page.otherCount).toBe(11)
    expect([...ids(page.rail), ...page.carried.flatMap((g) => ids(g.items))]).not.toContain('N1')
  })
})

describe('C5 · Wed 7 09:05 — snooze N2 +1 h (R7)', () => {
  const now = at('2026-10-07 09:05')
  const snoozed = snoozeOneHour(byId(n1Done, 'N2'), now)
  const notes = replace(n1Done, { ...byId(n1Done, 'N2'), ...snoozed })

  it('moves due_at to 10:05 and keeps the original Tue 18:00, 1×', () => {
    expect(snoozed.dueAt).toEqual(at('2026-10-07 10:05'))
    expect(snoozed.originalDueAt).toEqual(at('2026-10-06 18:00'))
    expect(snoozed.snoozeCount).toBe(1)
    expect(snoozed.doneAt).toBeNull()
  })

  it('carried 1, rail 3 open, header 4, 11 others', () => {
    const page = buildDayPage(notes, now, TZ)
    expect(ids(page.carried.flatMap((g) => g.items))).toEqual(['N3'])
    expect(ids(page.rail)).toEqual(['N4', 'N2', 'N5'])
    expect(page.openCount).toBe(4)
    expect(page.otherCount).toBe(11)
  })

  it('re-arms the notification for 10:05', () => {
    expect(isNotificationDue(snoozed, at('2026-10-07 10:04'))).toBe(false)
    expect(isNotificationDue(snoozed, at('2026-10-07 10:05'))).toBe(true)
  })

  it('truncates to the minute', () => {
    const r = snoozeOneHour(byId(n1Done, 'N2'), new Date(at('2026-10-07 09:05').getTime() + 59_000))
    expect(r.dueAt).toEqual(at('2026-10-07 10:05'))
  })
})

describe('C6 · Wed 7 09:05 — snooze N2 to tomorrow 9:00 (R7)', () => {
  it('due Thu 8 09:00; page 3; header 3; 12 others', () => {
    const now = at('2026-10-07 09:05')
    const snoozed = snoozeTomorrow(byId(n1Done, 'N2'), now, TZ)
    expect(snoozed.dueAt).toEqual(at('2026-10-08 09:00'))
    expect(snoozed.snoozeCount).toBe(1)
    const page = buildDayPage(replace(n1Done, { ...byId(n1Done, 'N2'), ...snoozed }), now, TZ)
    expect(ids(page.carried.flatMap((g) => g.items))).toEqual(['N3'])
    expect(ids(page.rail)).toEqual(['N4', 'N5'])
    expect(page.openCount).toBe(3)
    expect(page.otherCount).toBe(12)
  })

  it('rejects snoozing a done reminder', () => {
    expect(() => snoozeOneHour(byId(n1Done, 'N1'), at('2026-10-06 17:00'))).toThrow()
  })
})

describe('C7 · Wed 7 09:31 — due without notification permission (R2)', () => {
  it('N4 is still on the page and reads "late 1 min"', () => {
    const now = at('2026-10-07 09:31')
    const n4 = byId(n1Done, 'N4')
    expect(isOverdue(n4, now)).toBe(true)
    expect(relativeTo(n4.dueAt as Date, now)).toEqual({ kind: 'late', duration: '1 min' })
    expect(ids(buildDayPage(n1Done, now, TZ).rail)).toContain('N4')
  })
})

describe('C8 · Thu 8 14:30 — #client-b filter (R12)', () => {
  it('5 notes, 1 with a reminder "in 30 min", 10 hidden', () => {
    const now = at('2026-10-08 14:30')
    const { matching, hiddenCount } = filterByTag(n1Done, 'client-b')
    expect(ids(matching)).toEqual(['N6', 'N7', 'N8', 'N9', 'N10'])
    expect(matching.filter((n) => n.dueAt !== null)).toHaveLength(1)
    expect(hiddenCount).toBe(10)
    expect(relativeTo(byId(n1Done, 'N6').dueAt as Date, now)).toEqual({
      kind: 'in',
      duration: '30 min',
    })
    expect(ids(buildDayPage(matching, now, TZ).rail)).toEqual(['N6'])
  })
})

describe('C9–C11 · asserted outside the shared domain', () => {
  it.todo('C9 · search "staging" returns N2 and N8 (API + Postgres full text)')
  it.todo('C10 · raw HTML in a body renders as text (web, markdown renderer)')
  it.todo("C11 · another user's note returns 404 (API)")
})

describe('C12 · Thu 8 09:05 — missed (R17, v2)', () => {
  it('N3 is missed 38h35 after its original due time, even if snoozed', () => {
    const now = at('2026-10-08 09:05')
    const n3 = byId(n1Done, 'N3')
    expect(isMissed(n3, now)).toBe(true)
    expect(formatDuration(now.getTime() - (n3.originalDueAt as Date).getTime())).toBe('38h35')
    const snoozed = snoozeOneHour(n3, at('2026-10-07 09:05'))
    expect(isMissed(snoozed, now)).toBe(true)
    expect(isMissed(n3, at('2026-10-07 18:29'))).toBe(false)
  })
})

describe('DST · America/New_York', () => {
  const NY = 'America/New_York'

  it('D1 · Sun 8 Mar 2026 is 23 h long: [05:00Z, 04:00Z)', () => {
    const w = todayWindow(new Date('2026-03-08T12:00:00Z'), NY)
    expect(w.start.toISOString()).toBe('2026-03-08T05:00:00.000Z')
    expect(w.end.toISOString()).toBe('2026-03-09T04:00:00.000Z')
  })

  it('D2 · Sun 1 Nov 2026 is 25 h long', () => {
    const w = todayWindow(new Date('2026-11-01T12:00:00Z'), NY)
    expect((w.end.getTime() - w.start.getTime()) / 3_600_000).toBe(25)
  })

  it('D3 · "+1 h" at 01:30 EST lands at 03:30 EDT (07:30Z)', () => {
    const r = reschedule(
      { dueAt: null, originalDueAt: null, snoozeCount: 0, doneAt: null, notifiedDueAt: null },
      new Date('2026-03-08T05:00:00Z'),
    )
    expect(snoozeOneHour(r, new Date('2026-03-08T06:30:00Z')).dueAt.toISOString()).toBe(
      '2026-03-08T07:30:00.000Z',
    )
  })

  it('D4 · "Tomorrow 9:00" from Sat 22:00 EST is Sun 09:00 EDT = 13:00Z', () => {
    const r = reschedule(
      { dueAt: null, originalDueAt: null, snoozeCount: 0, doneAt: null, notifiedDueAt: null },
      new Date('2026-03-08T05:00:00Z'),
    )
    expect(snoozeTomorrow(r, new Date('2026-03-08T03:00:00Z'), NY).dueAt.toISOString()).toBe(
      '2026-03-08T13:00:00.000Z',
    )
  })
})
