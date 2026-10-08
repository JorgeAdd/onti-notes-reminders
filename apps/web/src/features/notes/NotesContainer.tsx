import { summarizeTags, type NotesListResponse } from '@onti/shared'
import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { UnauthorizedError } from '../../lib/api'
import { skewOf } from '../../lib/clock'
import { useKeyboardLayer } from '../today/use-keyboard-layer'
import { useNarrow } from '../today/use-narrow'
import { useNow } from '../today/use-now'
import { NoteList } from './NoteList'
import { NotesPage } from './NotesPage'
import { NotesStatus } from './NotesStatus'
import type { NotesHint } from './SearchStatusline'
import { useDebouncedValue } from './use-debounced-value'

// Slice 3's tag bar loads on the first `#`, as it does on Today.
const TagBar = lazy(() => import('../today/TagBar').then((m) => ({ default: m.TagBar })))

/** Decision 10: how long typing must pause before a request is sent. */
export const SEARCH_DEBOUNCE_MS = 200

interface Props {
  /** GET /notes bound to the session token; an empty term and no tag list everything. */
  load: (term: string, tag: string | null) => Promise<NotesListResponse>
  /** The API answered 401: the app ends the session. */
  onSessionExpired: () => void
  onBack: () => void
  onSignOut: () => void
}

/** The last answer that arrived, with the term it belongs to and when it arrived. */
interface Shown {
  data: NotesListResponse
  term: string
  tag: string | null
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
  const [tag, setTag] = useState<string | null>(null)
  const [tagBarOpen, setTagBarOpen] = useState(false)
  const mobile = useNarrow()
  const query = useQuery({ queryKey: ['notes', term, tag], queryFn: () => load(term, tag) })
  const [shown, setShown] = useState<Shown | null>(null)
  // Every tag any answer carried (Decision 15): a narrowed list alone would offer no way to switch.
  const [tagsSeen, setTagsSeen] = useState<Record<string, string>>({})
  // Adjust state while rendering (as use-now does): the list outlives a loading or failed term.
  if (query.data && query.data !== shown?.data) {
    setShown({ data: query.data, term, tag, receivedAt: query.dataUpdatedAt })
    const fresh = summarizeTags(query.data.notes).filter((t) => tagsSeen[t.slug] === undefined)
    if (fresh.length > 0) {
      setTagsSeen({ ...tagsSeen, ...Object.fromEntries(fresh.map((t) => [t.slug, t.name])) })
    }
  }
  const barTags = Object.entries({ ...tagsSeen, ...(tag === null ? {} : { [tag]: tag }) })
    .map(([slug, name]) => ({ slug, name: tagsSeen[slug] ?? name }))
    .sort((a, b) => (a.slug < b.slug ? -1 : 1))
  const canTag = barTags.length > 0
  const clearTag = () => {
    setTag(null)
    setTagBarOpen(false)
  }
  const now = useNow(shown ? skewOf(shown.data.now, shown.receivedAt) : 0)

  // `esc` leaves from anywhere (Q6), but not while an IME composes; with a tag active the first
  // `esc` clears it and closes the bar instead (Decision 15). `#` opens the tag bar, even from the
  // input: search ignores punctuation, so no searchable character is lost. `/` outside the input
  // comes back to it. No other key does anything here (rows are read-only).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.defaultPrevented) return
      if (event.key === 'Escape') {
        if (tag !== null) clearTag()
        else onBack()
      } else if (event.key === '#' && canTag && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        setTagBarOpen(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onBack, tag, canTag])
  // Like Today, `/` is off while the tag bar is open.
  useKeyboardLayer(!tagBarOpen, (key) => (key === '/' ? (inputRef.current?.focus(), true) : false))

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
  const exit: NotesHint = tag === null ? 'back' : 'clear'
  const hints: NotesHint[] = [
    ...(inputFocused || tagBarOpen ? [] : (['search'] as const)),
    ...(canTag ? (['tags'] as const) : []),
    exit,
  ]
  const tagBar = tagBarOpen ? (
    <Suspense fallback={null}>
      <TagBar
        tags={barTags}
        active={tag}
        mobile={mobile}
        onApply={(slug) => {
          setTag(slug)
          setTagBarOpen(false)
        }}
        onClose={() => (tag === null ? setTagBarOpen(false) : clearTag())}
        onClear={clearTag}
      />
    </Suspense>
  ) : null
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
      shown={{ term: shown.term, tag: shown.tag, count: data.notes.length, total: data.total }}
      hints={hints}
      tagBar={tagBar}
      onOpenTags={mobile && canTag && !tagBarOpen ? () => setTagBarOpen(true) : undefined}
    />
  )
}
