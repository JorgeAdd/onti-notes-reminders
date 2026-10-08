import { tagNameFromSlug, type CaptureRequest } from '@onti/shared'
import type { Identity } from '../domain/identity'
import type { NoteRecord } from '../domain/note'
import type { NoteRepository } from './ports'

/**
 * R11 · saves what the preview parsed. The client sends slugs only; names are derived here, so a
 * client can never choose how a tag reads. The title and limits were validated at the HTTP edge.
 */
export function makeCaptureNote({ notes }: { notes: NoteRepository }) {
  return function captureNote(identity: Identity, request: CaptureRequest): Promise<NoteRecord> {
    const slugs = [...new Set(request.tags)]
    return notes.createOwn(identity, {
      title: request.title,
      dueAt: request.dueAt,
      tags: slugs.map((slug) => ({ slug, name: tagNameFromSlug(slug) })),
    })
  }
}

export type CaptureNote = ReturnType<typeof makeCaptureNote>
