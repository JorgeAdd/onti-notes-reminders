/** R1, R3-R5, R12, R18 · buildDayResponse: the one assembly the API and the optimistic patch share. */
import { describe, expect, it } from 'vitest'
import {
  buildDayResponse,
  filterByTag,
  markDone,
  NO_UNDATED,
  summarizeTags,
  tagNameFromSlug,
  todayResponseSchema,
  todayWindow,
  type TodayItem,
  type TodayResponse,
} from '../src'
import { at, BEFORE_CAPTURE, N1, replace, TZ, type FixtureNote } from './fixtures/jorge-week'

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const ALL: FixtureNote[] = replace([N1, ...BEFORE_CAPTURE], {
  ...N1,
  ...markDone(N1, at('2026-10-06 17:00')),
})
// Wire ids are UUIDs; keep fixture order stable.
const withUuid = ALL.map((n, i) => ({
  ...n,
  id: uuid(i + 1),
  tags: n.tags.map((slug) => ({ slug, name: tagNameFromSlug(slug) })),
}))
const titleOf = (items: { title: string }[]) => items.map((i) => i.title)
const NOW = at('2026-10-08 14:30') // Thu 8

describe('buildDayResponse · unfiltered', () => {
  const tags = summarizeTags(withUuid)

  it('today: the slice 1-2 page, with the new fields at their neutral values', () => {
    const response = buildDayResponse({
      undated: NO_UNDATED,
      notes: withUuid,
      now: at('2026-10-07 09:05'),
      timezone: TZ,
      tag: null,
      hiddenCount: 0,
      tags,
    })
    expect(response.date).toBe('2026-10-07')
    expect(response.isToday).toBe(true)
    expect(response.tag).toBeNull()
    expect(response.hiddenCount).toBe(0)
    expect(response.others).toEqual([])
    expect(response.openCount).toBe(4)
    expect(response.otherCount).toBe(11)
    expect(response.window).toEqual(todayWindow(at('2026-10-07 09:05'), TZ))
    expect(response.carried).toHaveLength(1)
    expect(response.timezone).toBe(TZ)
    expect(response.now).toEqual(at('2026-10-07 09:05'))
  })

  it('tags lists every tag once, sorted by slug, with display names', () => {
    expect(tags).toEqual([
      { slug: 'client-a', name: 'Client A' },
      { slug: 'client-b', name: 'Client B' },
      { slug: 'client-c', name: 'Client C' },
      { slug: 'personal', name: 'Personal' },
    ])
  })

  it('another day: window is the viewed day, no carried, other count is total minus rail (R18, R5)', () => {
    const response = buildDayResponse({
      undated: NO_UNDATED,
      notes: withUuid,
      now: NOW,
      timezone: TZ,
      date: '2026-10-07',
      tag: null,
      hiddenCount: 0,
      tags,
    })
    expect(response.isToday).toBe(false)
    expect(response.date).toBe('2026-10-07')
    expect(response.window).toEqual({ start: at('2026-10-07 00:00'), end: at('2026-10-08 00:00') })
    expect(response.carried).toEqual([])
    expect(titleOf(response.rail)).toHaveLength(2)
    expect(response.openCount).toBe(2)
    expect(response.otherCount).toBe(13)
  })

  it('todayWindow(now).end stays the rollover instant, independent of the viewed day', () => {
    const response = buildDayResponse({
      undated: NO_UNDATED,
      notes: withUuid,
      now: NOW,
      timezone: TZ,
      date: '2026-10-06',
      tag: null,
      hiddenCount: 0,
      tags,
    })
    expect(response.window.end).toEqual(at('2026-10-07 00:00'))
    expect(todayWindow(NOW, TZ).end).toEqual(at('2026-10-09 00:00'))
  })

  it('the response round-trips the wire schema', () => {
    const response = buildDayResponse({
      undated: NO_UNDATED,
      notes: withUuid,
      now: NOW,
      timezone: TZ,
      tag: null,
      hiddenCount: 0,
      tags,
    })
    const wire = JSON.parse(JSON.stringify(response)) as unknown
    expect(todayResponseSchema.parse(wire)).toEqual(response)
  })
})

