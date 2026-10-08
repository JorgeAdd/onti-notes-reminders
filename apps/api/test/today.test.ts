import {
  tagNameFromSlug,
  todayResponseSchema,
  type DayQuery,
  type TodayResponse,
} from '@onti/shared'
import {
  at,
  BEFORE_CAPTURE,
  byId,
  N1,
  replace,
  type FixtureNote,
} from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { makeGetToday } from '../src/application/get-today'
import { ValidationError } from '../src/application/errors'
import type { Clock, Profile } from '../src/application/ports'
import type { NoteRecord } from '../src/domain/note'
import type { Identity } from '../src/domain/identity'
import { InMemoryNotes, profileReturning } from './fakes'

const IDENTITY: Identity = { userId: 'jorge', email: null, claims: {} }
const UUID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function toRecord(note: FixtureNote, index: number): NoteRecord {
  return {
    id: UUID(index),
    title: note.title,
    tags: note.tags.map((slug) => ({ slug, name: tagNameFromSlug(slug) })),
    dueAt: note.dueAt,
    originalDueAt: note.originalDueAt,
    snoozeCount: note.snoozeCount,
    doneAt: note.doneAt,
    notifiedDueAt: note.notifiedDueAt,
  }
}

function today(
  notes: FixtureNote[],
  nowLocal: string,
  profile: Profile | null = { timezone: 'America/Mexico_City' },
  query?: DayQuery,
) {
  const clock: Clock = { now: () => at(nowLocal) }
  const repo = new InMemoryNotes(
    notes.map((note, index) => ({ ownerId: IDENTITY.userId, note: toRecord(note, index) })),
  )
  const profiles = profileReturning(profile)
  return makeGetToday({ clock, notes: repo, profiles })(IDENTITY, query)
}

const titles = (items: { title: string }[]) => items.map((i) => i.title)
const afterCapture: FixtureNote[] = [N1, ...BEFORE_CAPTURE]
const n1Done = replace(afterCapture, { ...N1, doneAt: at('2026-10-06 17:00') })

describe('getToday', () => {
  it('C1 · Tue 6 11:12: header 3, 12 other, nothing carried', async () => {
    const page = await today(afterCapture, '2026-10-06 11:12')
    expect(page.openCount).toBe(3)
    expect(page.otherCount).toBe(12)
    expect(page.carried).toEqual([])
    expect(titles(page.rail)).toEqual([
      N1.title,
      byId(afterCapture, 'N2').title,
      byId(afterCapture, 'N3').title,
    ])
  })

  it('C3 · Tue 6 17:00: N1 struck on the rail, still 3 on the page, "2 left"', async () => {
    const page = await today(n1Done, '2026-10-06 17:00')
    expect(page.openCount).toBe(2)
    expect(page.anyDoneToday).toBe(true)
    expect(page.rail).toHaveLength(3)
    expect(page.rail[0]?.doneAt).toEqual(at('2026-10-06 17:00'))
    expect(page.otherCount).toBe(12)
  })

  it('C4 · Wed 7 09:05: Tue 6 carried x2, rail x2, header 4, 11 other, N1 absent', async () => {
    const page = await today(n1Done, '2026-10-07 09:05')
    expect(page.carried).toHaveLength(1)
    expect(page.carried[0]?.day).toEqual(at('2026-10-06 00:00'))
    expect(titles(page.carried[0]?.items ?? [])).toEqual([
      byId(n1Done, 'N2').title,
      byId(n1Done, 'N3').title,
    ])
    expect(titles(page.rail)).toEqual([byId(n1Done, 'N4').title, byId(n1Done, 'N5').title])
    expect(page.openCount).toBe(4)
    expect(page.otherCount).toBe(11)
    expect([...titles(page.rail), ...titles(page.carried[0]?.items ?? [])]).not.toContain(N1.title)
    expect(page.now).toEqual(at('2026-10-07 09:05'))
    expect(page.timezone).toBe('America/Mexico_City')
    expect(page.window).toEqual({ start: at('2026-10-07 00:00'), end: at('2026-10-08 00:00') })
  })

  it('C7 · Wed 7 09:31: the overdue N4 is still on the page, open', async () => {
    const page = await today(n1Done, '2026-10-07 09:31')
    const n4 = page.rail.find((i) => i.title === byId(n1Done, 'N4').title)
    expect(n4?.doneAt).toBeNull()
    expect(page.openCount).toBe(4)
  })

  it('maps tags with name and slug, and never exposes body or notifiedDueAt', async () => {
    const page = await today(n1Done, '2026-10-07 09:05')
    const n4 = page.rail[0]
    expect(n4?.tags).toEqual([{ slug: 'client-a', name: 'Client A' }])
    expect(n4).not.toHaveProperty('body')
    expect(n4).not.toHaveProperty('notifiedDueAt')
  })

  it('falls back to the UTC day when the profile is missing', async () => {
    const page = await today(n1Done, '2026-10-07 09:05', null)
    expect(page.timezone).toBe('UTC')
    expect(page.window).toEqual({
      start: new Date('2026-10-07T00:00:00.000Z'),
      end: new Date('2026-10-08T00:00:00.000Z'),
    })
  })

  it('D2 · the 25 h fall-back day has a 25 h window in the profile timezone', async () => {
    const clock: Clock = { now: () => new Date('2026-11-01T12:00:00.000Z') }
    const page = await makeGetToday({
      clock,
      notes: new InMemoryNotes(),
      profiles: profileReturning({ timezone: 'America/New_York' }),
    })(IDENTITY)
    expect(page.window.end.getTime() - page.window.start.getTime()).toBe(25 * 3_600_000)
  })

  it('D1 · the 23 h spring-forward day has a 23 h window', async () => {
    const clock: Clock = { now: () => new Date('2026-03-08T18:00:00.000Z') }
    const page = await makeGetToday({
      clock,
      notes: new InMemoryNotes(),
      profiles: profileReturning({ timezone: 'America/New_York' }),
    })(IDENTITY)
    expect(page.window.end.getTime() - page.window.start.getTime()).toBe(23 * 3_600_000)
  })

  it('produces output the wire schema accepts after encoding', async () => {
    const page: TodayResponse = await today(n1Done, '2026-10-07 09:05')
    const wire = z.encode(todayResponseSchema, page)
    expect(todayResponseSchema.parse(wire)).toEqual(page)
  })
})

