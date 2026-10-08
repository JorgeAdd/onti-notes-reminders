import { hasReminder, markDone } from '@onti/shared'
import type { Identity } from '../domain/identity'
import type { NoteRecord } from '../domain/note'
import { ConflictError, NotFoundError } from './errors'
import type { Clock, NoteRepository } from './ports'

export interface MarkDoneDeps {
  clock: Clock
  notes: NoteRepository
}

/** R9 · done is stamped with the server clock; done on a done note keeps the first `done_at`. */
export function makeMarkDone({ clock, notes }: MarkDoneDeps) {
  return async function markNoteDone(identity: Identity, id: string): Promise<NoteRecord> {
    const now = clock.now()
    const note = await notes.mutateReminder(identity, id, (reminder) => {
      if (!hasReminder(reminder)) throw new ConflictError('no_reminder')
      // Already done: hand back the same object so nothing is written.
      return reminder.doneAt === null ? markDone(reminder, now) : reminder
    })
    if (note === null) throw new NotFoundError('Note not found')
    return note
  }
}

export type MarkDone = ReturnType<typeof makeMarkDone>
