import {
  clearReminder,
  reschedule,
  tagNameFromSlug,
  type NoteDetailResponse,
  type NoteUpdateRequest,
} from '@onti/shared'
import type { Identity } from '../domain/identity'
import { NotFoundError } from './errors'
import { toNoteDetailResponse } from './get-note'
import type { Clock, NotePatch, NoteRepository, ProfileRepository } from './ports'
import { resolveTimezone } from './timezone'

export interface UpdateNoteDeps {
  clock: Clock
  notes: NoteRepository
  profiles: ProfileRepository
}

export function makeUpdateNote({ clock, notes, profiles }: UpdateNoteDeps) {
  /**
   * R20, R8, R11 · edits the caller's note. Omitted fields stay; the client sends tag slugs and
   * the names are derived here. `dueAt` applies R8 (a value reschedules and reopens, `null`
   * clears every reminder field); it is applied even when equal to the current value.
   */
  return async function updateNote(
    identity: Identity,
    id: string,
    request: NoteUpdateRequest,
  ): Promise<NoteDetailResponse> {
    const now = clock.now()
    const { title, body, tags, dueAt } = request
    const patch: NotePatch = {
      ...(title !== undefined && { title }),
      ...(body !== undefined && { body }),
      ...(tags !== undefined && {
        tags: [...new Set(tags)].map((slug) => ({ slug, name: tagNameFromSlug(slug) })),
      }),
      ...(dueAt !== undefined && {
        reminder: dueAt === null ? clearReminder : (reminder) => reschedule(reminder, dueAt),
      }),
    }
    const [profile, updated] = await Promise.all([
      profiles.findOwn(identity),
      notes.updateOwn(identity, id, patch),
    ])
    if (updated === null) throw new NotFoundError('Note not found')
    return toNoteDetailResponse(now, resolveTimezone(profile), updated)
  }
}

export type UpdateNote = ReturnType<typeof makeUpdateNote>
