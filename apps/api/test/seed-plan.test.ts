import { at, TZ } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import { buildScenario } from '../scripts/demo-scenario'
import {
  formatReport,
  parseArgs,
  pickSingleUser,
  planRemove,
  planSeed,
  type ExistingState,
} from '../scripts/seed-plan'

const USER = '11111111-1111-4111-8111-111111111111'
const WED = at('2026-10-07 09:05')
const THU = at('2026-10-08 09:05')
const scenario = buildScenario(USER, WED, TZ)

const stored = (s = scenario): ExistingState => ({
  notes: s.notes.map((n) => ({
    id: n.id,
    title: n.title,
    dueAt: n.dueAt,
    doneAt: n.doneAt,
    snoozeCount: 0,
    tagSlugs: n.tagSlugs,
    body: n.body,
  })),
  tags: s.tags.map((t) => ({ id: t.id, slug: t.slug })),
})
const EMPTY: ExistingState = { notes: [], tags: [] }

describe('planSeed', () => {
  it('first run creates 15 notes and 4 tags, changes nothing else', () => {
    const plan = planSeed(EMPTY, scenario)
    expect(plan.notes.created).toHaveLength(15)
    expect(plan.notes.updated).toHaveLength(0)
    expect(plan.notes.unchanged).toHaveLength(0)
    expect(plan.tags.created).toHaveLength(4)
  })

  it('a snoozed seeded note is restored on a same-day re-run', () => {
    const existing = stored()
    const snoozed = existing.notes[1]
    if (!snoozed) throw new Error('fixture has notes')
    snoozed.snoozeCount = 1
    const plan = planSeed(existing, scenario)
    expect(plan.notes.updated.map((n) => n.id)).toEqual([snoozed.id])
    expect(plan.notes.unchanged).toHaveLength(14)
  })

  it('same-day repeat creates 0 and leaves all 15 unchanged', () => {
    const plan = planSeed(stored(), scenario)
    expect(plan.notes.created).toHaveLength(0)
    expect(plan.notes.updated).toHaveLength(0)
    expect(plan.notes.unchanged).toHaveLength(15)
    expect(plan.tags.created).toHaveLength(0)
    expect(plan.tags.unchanged).toHaveLength(4)
  })

  it('a user seeded before bodies existed is updated once (N1, N8), then unchanged', () => {
    const before = stored()
    for (const note of before.notes) note.body = ''
    const first = planSeed(before, scenario)
    expect(first.notes.updated.map((n) => n.key)).toEqual(['N1', 'N8'])
    expect(first.notes.unchanged).toHaveLength(13)
    expect(first.notes.created).toHaveLength(0)

    const applied = planSeed(stored(), scenario)
    expect(applied.notes.updated).toHaveLength(0)
    expect(applied.notes.unchanged).toHaveLength(15)
  })

  it('a later day re-anchors only the dated notes (6 updated, 9 unchanged)', () => {
    const plan = planSeed(stored(), buildScenario(USER, THU, TZ))
    expect(plan.notes.created).toHaveLength(0)
    expect(plan.notes.updated.map((n) => n.key)).toEqual(['N1', 'N2', 'N3', 'N4', 'N5', 'N6'])
    expect(plan.notes.unchanged).toHaveLength(9)
  })

  it('reuses the user own tag with the same slug and never touches other rows', () => {
    const existing: ExistingState = {
      notes: [
        {
          id: 'real-note',
          title: 'Mine',
          dueAt: null,
          doneAt: null,
          snoozeCount: 0,
          tagSlugs: ['client-a'],
          body: '',
        },
      ],
      tags: [{ id: 'real-tag', slug: 'client-a' }],
    }
    const plan = planSeed(existing, scenario)
    expect(plan.tags.created.map((t) => t.slug).sort()).toEqual([
      'client-b',
      'client-c',
      'personal',
    ])
    expect(plan.tags.unchanged).toEqual([{ id: 'real-tag', slug: 'client-a', name: 'Client A' }])
    expect(plan.tagIdBySlug['client-a']).toBe('real-tag')
    expect(plan.notes.created.map((n) => n.id).sort()).toEqual(
      scenario.notes.map((n) => n.id).sort(),
    )
    const planned = [...plan.notes.created, ...plan.notes.updated, ...plan.notes.unchanged]
    expect(planned.map((n) => n.id)).not.toContain('real-note')
  })
})

describe('planRemove', () => {
  it('selects exactly the seeded ids that exist, and seeded tags only', () => {
    const existing = stored()
    existing.notes.push({
      id: 'real-note',
      title: 'Mine',
      dueAt: null,
      doneAt: null,
      snoozeCount: 0,
      tagSlugs: [],
      body: '',
    })
    existing.tags.push({ id: 'real-tag', slug: 'other' })
    const plan = planRemove(existing, scenario)
    expect(plan.noteIds.sort()).toEqual(scenario.notes.map((n) => n.id).sort())
    expect(plan.tagIds.sort()).toEqual(scenario.tags.map((t) => t.id).sort())
  })

  it('selects nothing when the account was never seeded', () => {
    expect(planRemove(EMPTY, scenario)).toEqual({ noteIds: [], tagIds: [] })
  })
})

describe('pickSingleUser', () => {
  it('accepts exactly one user', () => {
    expect(pickSingleUser([{ id: USER }])).toEqual({ ok: true, userId: USER })
  })
  it.each([[[]], [[{ id: 'a' }, { id: 'b' }]]])('refuses %j', (rows) => {
    const result = pickSingleUser(rows)
    expect(result.ok).toBe(false)
  })
})

describe('parseArgs', () => {
  it('defaults to a dry run', () => {
    expect(parseArgs(['--email', 'a@b.dev'])).toEqual({
      ok: true,
      args: { email: 'a@b.dev', yes: false, remove: false },
    })
  })
  it('accepts --user-id, --yes, --remove and --timezone', () => {
    const result = parseArgs(['--user-id', USER, '--yes', '--remove', '--timezone', TZ])
    expect(result).toEqual({
      ok: true,
      args: { userId: USER, yes: true, remove: true, timezone: TZ },
    })
  })
  it('refuses no target with a usage message', () => {
    const result = parseArgs([])
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain('Usage:')
  })
  it('refuses two targets, and an unknown timezone', () => {
    expect(parseArgs(['--email', 'a@b.dev', '--user-id', USER]).ok).toBe(false)
    expect(parseArgs(['--email', 'a@b.dev', '--timezone', 'Mars/Base']).ok).toBe(false)
  })
})

describe('formatReport', () => {
  it('prints counts, anchor date, timezone and target', () => {
    const text = formatReport(planSeed(EMPTY, scenario), {
      target: 'jorge@example.dev',
      timezone: TZ,
      anchor: WED,
      applied: false,
    })
    expect(text).toContain('DRY RUN')
    expect(text).toContain('jorge@example.dev')
    expect(text).toContain(TZ)
    expect(text).toContain('2026-10-07')
    expect(text).toContain('notes: 15 created, 0 updated, 0 unchanged')
    expect(text).toContain('tags: 4 created, 0 unchanged')
  })
  it('reports a repeat run as applied with 0 created', () => {
    const text = formatReport(planSeed(stored(), scenario), {
      target: 'x',
      timezone: TZ,
      anchor: WED,
      applied: true,
    })
    expect(text).not.toContain('DRY RUN')
    expect(text).toContain('notes: 0 created, 0 updated, 15 unchanged')
  })
})
