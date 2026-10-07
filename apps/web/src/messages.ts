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
  },
  me: {
    signedInAs: 'Signed in as',
    timezone: 'Timezone',
    apiCheck: 'API check',
    apiOk: 'GET /me verified your token',
    loading: 'Checking your session with the API…',
    signOut: 'Sign out',
    modeNormal: 'NORMAL',
  },
  errors: {
    generic: 'Something went wrong. Please try again.',
    api: 'The API could not verify your session.',
  },
} as const
