import { hasReminder, isOpen, snoozeOneHour, snoozeTomorrow, type SnoozePreset } from '@onti/shared'
import type { Identity } from '../domain/identity'
import type { NoteRecord } from '../domain/note'
import { ConflictError, NotFoundError } from './errors'
import type { Clock, NoteRepository, ProfileRepository } from './ports'
import { resolveTimezone } from './timezone'

export interface SnoozeNoteDeps {
  clock: Clock
  notes: NoteRepository
  profiles: ProfileRepository
}

/** R7 · the server stamps the time: clock + profile timezone, never a client value. */
export function makeSnoozeNote({ clock, notes, profiles }: SnoozeNoteDeps) {
  return async function snoozeNote(
    identity: Identity,
    id: string,
    preset: SnoozePreset,
  ): Promise<NoteRecord> {
    const now = clock.now()
    // `decide` must stay synchronous (it runs under the row lock), so the zone is read first.
    const timeZone =
      preset === 'tomorrow' ? resolveTimezone(await profiles.findOwn(identity)) : 'UTC'

    const note = await notes.mutateReminder(identity, id, (reminder) => {
      // The domain functions throw a plain Error on these states, which would surface as a 500.
      if (!hasReminder(reminder)) throw new ConflictError('no_reminder')
      if (!isOpen(reminder)) throw new ConflictError('not_open')
      return preset === 'hour'
        ? snoozeOneHour(reminder, now)
        : snoozeTomorrow(reminder, now, timeZone)
    })
    if (note === null) throw new NotFoundError('Note not found')
    return note
  }
}

export type SnoozeNote = ReturnType<typeof makeSnoozeNote>
