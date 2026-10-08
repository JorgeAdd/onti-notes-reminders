import { undoDone } from '@onti/shared'
import type { Identity } from '../domain/identity'
import type { NoteRecord } from '../domain/note'
import { NotFoundError } from './errors'
import type { NoteRepository } from './ports'

/** R9 · reopens a done note; on an open note or one without a reminder it is a no-op. */
export function makeUndoDone({ notes }: { notes: NoteRepository }) {
  return async function undoNoteDone(identity: Identity, id: string): Promise<NoteRecord> {
    const note = await notes.mutateReminder(identity, id, (reminder) =>
      reminder.doneAt === null ? reminder : undoDone(reminder),
    )
    if (note === null) throw new NotFoundError('Note not found')
    return note
  }
}

export type UndoDone = ReturnType<typeof makeUndoDone>
