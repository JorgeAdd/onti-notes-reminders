import type { NoteDetailResponse } from '@onti/shared'
import type { Identity } from '../domain/identity'
import { NotFoundError } from './errors'
import type { Clock, NoteRepository, ProfileRepository } from './ports'
import { resolveTimezone } from './timezone'

export interface GetNoteDeps {
  clock: Clock
  notes: NoteRepository
  profiles: ProfileRepository
}

export function makeGetNote({ clock, notes, profiles }: GetNoteDeps) {
  /**
   * C11, R15 · one of the caller's notes with its body. Another user's note and an unknown id are
   * the same `NotFoundError`. `now` and `timezone` let the view format due times without a second
   * call.
   */
  return async function getNote(identity: Identity, id: string): Promise<NoteDetailResponse> {
    const now = clock.now()
    const [profile, found] = await Promise.all([
      profiles.findOwn(identity),
      notes.findOwn(identity, id),
    ])
    if (found === null) throw new NotFoundError('Note not found')
    // Named fields: the notification bookkeeping (`notifiedDueAt`) never leaves the API.
    const { title, tags, dueAt, originalDueAt, snoozeCount, doneAt, createdAt, body } = found
    return {
      now,
      timezone: resolveTimezone(profile),
      note: {
        id: found.id,
        title,
        tags,
        dueAt,
        originalDueAt,
        snoozeCount,
        doneAt,
        createdAt,
        body,
      },
    }
  }
}

export type GetNote = ReturnType<typeof makeGetNote>
