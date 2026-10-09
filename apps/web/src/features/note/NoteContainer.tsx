import type { NoteDetailResponse } from '@onti/shared'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { ApiError, UnauthorizedError } from '../../lib/api'
import { skewOf } from '../../lib/clock'
import { useKeyboardLayer } from '../today/use-keyboard-layer'
import { useNow } from '../today/use-now'
import { NotePage } from './NotePage'
import { NoteStatus } from './NoteStatus'
import { noteKey } from './query-keys'

interface Props {
  id: string
  /** GET /notes/:id bound to the session token. */
  load: (id: string) => Promise<NoteDetailResponse>
  /** Back to the list as it was left (`esc` and the Back button). */
  onClose: () => void
  /** The API answered 401: the app ends the session. */
  onSessionExpired: () => void
  onSignOut: () => void
}

/**
 * Owns the read-only note view (Decision 12): fetch by id, the loading, 404, error and 401
 * states, and `esc`. No other key does anything here (PR1: the statusline hints `esc` only).
 */
export function NoteContainer({ id, load, onClose, onSessionExpired, onSignOut }: Props) {
  const query = useQuery({ queryKey: noteKey(id), queryFn: () => load(id) })
  const now = useNow(query.data ? skewOf(query.data.now, query.dataUpdatedAt) : 0)
  useKeyboardLayer(true, (key) => (key === 'Escape' ? (onClose(), true) : false))

  const expired = query.error instanceof UnauthorizedError
  useEffect(() => {
    if (expired) onSessionExpired()
  }, [expired, onSessionExpired])

  if (query.data === undefined) {
    if (expired) return null
    if (query.isError) {
      const gone = query.error instanceof ApiError && query.error.status === 404
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
    <NotePage now={now} timezone={timezone} note={note} onBack={onClose} onSignOut={onSignOut} />
  )
}
