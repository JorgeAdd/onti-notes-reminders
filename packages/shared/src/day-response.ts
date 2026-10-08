import { buildDayPage, type PageNote } from './domain/day-page'
import { otherNotes } from './domain/other-notes'
import type { OtherItem, TodayItem, TodayResponse } from './today'

/** A note as the day page needs it (the stored `NoteRecord` shape, no body). */
export type DayNote = PageNote & Pick<TodayItem, 'title' | 'tags'>

export interface TagSummary {
  slug: string
  name: string
}

/** Every distinct tag of `notes`, sorted by slug (the tag bar's candidates). */
export function summarizeTags(notes: Pick<TodayItem, 'tags'>[]): TagSummary[] {
  const bySlug = new Map<string, TagSummary>()
  for (const note of notes) {
    for (const tag of note.tags) {
      if (!bySlug.has(tag.slug)) bySlug.set(tag.slug, { slug: tag.slug, name: tag.name })
    }
  }
  return [...bySlug.values()].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
}

export interface DayResponseInput {
  /** Already filtered by `tag` when there is one. */
  notes: DayNote[]
  now: Date
  timezone: string
  /** Viewed local calendar date; defaults to today's. */
  date?: string
  tag: string | null
  /** R12 · notes the filter hid (0 when unfiltered). */
  hiddenCount: number
  tags: TagSummary[]
}

function toItem(note: DayNote): TodayItem {
  if (note.dueAt === null || note.originalDueAt === null) {
    throw new Error('A note on the day page must have a reminder')
  }
  return {
    id: note.id,
    title: note.title,
    tags: note.tags,
    dueAt: note.dueAt,
    originalDueAt: note.originalDueAt,
    snoozeCount: note.snoozeCount,
    doneAt: note.doneAt,
  }
}

const toOtherItem = (note: DayNote): OtherItem => ({
  id: note.id,
  title: note.title,
  tags: note.tags,
  dueAt: note.dueAt,
  originalDueAt: note.originalDueAt,
  snoozeCount: note.snoozeCount,
  doneAt: note.doneAt,
})

/**
 * R1, R3-R5, R12, R18 · the whole `/today` response, shared by the API use case and the optimistic
 * patch so the parts both know cannot drift. Unfiltered: `otherCount` is R5. Filtered: `others`
 * lists the matches not on the page and `otherCount` is their count.
 */
export function buildDayResponse(input: DayResponseInput): TodayResponse {
  const { notes, now, timezone, tag, hiddenCount, tags } = input
  const page = buildDayPage(notes, now, timezone, input.date)
  const others = tag === null ? [] : otherNotes(notes, page).map(toOtherItem)
  return {
    now,
    timezone,
    date: page.date,
    isToday: page.isToday,
    tag,
    tags,
    hiddenCount,
    others,
    window: page.window,
    openCount: page.openCount,
    anyDoneToday: page.anyDoneToday,
    otherCount: tag === null ? page.otherCount : others.length,
    carried: page.carried.map((group) => ({ day: group.day, items: group.items.map(toItem) })),
    rail: page.rail.map(toItem),
  }
}
