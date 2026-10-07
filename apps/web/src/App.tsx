import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { AuthContainer } from './features/auth/AuthContainer'
import { MeContainer } from './features/me/MeContainer'
import { supabase } from './lib/supabase'

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setReady(true))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!ready) return null
  return session ? <MeContainer session={session} /> : <AuthContainer />
}
