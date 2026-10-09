import type { NoteDetailResponse, NoteUpdateRequest } from '@onti/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError, UnauthorizedError } from '../../lib/api'
import { messages } from '../../messages'
import { DAY_KEYS } from '../today/day-view'
import { noteKey, NOTES_KEYS } from './query-keys'

/** The server calls the note view makes (src/lib/api.ts binds them to the session token). */
export interface NoteApi {
  save: (id: string, patch: NoteUpdateRequest) => Promise<NoteDetailResponse>
}

interface Options {
  api: NoteApi
  id: string
  /** The API answered 401: the app ends the session. */
  onSessionExpired: () => void
  /** The write succeeded and the caches are fresh: leave edit mode. */
  onSaved: () => void
}

/**
 * Saves a note edit (Decision 20). No optimistic patch: a write happens away from Today, so on
 * success the detail is replaced by the answer, All notes refetches, and Today is dropped when
 * unmounted and refetched when mounted, so its first display is always fresh (counts agree).
 * `retry: 0`: the user decides whether to try again; a failure keeps the form as typed.
 */
export function useNoteActions({ api, id, onSessionExpired, onSaved }: Options) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)

  const save = useMutation<NoteDetailResponse, Error, NoteUpdateRequest>({
    mutationKey: ['note-write'],
    scope: { id: 'note-write' },
    retry: 0,
    mutationFn: (patch) => api.save(id, patch),
    onMutate: () => setMessage(null),
    onSuccess: (response) => {
      queryClient.setQueryData(noteKey(id), response)
      void queryClient.invalidateQueries({ queryKey: NOTES_KEYS })
      queryClient.removeQueries({ queryKey: DAY_KEYS, type: 'inactive' })
      void queryClient.invalidateQueries({ queryKey: DAY_KEYS })
      onSaved()
    },
    onError: (error) => {
      if (error instanceof UnauthorizedError) onSessionExpired()
      // Gone elsewhere: reload the note, which answers 404 and shows the calm not-found state.
      else if (error instanceof ApiError && error.status === 404) {
        void queryClient.invalidateQueries({ queryKey: noteKey(id) })
      } else setMessage(messages.note.edit.saveFailed)
    },
  })

  return {
    save: (patch: NoteUpdateRequest) => save.mutate(patch),
    saving: save.isPending,
    message,
    dismissMessage: () => setMessage(null),
  }
}
