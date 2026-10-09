import type { CaptureRequest, NoteUpdateRequest, SnoozePreset } from '@onti/shared'
import type { Session } from '@supabase/supabase-js'
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import type { DayView } from './features/today/day-view'
import { AuthContainer } from './features/auth/AuthContainer'
import { PushBridge } from './features/push/PushBridge'
import { unsubscribeThisBrowser } from './features/push/push-client'
import { TodayContainer } from './features/today/TodayContainer'
import {
  captureNote,
  deleteNote,
  fetchNote,
  fetchToday,
  markNoteDone,
  patchTimezone,
  searchNotes,
  snoozeNote,
  undoNoteDone,
  updateNote,
} from './lib/api'
import { supabase } from './lib/supabase'

// The All notes view loads on demand (Decision 7); an idle preload makes `/` instant.
const importNotes = () => import('./features/notes/NotesContainer')
const NotesContainer = lazy(() => importNotes().then((m) => ({ default: m.NotesContainer })))

/** Two views, no router and no URL state: a refresh returns to today. The note lives inside All notes. */
type AppView = { view: 'today' } | { view: 'notes'; noteId: string | null; edit: boolean }
const TODAY: AppView = { view: 'today' }
const NOTES: AppView = { view: 'notes', noteId: null, edit: false }

/** How long sign-out may wait for this browser's push subscription to be removed. */
const SIGN_OUT_PUSH_WAIT_MS = 2000

/** Resolves when `promise` settles (either way) or after `ms`, whichever comes first. */
async function settleWithin(promise: Promise<unknown>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms)
  })
  await Promise.race([promise.catch(() => undefined), timeout])
  clearTimeout(timer)
}

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)
  const [view, setView] = useState<AppView>(TODAY)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setReady(true))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (next) setExpired(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Signing out resets the view (adjusted while rendering, not in an effect).
  if (session === null && view.view !== 'today') setView(TODAY)

  const accessToken = session?.access_token
  useEffect(() => {
    if (!accessToken) return
    const preload = () => void importNotes()
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(preload)
      return () => window.cancelIdleCallback(id)
    }
    const timer = setTimeout(preload, 2000)
    return () => clearTimeout(timer)
  }, [accessToken])
  const load = useCallback((day: DayView) => fetchToday(accessToken ?? '', day), [accessToken])
  const loadNotes = useCallback(
    (term: string, tag: string | null) => searchNotes(accessToken ?? '', term, tag),
    [accessToken],
  )
  const loadNote = useCallback((id: string) => fetchNote(accessToken ?? '', id), [accessToken])
  const noteApi = useMemo(
    () => ({
      save: (id: string, patch: NoteUpdateRequest) => updateNote(accessToken ?? '', id, patch),
      remove: (id: string) => deleteNote(accessToken ?? '', id),
    }),
    [accessToken],
  )
  const showToday = useCallback(() => setView(TODAY), [])
  const openNote = useCallback(
    (noteId: string, edit = false) => setView({ view: 'notes', noteId, edit }),
    [],
  )
  const closeNote = useCallback(() => setView(NOTES), [])
  const syncTimezone = useCallback(
    (timezone: string) => patchTimezone(accessToken ?? '', timezone),
    [accessToken],
  )
  const reminders = useMemo(
    () => ({
      snooze: (id: string, preset: SnoozePreset) => snoozeNote(accessToken ?? '', id, preset),
      done: (id: string) => markNoteDone(accessToken ?? '', id),
      undo: (id: string) => undoNoteDone(accessToken ?? '', id),
      capture: (payload: CaptureRequest) => captureNote(accessToken ?? '', payload),
    }),
    [accessToken],
  )
  // The screen never waits on the network: the local session is cleared first, and a failed
  // sign-out call is ignored (the token is unusable anyway).
  const clearSession = useCallback(() => {
    setSession(null)
    supabase.auth.signOut().catch(() => undefined)
  }, [])
  // The one exception to "never waits" (slice 6, decision 24): a user's sign-out first removes
  // this browser's push subscription, waiting at most SIGN_OUT_PUSH_WAIT_MS and only when this
  // browser is subscribed (otherwise it settles at once). An expired session skips it: the token
  // would be refused, so `onSessionExpired` clears the session directly.
  const signOut = useCallback(() => {
    const token = accessToken
    if (!token) return clearSession()
    void settleWithin(unsubscribeThisBrowser(token), SIGN_OUT_PUSH_WAIT_MS).then(clearSession)
  }, [accessToken, clearSession])
  const onSessionExpired = useCallback(() => {
    setExpired(true)
    clearSession()
  }, [clearSession])

  if (!ready) return null
  if (!session) return <AuthContainer expired={expired} />
  return (
    <>
      <PushBridge accessToken={session.access_token} onSessionExpired={onSessionExpired} />
      {view.view === 'notes' ? (
        <Suspense fallback={null}>
          <NotesContainer
            load={loadNotes}
            onSessionExpired={onSessionExpired}
            onBack={showToday}
            onSignOut={signOut}
            noteId={view.noteId}
            loadNote={loadNote}
            noteApi={noteApi}
            startInEdit={view.edit}
            onOpenNote={openNote}
            onCloseNote={closeNote}
          />
        </Suspense>
      ) : (
        <TodayContainer
          load={load}
          onSessionExpired={onSessionExpired}
          onSignOut={signOut}
          syncTimezone={syncTimezone}
          reminders={reminders}
          onOpenSearch={() => setView(NOTES)}
          onOpenNote={openNote}
        />
      )}
    </>
  )
}
