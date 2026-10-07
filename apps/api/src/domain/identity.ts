/** The caller, as proven by a verified access token. */
export interface Identity {
  userId: string
  email: string | null
  /** Verified JWT claims, forwarded to Postgres so RLS can apply. */
  claims: Record<string, unknown>
}
