import type { NotesListResponse } from '@onti/shared'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { UnauthorizedError } from '../../lib/api'
import { skewOf } from '../../lib/clock'
import { useKeyboardLayer } from '../today/use-keyboard-layer'
import { useNow } from '../today/use-now'
import { NoteList } from './NoteList'
import { NotesPage } from './NotesPage'
import { NotesStatus } from './NotesStatus'
import type { NotesHint } from './SearchStatusline'
import { useDebouncedValue } from './use-debounced-value'

/** Decision 10: how long typing must pause before a request is sent. */
export const SEARCH_DEBOUNCE_MS = 200

interface Props {
  /** GET /notes bound to the session token; an empty term lists everything. */
  load: (term: string) => Promise<NotesListResponse>
  /** The API answered 401: the app ends the session. */
  onSessionExpired: () => void
  onBack: () => void
  onSignOut: () => void
}

/** The last answer that arrived, with the term it belongs to and when it arrived. */
interface Shown {
  data: NotesListResponse
  term: string
  receivedAt: number
}

/**
 * Owns the data flow of All notes (Decision 10): the typed term, the debounced term that keys the
 * query (so a late answer for an older term never replaces the current one) and the last good
 * list, which stays on screen while the next one loads or fails.
 */
export function NotesContainer({ load, onSessionExpired, onBack, onSignOut }: Props) {
  const [text, setText] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const term = useDebouncedValue(text.trim(), SEARCH_DEBOUNCE_MS)
  const query = useQuery({ queryKey: ['notes', term], queryFn: () => load(term) })
  const [shown, setShown] = useState<Shown | null>(null)
  // Adjust state while rendering (as use-now does): the list outlives a loading or failed term.
  if (query.data && query.data !== shown?.data) {
    setShown({ data: query.data, term, receivedAt: query.dataUpdatedAt })
  }
  const now = useNow(shown ? skewOf(shown.data.now, shown.receivedAt) : 0)

  // `esc` leaves from anywhere (Q6), but not while an IME composes; `/` outside the input comes
  // back to it. Typing is never intercepted, and no other key does anything here (rows are read-only).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing && !event.defaultPrevented) onBack()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onBack])
  useKeyboardLayer(true, (key) => (key === '/' ? (inputRef.current?.focus(), true) : false))

  const expired = query.error instanceof UnauthorizedError
  useEffect(() => {
    if (expired) onSessionExpired()
  }, [expired, onSessionExpired])

  if (shown === null) {
    if (expired) return null
    return (
      <NotesStatus
        kind={query.isError ? 'error' : 'loading'}
        onRetry={() => void query.refetch()}
        framed
      />
    )
  }

  const { data } = shown
  const results = query.isError ? (
    <NotesStatus kind="error" onRetry={() => void query.refetch()} />
  ) : data.notes.length > 0 ? (
    <NoteList notes={data.notes} now={now} timezone={data.timezone} />
  ) : data.total === 0 ? (
    <NotesStatus kind="empty" />
  ) : (
    <NotesStatus kind="noMatch" term={shown.term} />
  )
  const hints: NotesHint[] = inputFocused ? ['back'] : ['search', 'back']
  return (
    <NotesPage
      now={now}
      timezone={data.timezone}
      inputRef={inputRef}
      term={text}
      onTermChange={setText}
      onInputFocusChange={setInputFocused}
      onBack={onBack}
      onSignOut={onSignOut}
      results={results}
      shown={{ term: shown.term, count: data.notes.length, total: data.total }}
      hints={hints}
    />
  )
}
