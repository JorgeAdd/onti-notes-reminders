/** Every user-facing string lives here (CLAUDE.md rule 12). */
export const messages = {
  appName: 'Notes + Reminders',
  auth: {
    signInTitle: 'Sign in',
    signUpTitle: 'Create your account',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    signUp: 'Create account',
    switchToSignUp: 'No account yet? Create one',
    switchToSignIn: 'Already have an account? Sign in',
    checkEmail: 'Check your email to confirm your account, then sign in.',
    working: 'Working…',
    sessionExpired: 'Your session expired. Sign in again.',
  },
  today: {
    header: (open: number, anyDone: boolean) =>
      anyDone ? `${open} left today` : `${open} ${open === 1 ? 'thing' : 'things'} today`,
    carriedFrom: (day: string) => `Still open from ${day}`,
    otherNotes: (n: number) => `${n} other ${n === 1 ? 'note' : 'notes'} on the back of the pad`,
    late: (duration: string) => `late ${duration}`,
    upcoming: (duration: string) => `in ${duration}`,
    nowAt: (time: string) => `now ${time}`,
    loading: 'Opening your day…',
    loadError: 'Your day could not be loaded.',
    retry: 'Try again',
    signOut: 'Sign out',
    nothingToday: 'Nothing today',
    noNotes: 'No notes yet',
  },
  statusline: {
    mode: 'NORMAL',
    counts: (today: number, carried: number, total: number) =>
      `${today} today · ${carried} carried · ${total} ${total === 1 ? 'note' : 'notes'}`,
  },
  errors: {
    generic: 'Something went wrong. Please try again.',
    dismiss: 'Dismiss',
    actionFailed: (action: 'snooze' | 'done' | 'undo', title: string) =>
      `Could not ${{ snooze: 'snooze', done: 'mark as done', undo: 'undo' }[action]} “${title}”. It is back where it was.`,
    actionConflict: (title: string) =>
      `“${title}” changed on another device. It is back where it was.`,
    actionMissing: (title: string) => `“${title}” no longer exists. It is back where it was.`,
  },
} as const
