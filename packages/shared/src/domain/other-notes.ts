import type { DayPage } from './day-page'

export interface OtherNoteCandidate {
  id: string
  title: string
  dueAt: Date | null
}

/**
 * R12 · "Other notes with #tag": the matching notes that are not on the page
 * (undated, due on other days, done on earlier days). Dated notes first by
 * `dueAt`, undated last; ties by title, then id (deterministic).
 */
export function otherNotes<T extends OtherNoteCandidate>(
  matching: T[],
  page: Pick<DayPage<T>, 'carried' | 'rail'>,
): T[] {
  const onPage = new Set(
    [...page.rail, ...page.carried.flatMap((group) => group.items)].map((n) => n.id),
  )
  return matching
    .filter((note) => !onPage.has(note.id))
    .sort((a, b) => {
      if (a.dueAt && b.dueAt && a.dueAt.getTime() !== b.dueAt.getTime())
        return a.dueAt.getTime() - b.dueAt.getTime()
      if (a.dueAt && !b.dueAt) return -1
      if (!a.dueAt && b.dueAt) return 1
      return a.title.localeCompare(b.title) || a.id.localeCompare(b.id)
    })
}
