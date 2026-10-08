import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { messages } from '../../messages'
import { AuthForm, type AuthMode } from './AuthForm'

/** Talks to Supabase Auth; AuthForm only renders. */
export function AuthContainer({ expired: sessionExpired = false }: { expired?: boolean }) {
  const [mode, setMode] = useState<AuthMode>('signIn')
  const [busy, setBusy] = useState(false)
  const [expired, setExpired] = useState(sessionExpired)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(email: string, password: string) {
    setBusy(true)
    setExpired(false)
    setError(null)
    setNotice(null)
    const result =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (result.error) {
      setError(result.error.message || messages.errors.generic)
      return
    }
    if (mode === 'signUp' && !result.data.session) setNotice(messages.auth.checkEmail)
  }

  return (
    <AuthForm
      mode={mode}
      busy={busy}
      expired={expired}
      notice={notice}
      error={error}
      onSubmit={(email, password) => void submit(email, password)}
      onToggleMode={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
    />
  )
}
