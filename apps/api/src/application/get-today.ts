import { buildDayPage, todayWindow, type TodayItem, type TodayResponse } from '@onti/shared'
import type { Identity } from '../domain/identity'
import type { NoteRecord } from '../domain/note'
import type { Clock, NoteRepository, ProfileRepository } from './ports'
import { resolveTimezone } from './timezone'

export interface GetTodayDeps {
  clock: Clock
  notes: NoteRepository
  profiles: ProfileRepository
}

/** Page items always carry a due time; this narrows it and drops the fields the wire excludes. */
function toItem(note: NoteRecord): TodayItem {
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

export function makeGetToday({ clock, notes, profiles }: GetTodayDeps) {
  return async function getToday(identity: Identity): Promise<TodayResponse> {
    const now = clock.now()
    const [profile, own] = await Promise.all([profiles.findOwn(identity), notes.listOwn(identity)])
    const timezone = resolveTimezone(profile)
    const page = buildDayPage(own, now, timezone)
    return {
      now,
      timezone,
      window: todayWindow(now, timezone),
      openCount: page.openCount,
      anyDoneToday: page.anyDoneToday,
      otherCount: page.otherCount,
      carried: page.carried.map((group) => ({ day: group.day, items: group.items.map(toItem) })),
      rail: page.rail.map(toItem),
    }
  }
}

export type GetToday = ReturnType<typeof makeGetToday>
