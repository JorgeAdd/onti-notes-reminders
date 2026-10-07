import type { Identity } from '../domain/identity'

/** Verifies an access token and returns who it belongs to. Throws UnauthorizedError. */
export interface TokenVerifier {
  verify(token: string): Promise<Identity>
}

export interface Profile {
  timezone: string
}

/** Reads profiles as the caller (RLS applies). */
export interface ProfileRepository {
  findOwn(identity: Identity): Promise<Profile | null>
}
