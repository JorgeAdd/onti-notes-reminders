import type { Identity } from '../domain/identity'
import { NotFoundError } from './errors'
import type { NoteRepository } from './ports'

/** R20, R15 · permanent delete of the caller's note. Another user's and an unknown id are alike. */
export function makeDeleteNote({ notes }: { notes: NoteRepository }) {
  return async function deleteNote(identity: Identity, id: string): Promise<void> {
    if (!(await notes.deleteOwn(identity, id))) throw new NotFoundError('Note not found')
  }
}

export type DeleteNote = ReturnType<typeof makeDeleteNote>
