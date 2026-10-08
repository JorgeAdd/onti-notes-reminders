import { buildDayResponse, summarizeTags, type TodayResponse } from '@onti/shared'
import type { Identity } from '../domain/identity'
import type { Clock, NoteRepository, ProfileRepository } from './ports'
import { resolveTimezone } from './timezone'

export interface GetTodayDeps {
  clock: Clock
  notes: NoteRepository
  profiles: ProfileRepository
}

export function makeGetToday({ clock, notes, profiles }: GetTodayDeps) {
  return async function getToday(identity: Identity): Promise<TodayResponse> {
    const now = clock.now()
    const [profile, own] = await Promise.all([profiles.findOwn(identity), notes.listOwn(identity)])
    return buildDayResponse({
      notes: own,
      now,
      timezone: resolveTimezone(profile),
      tag: null,
      hiddenCount: 0,
      tags: summarizeTags(own),
    })
  }
}

export type GetToday = ReturnType<typeof makeGetToday>
