import type { NoteDetailResponse } from '@onti/shared'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { ApiError, UnauthorizedError } from '../../lib/api'
import { skewOf } from '../../lib/clock'
import { useKeyboardLayer } from '../today/use-keyboard-layer'
import { useNow } from '../today/use-now'
import { NoteEditForm } from './NoteEditForm'
import { NotePage } from './NotePage'
import { NoteStatus } from './NoteStatus'
import type { NoteMode } from './NoteStatusline'
import { noteKey } from './query-keys'
import { useNoteActions, type NoteApi } from './use-note-actions'

interface Props {
  id: string
  /** GET /notes/:id bound to the session token. */
  load: (id: string) => Promise<NoteDetailResponse>
  /** PATCH bound to the session token. */
  api: NoteApi
  /** Open in edit mode once the note has loaded (`e` on a Today row). */
  startInEdit: boolean
  /** Back to the list as it was left (`esc` and the Back button). */
  onClose: () => void
  /** The API answered 401: the app ends the session. */
  onSessionExpired: () => void
  onSignOut: () => void
}

/**
 * Owns the note view (Decisions 12, 20-22): fetch by id, the loading, 404, error and 401 states,
 * the read and edit modes and their keys. `e` edits and `esc` leaves; in edit mode `esc` discards
 * (the form hears it from its own fields; the layer covers the rest of the page).
 */
export function NoteContainer({
  id,
  load,
  api,
  startInEdit,
  onClose,
  onSessionExpired,
  onSignOut,
}: Props) {
  const query = useQuery({ queryKey: noteKey(id), queryFn: () => load(id) })
  const now = useNow(query.data ? skewOf(query.data.now, query.dataUpdatedAt) : 0)
  const [mode, setMode] = useState<NoteMode>(startInEdit ? 'edit' : 'read')
  const actions = useNoteActions({
    api,
    id,
    onSessionExpired,
    onSaved: () => setMode('read'),
    onDeleted: onClose,
    onDeleteFailed: () => setMode('read'),
  })
  useKeyboardLayer(true, (key) => {
    if (mode === 'edit') return key === 'Escape' ? (setMode('read'), true) : false
    if (mode === 'confirmDelete') {
      // `Enter` is consumed even while the DELETE is in flight, so nothing fires twice.
      if (key === 'Enter') return actions.removing ? true : (actions.remove(), true)
      if (key === 'Escape') return actions.removing ? true : (setMode('read'), true)
      return false
    }
    if (key === 'Escape') return (onClose(), true)
    if (key === 'e') return (setMode('edit'), true)
    if (key === 'd') return (setMode('confirmDelete'), true)
    return false
  })

  const expired = query.error instanceof UnauthorizedError
  useEffect(() => {
    if (expired) onSessionExpired()
  }, [expired, onSessionExpired])

  // A 404 wins over stale data: the note was deleted elsewhere (a save answered 404 and reloaded).
  const gone = query.error instanceof ApiError && query.error.status === 404
  if (query.data === undefined || gone) {
    if (expired) return null
    if (query.isError) {
      return (
        <NoteStatus
          kind={gone ? 'notFound' : 'error'}
          onBack={onClose}
          onRetry={() => void query.refetch()}
        />
      )
    }
    return <NoteStatus kind="loading" onBack={onClose} />
  }

  const { note, timezone } = query.data
  return (
    <NotePage
      now={now}
      timezone={timezone}
      note={note}
      mode={mode}
      form={
        <NoteEditForm
          note={note}
          now={now}
          timezone={timezone}
          saving={actions.saving}
          onSave={actions.save}
          onCancel={() => setMode('read')}
        />
      }
      message={actions.message}
      onDismissMessage={actions.dismissMessage}
      onEdit={() => setMode('edit')}
      onDelete={() => setMode('confirmDelete')}
      onConfirmDelete={actions.remove}
      onCancelDelete={() => setMode('read')}
      deleting={actions.removing}
      onBack={onClose}
      onSignOut={onSignOut}
    />
  )
}
