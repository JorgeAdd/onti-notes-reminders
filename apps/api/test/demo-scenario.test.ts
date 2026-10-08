import { buildDayPage } from '@onti/shared'
import { at, BEFORE_CAPTURE, N1, TZ } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import { buildScenario, seedId } from '../scripts/demo-scenario'

const USER = '11111111-1111-4111-8111-111111111111'
const WED_0905 = at('2026-10-07 09:05')
const FIXTURE = [N1, ...BEFORE_CAPTURE]

const asPageNotes = (scenario: ReturnType<typeof buildScenario>) =>
  scenario.notes.map((n) => ({
    id: n.id,
    dueAt: n.dueAt,
    originalDueAt: n.dueAt,
    snoozeCount: 0,
    doneAt: n.doneAt,
    notifiedDueAt: null,
  }))

describe('seedId', () => {
  it('is a deterministic UUIDv5 per user and key', () => {
    expect(seedId(USER, 'N1')).toBe(seedId(USER, 'N1'))
    expect(seedId(USER, 'N1')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(seedId(USER, 'N1')).not.toBe(seedId(USER, 'N2'))
    expect(seedId(USER, 'N1')).not.toBe(seedId('22222222-2222-4222-8222-222222222222', 'N1'))
  })
})

describe('buildScenario', () => {
  const scenario = buildScenario(USER, WED_0905, TZ)

  it('has the 15 notes with unique ids and 4 tags', () => {
    expect(scenario.notes).toHaveLength(15)
    expect(new Set(scenario.notes.map((n) => n.id)).size).toBe(15)
    expect(scenario.tags.map((t) => t.name).sort()).toEqual([
      'Client A',
      'Client B',
      'Client C',
      'Personal',
    ])
  })

  it('matches the jorge-week fixture offsets when today is Wed 7', () => {
    expect(FIXTURE).toHaveLength(15)
    for (const expected of FIXTURE) {
      const actual = scenario.notes.find((n) => n.key === expected.id)
      expect(actual?.title).toBe(expected.title)
      expect(actual?.tagSlugs).toEqual(expected.tags)
      expect(actual?.dueAt).toEqual(expected.dueAt)
    }
    expect(scenario.notes.find((n) => n.key === 'N1')?.doneAt).toEqual(at('2026-10-06 17:00'))
  })

  it('reproduces C4: 2 carried, 2 due today, N1 done yesterday, 11 others', () => {
    const page = buildDayPage(asPageNotes(scenario), WED_0905, TZ)
    expect(page.carried.flatMap((g) => g.items)).toHaveLength(2)
    expect(page.openCount).toBe(4)
    expect(page.rail).toHaveLength(2)
    expect(page.otherCount).toBe(11)
  })

  it('re-anchors to any other day, in the account timezone', () => {
    const monday = at('2026-01-12 23:30')
    const page = buildDayPage(asPageNotes(buildScenario(USER, monday, TZ)), monday, TZ)
    expect(page.carried.flatMap((g) => g.items)).toHaveLength(2)
    expect(page.rail).toHaveLength(2)
    expect(page.otherCount).toBe(11)
    const n4 = buildScenario(USER, monday, TZ).notes.find((n) => n.key === 'N4')
    expect(n4?.dueAt).toEqual(at('2026-01-12 09:30'))
  })
})
