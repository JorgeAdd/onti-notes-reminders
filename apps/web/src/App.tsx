import type { CaptureRequest, SnoozePreset } from '@onti/shared'
import type { Session } from '@supabase/supabase-js'
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import type { DayView } from './features/today/day-view'
import { AuthContainer } from './features/auth/AuthContainer'
import { TodayContainer } from './features/today/TodayContainer'
import {
  captureNote,
  fetchToday,
  markNoteDone,
  patchTimezone,
  searchNotes,
  snoozeNote,
  undoNoteDone,
} from './lib/api'
import { supabase } from './lib/supabase'

// The All notes view loads on demand (Decision 7); an idle preload makes `/` instant.
const importNotes = () => import('./features/notes/NotesContainer')
const NotesContainer = lazy(() => importNotes().then((m) => ({ default: m.NotesContainer })))

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)
  // Two views, no router and no URL state (Q6): a refresh returns to today.
  const [view, setView] = useState<'today' | 'notes'>('today')

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
  if (session === null && view !== 'today') setView('today')

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
  const showToday = useCallback(() => setView('today'), [])
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
  // The screen never waits on the network: the local session is cleared first,
  // and a failed sign-out call is ignored (the token is unusable anyway).
  const signOut = useCallback(() => {
    setSession(null)
    supabase.auth.signOut().catch(() => undefined)
  }, [])
  const onSessionExpired = useCallback(() => {
    setExpired(true)
    signOut()
  }, [signOut])

  if (!ready) return null
  if (!session) return <AuthContainer expired={expired} />
  return view === 'notes' ? (
    <Suspense fallback={null}>
      <NotesContainer
        load={loadNotes}
        onSessionExpired={onSessionExpired}
        onBack={showToday}
        onSignOut={signOut}
      />
    </Suspense>
  ) : (
    <TodayContainer
      load={load}
      onSessionExpired={onSessionExpired}
      onSignOut={signOut}
      syncTimezone={syncTimezone}
      reminders={reminders}
      onOpenSearch={() => setView('notes')}
    />
  )
}
