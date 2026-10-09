/** R19 · the "Without a reminder" rows shown in the date column, then "+ n more". */
export const UNDATED_ROWS = 8

/** One undated note as the list needs it: no body, no reminder fields (it has none). */
export interface UndatedItem {
  id: string
  title: string
  tags: { name: string; slug: string }[]
  createdAt: Date
}

/** The R19 block of `GET /today`: how many notes are undated, and the leading rows. */
export interface Undated {
  count: number
  items: UndatedItem[]
}

export const NO_UNDATED: Undated = { count: 0, items: [] }

const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/**
 * Newest first by `createdAt`, ties by title, then id. Titles compare by UTF-16 code unit (not
 * `localeCompare`, whose ICU data differs between Node and browsers), so the server and the
 * optimistic page always agree on the order.
 */
function compareUndated(a: UndatedItem, b: UndatedItem): number {
  return (
    b.createdAt.getTime() - a.createdAt.getTime() ||
    compareText(a.title, b.title) ||
    compareText(a.id, b.id)
  )
}

const toItem = ({ id, title, tags, createdAt }: UndatedItem): UndatedItem => ({
  id,
  title,
  tags: tags.map(({ name, slug }) => ({ name, slug })),
  createdAt,
})

/**
 * R19 · the notes with no reminder and not done, as the date column lists them. It depends on the
 * whole account only: the viewed day and any tag filter never change it (callers pass every note).
 */
export function selectUndated(
  notes: (UndatedItem & { dueAt: Date | null; doneAt: Date | null })[],
): Undated {
  const all = notes.filter((note) => note.dueAt === null && note.doneAt === null).map(toItem)
  all.sort(compareUndated)
  return { count: all.length, items: all.slice(0, UNDATED_ROWS) }
}

/**
 * The optimistic capture without a time (C14): `item` joins in the same order and the list keeps
 * its limit. With `replacesId` the server note settles a temp row that was already counted, so the
 * count stays and only the row is swapped.
 */
export function insertUndated(undated: Undated, item: UndatedItem, replacesId?: string): Undated {
  const kept =
    replacesId === undefined ? undated.items : undated.items.filter((row) => row.id !== replacesId)
  const items = [...kept, toItem(item)].sort(compareUndated).slice(0, UNDATED_ROWS)
  return { count: replacesId === undefined ? undated.count + 1 : undated.count, items }
}
