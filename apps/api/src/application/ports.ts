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
