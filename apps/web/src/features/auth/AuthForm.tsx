import type { FormEvent } from 'react'
import { messages } from '../../messages'
import styles from './AuthForm.module.css'

export type AuthMode = 'signIn' | 'signUp'

interface Props {
  mode: AuthMode
  busy: boolean
  notice: string | null
  error: string | null
  onSubmit: (email: string, password: string) => void
  onToggleMode: () => void
}

export function AuthForm({ mode, busy, notice, error, onSubmit, onToggleMode }: Props) {
  const t = messages.auth

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = data.get('email')
    const password = data.get('password')
    if (typeof email !== 'string' || typeof password !== 'string') return
    onSubmit(email, password)
  }

  return (
    <main className={styles.desk}>
      <form className={styles.page} onSubmit={handleSubmit}>
        <p className={styles.eyebrow}>{messages.appName}</p>
        <h1 className={styles.title}>{mode === 'signIn' ? t.signInTitle : t.signUpTitle}</h1>

        <label className={styles.field}>
          <span className={styles.label}>{t.email}</span>
          <input className={styles.input} name="email" type="email" autoComplete="email" required />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{t.password}</span>
          <input
            className={styles.input}
            name="password"
            type="password"
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            minLength={8}
            required
          />
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        <button className={styles.primary} type="submit" disabled={busy}>
          {busy ? t.working : mode === 'signIn' ? t.signIn : t.signUp}
        </button>
        <button className={styles.link} type="button" onClick={onToggleMode}>
          {mode === 'signIn' ? t.switchToSignUp : t.switchToSignIn}
        </button>
      </form>
    </main>
  )
}
