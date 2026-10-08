import { buildDayPage } from '@onti/shared'
import { at, BEFORE_CAPTURE, N1, TZ } from '@onti/shared/fixtures/jorge-week'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildScenario, seedId } from '../scripts/demo-scenario'
import { makeSearchNotes } from '../src/application/search-notes'
import { searchTerms } from '../src/domain/search-terms'
import { InMemoryNotes, JORGE, noteRecord, profileReturning } from './fakes'

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

/** The dataset is the source of truth for bodies (CLAUDE.md rule 14). */
const DATASET = readFileSync(
  new URL('../../../docs/product/scenario-dataset.md', import.meta.url),
  'utf8',
)
const FENCE = '```'
const datasetBody = (key: string): string => {
  const opening = `\n${key}:\n\n${FENCE}markdown\n`
  const start = DATASET.indexOf(opening)
  const end = DATASET.indexOf(`\n${FENCE}`, start + opening.length)
  if (start < 0 || end < 0) throw new Error(`No body for ${key} in the dataset`)
  return DATASET.slice(start + opening.length, end)
}

describe('scenario bodies', () => {
  const scenario = buildScenario(USER, WED_0905, TZ)
  const bodyOf = (key: string) => scenario.notes.find((n) => n.key === key)?.body

  it('gives N1 and N8 the dataset bodies verbatim', () => {
    expect(bodyOf('N1')).toBe(datasetBody('N1'))
    expect(bodyOf('N8')).toBe(datasetBody('N8'))
    expect(bodyOf('N1')).toContain('Collaborators')
    expect(bodyOf('N8')).toContain('https://staging.client-b.example')
  })

  it('invents no body for the other 13 notes', () => {
    const others = scenario.notes.filter((n) => n.key !== 'N1' && n.key !== 'N8')
    expect(others).toHaveLength(13)
    expect(others.map((n) => n.body)).toEqual(Array(13).fill(''))
  })

  it('C9 over the seeded scenario: "staging" finds N2 and N8, "collaborators" finds N1', async () => {
    const owned = scenario.notes.map((n, i) => ({
      ownerId: JORGE.userId,
      body: n.body,
      note: noteRecord(i, { id: n.id, title: n.title }),
    }))
    const search = makeSearchNotes({
      clock: { now: () => WED_0905 },
      notes: new InMemoryNotes(owned),
      profiles: profileReturning(null),
    })
    const keyOf = (id: string) => scenario.notes.find((n) => n.id === id)?.key
    const found = async (q: string) => (await search(JORGE, q)).notes.map((n) => keyOf(n.id)).sort()
    expect(await found('staging')).toEqual(['N2', 'N8'])
    expect(await found('collaborators')).toEqual(['N1'])
    expect(searchTerms('staging')).toEqual(['staging'])
  })
})
