import { describe, expect, it } from 'vitest'
import { at, BEFORE_CAPTURE, byId, TZ } from '@onti/shared/fixtures/jorge-week'
import type { TodayItem } from '@onti/shared'
import { buildRail, type RailRow } from '../src/features/today/rail-model'

function item(id: string, dueAt: Date, doneAt: Date | null = null): TodayItem {
  return { id, title: id, tags: [], dueAt, originalDueAt: dueAt, snoozeCount: 0, doneAt }
}

const shape = (rows: RailRow[]) =>
  rows.map((row) => {
    switch (row.kind) {
      case 'hour':
        return `${row.empty ? 'empty' : 'hour'}:${row.hour}`
      case 'gap':
        return `gap:${row.from}-${row.to}`
      case 'item':
        return `item:${row.item.id}`
      case 'now':
        return 'now'
    }
  })

describe('buildRail', () => {
  it('is empty when there are no timed items', () => {
    expect(buildRail([], at('2026-10-07 09:05'), TZ)).toEqual({ compact: false, rows: [] })
  })

  it('places NOW before the next item and collapses empty hours (C4 rail, board 03/05)', () => {
    const n4 = byId(BEFORE_CAPTURE, 'N4')
    const n5 = byId(BEFORE_CAPTURE, 'N5')
    const { compact, rows } = buildRail(
      [item('N4', n4.dueAt!), item('N5', n5.dueAt!)],
      at('2026-10-07 09:05'),
      TZ,
    )
    expect(compact).toBe(false)
    expect(shape(rows)).toEqual([
      'hour:9',
      'now',
      'item:N4',
      'gap:10-15',
      'empty:10',
      'empty:11',
      'empty:12',
      'empty:13',
      'empty:14',
      'empty:15',
      'hour:16',
      'item:N5',
    ])
  })

  it('puts NOW after items already late today and in its own hour when nothing is due then', () => {
    const rows = buildRail(
      [item('a', at('2026-10-07 08:00')), item('b', at('2026-10-07 11:00'))],
      at('2026-10-07 09:31'),
      TZ,
    ).rows
    expect(shape(rows)).toEqual([
      'hour:8',
      'item:a',
      'hour:9',
      'now',
      'gap:10-10',
      'empty:10',
      'hour:11',
      'item:b',
    ])
  })

  it('keeps done items on the rail, in order', () => {
    const rows = buildRail(
      [item('d', at('2026-10-07 09:00'), at('2026-10-07 09:02'))],
      at('2026-10-07 09:05'),
      TZ,
    ).rows
    expect(shape(rows)).toEqual(['hour:9', 'item:d', 'now'])
  })

  it('goes compact above 6 timed items: items and NOW only, no hour or gap rows (SG7)', () => {
    const items = ['09:00', '09:10', '09:20', '09:30', '09:40', '09:50', '10:00'].map((t) =>
      item(`i${t}`, at(`2026-10-07 ${t}`)),
    )
    const { compact, rows } = buildRail(items, at('2026-10-07 09:35'), TZ)
    expect(compact).toBe(true)
    expect(shape(rows)).toEqual([
      'item:i09:00',
      'item:i09:10',
      'item:i09:20',
      'item:i09:30',
      'now',
      'item:i09:40',
      'item:i09:50',
      'item:i10:00',
    ])
  })

  it('stays per-hour at exactly 6 timed items', () => {
    const items = [9, 10, 11, 12, 13, 14].map((h) => item(`h${h}`, at(`2026-10-07 ${h}:00`)))
    expect(buildRail(items, at('2026-10-07 09:05'), TZ).compact).toBe(false)
  })

  it('sorts by instant even if the server order differs', () => {
    const rows = buildRail(
      [item('late', at('2026-10-07 10:00')), item('early', at('2026-10-07 09:30'))],
      at('2026-10-07 09:05'),
      TZ,
    ).rows
    expect(shape(rows).filter((r) => r.startsWith('item'))).toEqual(['item:early', 'item:late'])
  })

  describe('DST days enumerate local hour numbers (design risk, cosmetic)', () => {
    const NY = 'America/New_York'

    it('spring forward: shows the skipped hour as empty, order stays by instant', () => {
      // 2026-03-08: 01:59 EST -> 03:00 EDT.
      const a = item('a', new Date('2026-03-08T06:30:00Z')) // 01:30 EST
      const b = item('b', new Date('2026-03-08T07:30:00Z')) // 03:30 EDT
      const rows = buildRail([a, b], new Date('2026-03-08T06:45:00Z'), NY).rows
      expect(shape(rows)).toEqual([
        'hour:1',
        'item:a',
        'now',
        'gap:2-2',
        'empty:2',
        'hour:3',
        'item:b',
      ])
    })

    it('fall back: the repeated hour holds both items, earlier instant first', () => {
      // 2026-11-01: 01:30 EDT happens, then 01:30 EST an hour later.
      const edt = item('edt', new Date('2026-11-01T05:30:00Z'))
      const est = item('est', new Date('2026-11-01T06:30:00Z'))
      const rows = buildRail([est, edt], new Date('2026-11-01T05:45:00Z'), NY).rows
      expect(shape(rows)).toEqual(['hour:1', 'item:edt', 'now', 'item:est'])
    })
  })
})
