import type { MeResponse } from '@onti/shared'
import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { fetchMe } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { messages } from '../../messages'
import { DayPage } from './DayPage'

/** Calls GET /me with the Supabase access token; DayPage only renders. */
export function MeContainer({ session }: { session: Session }) {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchMe(session.access_token)
      .then((result) => active && setMe(result))
      .catch(() => active && setError(messages.errors.api))
    return () => {
      active = false
    }
  }, [session.access_token])

  return (
    <DayPage
      me={me}
      error={error}
      now={new Date()}
      onSignOut={() => void supabase.auth.signOut()}
    />
  )
}
