/** R19 · the "Without a reminder" set: C13 order and count, and the optimistic insert (C14). */
import { describe, expect, it } from 'vitest'
import { insertUndated, NO_UNDATED, selectUndated, UNDATED_ROWS, type UndatedItem } from '../src'
import { at, BEFORE_CAPTURE } from './fixtures/jorge-week'

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const NOW = at('2026-10-07 09:05')

/** Jorge's world at Wed 09:05 (C13): N2-N6 have reminders, N7-N15 have none, all created Thu 1 10:00. */
const world = BEFORE_CAPTURE.map((note, index) => ({
  ...note,
  id: uuid(index + 2),
  tags: note.tags.map((slug) => ({ slug, name: slug })),
}))
const titles = (items: UndatedItem[]) => items.map((i) => i.title)

const plain = (
  n: number,
  title: string,
  createdAt: Date,
  over: { dueAt?: Date | null; doneAt?: Date | null } = {},
) => ({
  id: uuid(n),
  title,
  tags: [],
  createdAt,
  dueAt: null,
  doneAt: null,
  ...over,
})

describe('UNDATED_ROWS', () => {
  it('is 8 (R19)', () => {
    expect(UNDATED_ROWS).toBe(8)
  })
})

describe('selectUndated (R19, C13)', () => {
  it('C13: 9 undated notes, 8 rows ordered by title when created together', () => {
    const undated = selectUndated(world)
    expect(undated.count).toBe(9)
    expect(titles(undated.items)).toEqual([
      '1:1 with manager: topics',
      'API keys rotate every 90 days',
      'Diego prefers async updates on Slack',
      'Domain glossary',
      'PR review checklist',
      'Read: Postgres partial indexes',
      'Review agenda: search, exports, roles',
      'Shortcut cheat sheet for the team',
    ])
    expect(undated.items.map((i) => i.id)).toEqual([15, 7, 10, 12, 11, 14, 9, 13].map(uuid))
  })

  it('carries id, title, tags and createdAt, and nothing else', () => {
    const [first] = selectUndated(world).items
    expect(Object.keys(first!).sort()).toEqual(['createdAt', 'id', 'tags', 'title'])
    expect(first!.createdAt).toEqual(at('2026-10-01 10:00'))
  })

  it('excludes notes with a reminder and done notes', () => {
    const notes = [
      plain(1, 'Open plain', NOW),
      plain(2, 'Dated', NOW, { dueAt: NOW }),
      plain(3, 'Done plain', NOW, { doneAt: NOW }),
      plain(4, 'Dated and done', NOW, { dueAt: NOW, doneAt: NOW }),
    ]
    const undated = selectUndated(notes)
    expect(undated.count).toBe(1)
    expect(titles(undated.items)).toEqual(['Open plain'])
  })

  it('is empty for no notes and for a world with only reminders', () => {
    expect(selectUndated([])).toEqual(NO_UNDATED)
    expect(selectUndated(world.filter((n) => n.dueAt !== null))).toEqual(NO_UNDATED)
  })

  it('orders newest first, so a newer note leads whatever its title', () => {
    const notes = [
      plain(1, 'Alpha', at('2026-10-01 10:00')),
      plain(2, 'Zulu', at('2026-10-07 09:05')),
      plain(3, 'Mike', at('2026-10-03 10:00')),
    ]
    expect(titles(selectUndated(notes).items)).toEqual(['Zulu', 'Mike', 'Alpha'])
  })

  it('breaks a title tie by id ascending', () => {
    const notes = [plain(9, 'Same', NOW), plain(3, 'Same', NOW), plain(5, 'Same', NOW)]
    expect(selectUndated(notes).items.map((i) => i.id)).toEqual([uuid(3), uuid(5), uuid(9)])
  })

  it('compares titles by UTF-16 code unit, not by locale (so server and browser agree)', () => {
    const notes = ['b', 'a', 'B', 'A', 'é', 'z', 'Z'].map((title, i) => plain(i + 1, title, NOW))
    expect(titles(selectUndated(notes).items)).toEqual(['A', 'B', 'Z', 'a', 'b', 'z', 'é'])
  })

  it('keeps the count of all while the items stop at the limit', () => {
    const notes = Array.from({ length: 12 }, (_, i) => plain(i + 1, `Note ${i}`, NOW))
    const undated = selectUndated(notes)
    expect(undated.count).toBe(12)
    expect(undated.items).toHaveLength(8)
  })

  it('does not mutate its input', () => {
    const notes = [plain(2, 'B', NOW), plain(1, 'A', NOW)]
    selectUndated(notes)
    expect(notes.map((n) => n.title)).toEqual(['B', 'A'])
  })
})

describe('insertUndated (C14)', () => {
  const base = selectUndated(world)
  const captured: UndatedItem = {
    id: uuid(500),
    title: 'Export format questions',
    tags: [{ slug: 'client-b', name: 'Client B' }],
    createdAt: NOW,
  }

  it('C14: the new note goes first, the count is 10 and 8 rows stay', () => {
    const next = insertUndated(base, captured)
    expect(next.count).toBe(10)
    expect(next.items).toHaveLength(8)
    expect(next.items[0]).toEqual(captured)
    expect(titles(next.items).slice(1)).toEqual(titles(base.items).slice(0, 7))
  })

  it('equals selecting again from the world that holds the note', () => {
    const next = insertUndated(base, captured)
    const again = selectUndated([...world, { ...captured, dueAt: null, doneAt: null }])
    expect(next).toEqual(again)
  })

  it('grows the list while it has room (count 3 to 4, 4 rows)', () => {
    const three = selectUndated(world.slice(5, 8))
    expect(three.count).toBe(3)
    const next = insertUndated(three, captured)
    expect(next.count).toBe(4)
    expect(next.items).toHaveLength(4)
  })

  it('places an older note by the same order, not on top', () => {
    const older = { ...captured, createdAt: at('2026-09-01 10:00') }
    const next = insertUndated(selectUndated([plain(1, 'Alpha', NOW)]), older)
    expect(titles(next.items)).toEqual(['Alpha', 'Export format questions'])
  })

  it('a note that falls past the limit raises the count only', () => {
    const older = { ...captured, createdAt: at('2026-09-01 10:00') }
    const next = insertUndated(base, older)
    expect(next.count).toBe(10)
    expect(next.items).toEqual(base.items)
  })

  it('replaces a temp row: the id is dropped and the count does not grow', () => {
    const temp: UndatedItem = { ...captured, id: 'temp-1' }
    const pending = insertUndated(base, temp)
    expect(pending.count).toBe(10)
    const settled = insertUndated(pending, captured, 'temp-1')
    expect(settled.count).toBe(10)
    expect(settled.items.map((i) => i.id)).toContain(captured.id)
    expect(settled.items.map((i) => i.id)).not.toContain('temp-1')
  })

  it('replaces a temp row that was cut from the items without lowering the count wrongly', () => {
    const olderTemp: UndatedItem = {
      ...captured,
      id: 'temp-2',
      createdAt: at('2026-09-01 10:00'),
    }
    const pending = insertUndated(base, olderTemp)
    expect(pending.items.map((i) => i.id)).not.toContain('temp-2')
    const settled = insertUndated(pending, { ...olderTemp, id: uuid(501) }, 'temp-2')
    expect(settled.count).toBe(10)
  })

  it('does not mutate its input', () => {
    const before = structuredClone(base)
    insertUndated(base, captured)
    expect(base).toEqual(before)
  })
})