describe('buildDayResponse · C8 filtered (Thu 8 14:30, #client-b)', () => {
  const { matching, hiddenCount } = filterByTag(withUuid, 'client-b')
  const build = (date?: string): TodayResponse =>
    buildDayResponse({
      undated: NO_UNDATED,
      notes: matching,
      now: NOW,
      timezone: TZ,
      ...(date ? { date } : {}),
      tag: 'client-b',
      hiddenCount,
      tags: summarizeTags(withUuid),
    })

  it('rail 1, others 4, hidden 10, other count 4, tag echoed', () => {
    const response = build()
    expect(titleOf(response.rail)).toEqual(['Prep demo of search filters for the review'])
    expect(response.others).toHaveLength(4)
    expect(response.hiddenCount).toBe(10)
    expect(response.otherCount).toBe(4)
    expect(response.tag).toBe('client-b')
    expect(response.isToday).toBe(true)
  })

  it('others are undated rows with null dates, ordered by title', () => {
    const response = build()
    expect(titleOf(response.others)).toEqual([
      'API keys rotate every 90 days',
      'Diego prefers async updates on Slack',
      'Review agenda: search, exports, roles',
      'Staging URL and test accounts',
    ])
    for (const row of response.others) {
      expect(row.dueAt).toBeNull()
      expect(row.originalDueAt).toBeNull()
    }
  })

  it('tags stay the whole account list while filtered (so the bar can cycle)', () => {
    expect(build().tags.map((t) => t.slug)).toEqual([
      'client-a',
      'client-b',
      'client-c',
      'personal',
    ])
  })

  it('another day: the dated match moves into others with its date', () => {
    const response = build('2026-10-07')
    expect(response.rail).toEqual([])
    expect(response.others).toHaveLength(5)
    expect(response.others[0]?.title).toBe('Prep demo of search filters for the review')
    expect(response.others[0]?.dueAt).toEqual(at('2026-10-08 15:00'))
    expect(response.otherCount).toBe(5)
  })

  it('carried items are filtered too (client-a on Wed 7 09:05 carries one)', () => {
    const a = filterByTag(withUuid, 'client-a')
    const response = buildDayResponse({
      undated: NO_UNDATED,
      notes: a.matching,
      now: at('2026-10-07 09:05'),
      timezone: TZ,
      tag: 'client-a',
      hiddenCount: a.hiddenCount,
      tags: summarizeTags(withUuid),
    })
    expect(response.carried).toHaveLength(1)
    expect(titleOf(response.carried[0]?.items ?? [])).toEqual([
      'Reply to Marta about the staging deploy window',
    ])
    expect(response.hiddenCount).toBe(a.hiddenCount)
  })

  it('an empty filtered page: zero notes, everything hidden', () => {
    const response = buildDayResponse({
      undated: NO_UNDATED,
      notes: [],
      now: NOW,
      timezone: TZ,
      tag: 'client-b',
      hiddenCount: 15,
      tags: summarizeTags(withUuid),
    })
    expect(response.rail).toEqual([])
    expect(response.others).toEqual([])
    expect(response.otherCount).toBe(0)
    expect(response.hiddenCount).toBe(15)
  })
})

describe('summarizeTags', () => {
  it('dedupes by slug and sorts', () => {
    const item = (slug: string): Pick<TodayItem, 'tags'> => ({ tags: [{ slug, name: slug }] })
    expect(summarizeTags([item('b'), item('a'), item('b')])).toEqual([
      { slug: 'a', name: 'a' },
      { slug: 'b', name: 'b' },
    ])
    expect(summarizeTags([])).toEqual([])
  })
})