describe('getToday · viewed day', () => {
  const week = [...BEFORE_CAPTURE]
  const view = (date: string, nowLocal = '2026-10-08 14:30') =>
    today(week, nowLocal, undefined, { date })

  it('a past day shows only what was due that day, no carried, no NOW (R18)', async () => {
    const page = await view('2026-10-06')
    expect(page.isToday).toBe(false)
    expect(page.date).toBe('2026-10-06')
    expect(page.carried).toEqual([])
    expect(titles(page.rail)).toEqual([byId(week, 'N2').title, byId(week, 'N3').title])
    expect(page.window).toEqual({ start: at('2026-10-06 00:00'), end: at('2026-10-07 00:00') })
  })

  it('a future day lists its reminders and counts the rest as other', async () => {
    const page = await view('2026-10-09')
    expect(page.rail).toEqual([])
    expect(page.openCount).toBe(0)
    expect(page.otherCount).toBe(week.length)
  })

  it("today's own date is the same page as no query", async () => {
    expect(await view('2026-10-08')).toEqual(await today(week, '2026-10-08 14:30'))
  })

  it('uses the profile timezone for the day window (NY DST dates)', async () => {
    const ny = { timezone: 'America/New_York' }
    const fall = await today([], '2026-10-30 12:00', ny, { date: '2026-11-01' })
    expect(fall.window.end.getTime() - fall.window.start.getTime()).toBe(25 * 3_600_000)
    const spring = await today([], '2026-03-01 12:00', ny, { date: '2026-03-08' })
    expect(spring.window.end.getTime() - spring.window.start.getTime()).toBe(23 * 3_600_000)
  })
})

describe('getToday · tag filter (C8, Thu 8 14:30, #client-b)', () => {
  const filtered = () => today(afterCapture, '2026-10-08 14:30', undefined, { tag: 'client-b' })

  it('C8 · rail 1, others 4, hidden 10, other count 4', async () => {
    const page = await filtered()
    expect(titles(page.rail)).toEqual([byId(BEFORE_CAPTURE, 'N6').title])
    expect(page.others).toHaveLength(4)
    expect(page.hiddenCount).toBe(10)
    expect(page.otherCount).toBe(4)
    expect(page.tag).toBe('client-b')
    expect(page.tags.map((t) => t.slug)).toEqual(['client-a', 'client-b', 'client-c', 'personal'])
  })

  it('date and tag combine: Fri 9 filtered has an empty rail and the same others', async () => {
    const page = await today(afterCapture, '2026-10-08 14:30', undefined, {
      date: '2026-10-09',
      tag: 'client-b',
    })
    expect(page.rail).toEqual([])
    expect(page.date).toBe('2026-10-09')
    expect(page.others.map((o) => o.title)).toContain(byId(BEFORE_CAPTURE, 'N6').title)
    expect(page.hiddenCount).toBe(10)
  })

  it('an unknown tag is a validation error', async () => {
    await expect(
      today(BEFORE_CAPTURE, '2026-10-08 14:30', undefined, { tag: 'nope' }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('a tag only another user has is a validation error (R15)', async () => {
    const clock: Clock = { now: () => at('2026-10-08 14:30') }
    const repo = new InMemoryNotes([
      { ownerId: 'ana', note: toRecord(byId(BEFORE_CAPTURE, 'N6'), 1) },
      { ownerId: IDENTITY.userId, note: toRecord(byId(BEFORE_CAPTURE, 'N4'), 2) },
    ])
    const getToday = makeGetToday({ clock, notes: repo, profiles: profileReturning(null) })
    await expect(getToday(IDENTITY, { tag: 'client-b' })).rejects.toBeInstanceOf(ValidationError)
    expect((await getToday(IDENTITY, { tag: 'client-a' })).tag).toBe('client-a')
  })

  it('a tag with no notes at all is a validation error', async () => {
    await expect(today([], '2026-10-08 14:30', undefined, { tag: 'client-b' })).rejects.toThrow(
      ValidationError,
    )
  })
})
