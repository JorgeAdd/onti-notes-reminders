import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import { AuthContainer } from './features/auth/AuthContainer'
import { TodayContainer } from './features/today/TodayContainer'
import { fetchToday } from './lib/api'
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
  const load = useCallback(() => fetchToday(accessToken ?? ''), [accessToken])
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
    <TodayContainer load={load} onSessionExpired={onSessionExpired} onSignOut={signOut} />
  ) : (
    <AuthContainer expired={expired} />
  )
}
