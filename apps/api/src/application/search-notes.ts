import { SEARCH_LIMITS, type NotesListResponse } from '@onti/shared'
import { excerptOf } from '../domain/excerpt'
import type { Identity } from '../domain/identity'
import { searchTerms } from '../domain/search-terms'
import type { Clock, NoteRepository, ProfileRepository } from './ports'
import { resolveTimezone } from './timezone'

export interface SearchNotesDeps {
  clock: Clock
  notes: NoteRepository
  profiles: ProfileRepository
}

export function makeSearchNotes({ clock, notes, profiles }: SearchNotesDeps) {
  return async function searchNotes(
    identity: Identity,
    q?: string,
    tag?: string,
  ): Promise<NotesListResponse> {
    const now = clock.now()
    const [profile, page] = await Promise.all([
      profiles.findOwn(identity),
      notes.searchOwn(identity, {
        terms: searchTerms(q),
        limit: SEARCH_LIMITS.resultsMax,
        ...(tag === undefined ? {} : { tag }),
      }),
    ])
    return {
      now,
      timezone: resolveTimezone(profile),
      total: page.total,
      notes: page.rows.map(({ bodyHead, ...row }) => ({ ...row, excerpt: excerptOf(bodyHead) })),
    }
  }
}

export type SearchNotes = ReturnType<typeof makeSearchNotes>
