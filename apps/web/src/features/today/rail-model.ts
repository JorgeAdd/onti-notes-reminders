import type { TodayItem } from '@onti/shared'
import { localHour } from './format'

/** SG7 · more than this many timed items collapses the rail to a compact list. */
export const COMPACT_ABOVE = 6

export type RailRow =
  | { kind: 'hour'; hour: number; empty: boolean }
  | { kind: 'gap'; from: number; to: number }
  | { kind: 'item'; item: TodayItem }
  | { kind: 'now' }

interface Entry {
  hour: number
  row: RailRow
}

export interface RailModel {
  compact: boolean
  rows: RailRow[]
}

/**
 * Pure layout of the day rail. Works from local hour numbers of the items and of `now` only
 * (never enumerates instants), so DST days stay cosmetic: a skipped hour shows as empty, a
 * repeated hour holds both of its items. Empty hours are emitted twice on purpose: one line per
 * hour (desktop, board 03) and one `gap` row per run (mobile, board 05); CSS shows one of them.
 */
export function buildRail(items: TodayItem[], now: Date, timeZone: string): RailModel {
  if (items.length === 0) return { compact: false, rows: [] }
  const sorted = [...items].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
  const nowMs = now.getTime()
  const split = sorted.findIndex((item) => item.dueAt.getTime() >= nowMs)
  const after = split === -1 ? sorted.length : split

  if (sorted.length > COMPACT_ABOVE) {
    return {
      compact: true,
      rows: [
        ...sorted.slice(0, after).map((item): RailRow => ({ kind: 'item', item })),
        { kind: 'now' },
        ...sorted.slice(after).map((item): RailRow => ({ kind: 'item', item })),
      ],
    }
  }

  // Entries in instant order, NOW between the late and the upcoming items.
  const itemEntry = (item: TodayItem): Entry => ({
    hour: localHour(item.dueAt, timeZone),
    row: { kind: 'item', item },
  })
  const entries: Entry[] = [
    ...sorted.slice(0, after).map(itemEntry),
    { hour: localHour(now, timeZone), row: { kind: 'now' } },
    ...sorted.slice(after).map(itemEntry),
  ]

  const hours = entries.map((entry) => entry.hour)
  const first = Math.min(...hours)
  const last = Math.max(...hours)
  const rows: RailRow[] = []
  let emptyRun: number[] = []
  const flushRun = () => {
    if (emptyRun.length === 0) return
    rows.push({ kind: 'gap', from: emptyRun[0]!, to: emptyRun[emptyRun.length - 1]! })
    for (const hour of emptyRun) rows.push({ kind: 'hour', hour, empty: true })
    emptyRun = []
  }
  for (let hour = first; hour <= last; hour++) {
    const here = entries.filter((entry) => entry.hour === hour)
    if (here.length === 0) {
      emptyRun.push(hour)
      continue
    }
    flushRun()
    rows.push({ kind: 'hour', hour, empty: false }, ...here.map((entry) => entry.row))
  }
  return { compact: false, rows }
}
