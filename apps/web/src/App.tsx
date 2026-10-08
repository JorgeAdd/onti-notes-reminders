import type { CaptureRequest, SnoozePreset } from '@onti/shared'
import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DayView } from './features/today/day-view'
import { AuthContainer } from './features/auth/AuthContainer'
import { TodayContainer } from './features/today/TodayContainer'
import {
  captureNote,
  fetchToday,
  markNoteDone,
  patchTimezone,
  snoozeNote,
  undoNoteDone,
} from './lib/api'
import { supabase } from './lib/supabase'

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)

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

  const accessToken = session?.access_token
  const load = useCallback((view: DayView) => fetchToday(accessToken ?? '', view), [accessToken])
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
  return session ? (
    <TodayContainer
      load={load}
      onSessionExpired={onSessionExpired}
      onSignOut={signOut}
      syncTimezone={syncTimezone}
      reminders={reminders}
    />
  ) : (
    <AuthContainer expired={expired} />
  )
}
