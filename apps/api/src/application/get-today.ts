import {
  buildDayResponse,
  filterByTag,
  summarizeTags,
  type DayQuery,
  type TodayResponse,
} from '@onti/shared'
import type { Identity } from '../domain/identity'
import { ValidationError } from './errors'
import type { Clock, NoteRepository, ProfileRepository } from './ports'
import { resolveTimezone } from './timezone'

export interface GetTodayDeps {
  clock: Clock
  notes: NoteRepository
  profiles: ProfileRepository
}

export function makeGetToday({ clock, notes, profiles }: GetTodayDeps) {
  /**
   * R1, R12, R18 · the page of `query.date` (default today) in the profile timezone, optionally
   * narrowed to `query.tag`. A tag is known only when one of the caller's own notes carries it,
   * so a typo, another user's tag and a tag with no notes are all the same 400.
   */
  return async function getToday(identity: Identity, query: DayQuery = {}): Promise<TodayResponse> {
    const now = clock.now()
    const [profile, own] = await Promise.all([profiles.findOwn(identity), notes.listOwn(identity)])
    const tag = query.tag ?? null
    if (tag !== null && !own.some((note) => note.tags.some((t) => t.slug === tag))) {
      throw new ValidationError('Unknown tag')
    }
    const { matching, hiddenCount } =
      tag === null ? { matching: own, hiddenCount: 0 } : filterByTag(own, tag)
    return buildDayResponse({
      notes: matching,
      now,
      timezone: resolveTimezone(profile),
      ...(query.date === undefined ? {} : { date: query.date }),
      tag,
      hiddenCount,
      tags: summarizeTags(own),
    })
  }
}

export type GetToday = ReturnType<typeof makeGetToday>
