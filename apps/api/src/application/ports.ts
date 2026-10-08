import type { Identity } from '../domain/identity'
import type { NoteRecord } from '../domain/note'

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
  /**
   * Sets the timezone only while it is still the default `UTC`, atomically (a second call
   * changes nothing). Returns the stored timezone, or null when the profile row is missing.
   */
  setTimezoneIfDefault(identity: Identity, timezone: string): Promise<string | null>
}

/** Time comes only from here (CLAUDE.md rule 16). */
export interface Clock {
  now(): Date
}

/** Reads notes as the caller (RLS applies). */
export interface NoteRepository {
  /** Every note of the caller, without bodies, with its tags. */
  listOwn(identity: Identity): Promise<NoteRecord[]>
}
