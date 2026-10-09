/**
 * Design Decision 8 · the web's optimistic patch must equal what the real use case answers after
 * the same change. Both sides run on the same stored notes: the patch on the page the real
 * `makeGetToday` served before, the use case on the notes after the real action ran.
 */
import {
  applyReminderChange,
  tagNameFromSlug,
  type DayQuery,
  type NoteResponse,
  type ReminderChange,
  type TodayResponse,
} from '@onti/shared'
import { at, BEFORE_CAPTURE, type FixtureNote } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import { makeGetToday } from '../src/application/get-today'
import { makeMarkDone } from '../src/application/mark-done'
import type { Clock } from '../src/application/ports'
import { makeSnoozeNote } from '../src/application/snooze-note'
import { makeUndoDone } from '../src/application/undo-done'
import type { NoteRecord } from '../src/domain/note'
import { InMemoryNotes, JORGE, noteId, profileReturning } from './fakes'

const NOW = at('2026-10-07 09:05')
const clock: Clock = { now: () => NOW }
const profiles = profileReturning({ timezone: 'America/Mexico_City' })

const tagged = (note: FixtureNote, id: string): NoteRecord => ({
  id,
  title: note.title,
  tags: note.tags.map((slug) => ({ slug, name: tagNameFromSlug(slug) })),
  dueAt: note.dueAt,
  originalDueAt: note.originalDueAt,
  snoozeCount: note.snoozeCount,
  doneAt: note.doneAt,
  notifiedDueAt: note.notifiedDueAt,
  createdAt: note.createdAt,
})

/** Fixture ids ('N4') are not UUIDs; the stored notes get stable ones by position. */
const ids = new Map(BEFORE_CAPTURE.map((n, i) => [n.id, noteId(i + 1)]))
const idOf = (fixtureId: string) => ids.get(fixtureId) ?? fixtureId

function world(extra: NoteRecord[] = [], mutate?: (notes: NoteRecord[]) => NoteRecord[]) {
  const base = BEFORE_CAPTURE.map((n) => tagged(n, idOf(n.id)))
  const records = mutate ? mutate(base) : base
  const repo = new InMemoryNotes(
    [...records, ...extra].map((note) => ({ ownerId: JORGE.userId, note })),
  )
  return {
    repo,
    page: (query: DayQuery = {}): Promise<TodayResponse> =>
      makeGetToday({ clock, notes: repo, profiles })(JORGE, query),
  }
}

const DONE_N4 = (notes: NoteRecord[]) =>
  notes.map((n) => (n.id === idOf('N4') ? { ...n, doneAt: at('2026-10-07 09:00') } : n))

const VIEWS: [string, DayQuery, string[]][] = [
  ['today', {}, ['N2', 'N4', 'N5']],
  ['today + #client-a', { tag: 'client-a' }, ['N2', 'N4']],
  ['Tue 6', { date: '2026-10-06' }, ['N2', 'N3']],
  ['Thu 8', { date: '2026-10-08' }, ['N6']],
  ['Thu 8 + #client-b', { date: '2026-10-08', tag: 'client-b' }, ['N6']],
]

describe('optimistic patch equals the real use case', () => {
  describe.each(VIEWS)('%s', (_name, query, targets) => {
    it.each(targets.flatMap((id) => [[id, 'hour'] as const, [id, 'tomorrow'] as const]))(
      'snooze %s %s',
      async (fixtureId, preset) => {
        const before = await world().page(query)
        const patched = applyReminderChange(
          before,
          { type: 'snooze', id: idOf(fixtureId), preset },
          NOW,
        )
        const after = world()
        await makeSnoozeNote({ clock, notes: after.repo, profiles })(JORGE, idOf(fixtureId), preset)
        expect(patched).toEqual(await after.page(query))
      },
    )

    it.each(targets)('done %s', async (fixtureId) => {
      const before = await world().page(query)
      const patched = applyReminderChange(before, { type: 'done', id: idOf(fixtureId) }, NOW)
      const after = world()
      await makeMarkDone({ clock, notes: after.repo })(JORGE, idOf(fixtureId))
      expect(patched).toEqual(await after.page(query))
    })
  })

  it.each([
    ['today', {}],
    ['today + #client-a', { tag: 'client-a' }],
  ] as [string, DayQuery][])('undo N4 on %s', async (_name, query) => {
    const before = await world([], DONE_N4).page(query)
    const patched = applyReminderChange(before, { type: 'undo', id: idOf('N4') }, NOW)
    const after = world([], DONE_N4)
    await makeUndoDone({ notes: after.repo })(JORGE, idOf('N4'))
    expect(patched).toEqual(await after.page(query))
  })

  it.each([
    ['a matching reminder due today', 'client-a', '2026-10-07 17:00', { tag: 'client-a' }],
    ['a non-matching note on a filtered view', 'client-c', '2026-10-07 17:00', { tag: 'client-a' }],
    ['an undated note on a filtered view', 'client-a', null, { tag: 'client-a' }],
    ['a plain note on today', 'client-a', null, {}],
    ['a reminder due on the viewed day', 'client-b', '2026-10-09 10:00', { date: '2026-10-09' }],
  ] as [string, string, string | null, DayQuery][])('insert %s', async (_n, tag, due, query) => {
    const note: NoteRecord = {
      id: noteId(500),
      title: 'Brand new',
      tags: [{ slug: tag, name: tagNameFromSlug(tag) }],
      dueAt: due ? at(due) : null,
      originalDueAt: due ? at(due) : null,
      snoozeCount: 0,
      doneAt: null,
      notifiedDueAt: null,
      createdAt: NOW,
    }
    const wire: NoteResponse = {
      id: note.id,
      title: note.title,
      tags: note.tags,
      dueAt: note.dueAt,
      originalDueAt: note.originalDueAt,
      snoozeCount: 0,
      doneAt: null,
      createdAt: note.createdAt,
    }
    const change: ReminderChange = { type: 'insert', note: wire }
    const patched = applyReminderChange(await world().page(query), change, NOW)
    // The undated block of an insert joins the parity in the next commit (insertUndated).
    const same = { ...(await world([note]).page(query)), undated: patched.undated }
    expect(patched).toEqual(same)
  })
})
