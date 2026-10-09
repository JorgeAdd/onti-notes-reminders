import type { Reminder } from '@onti/shared'
import type { Identity } from '../domain/identity'
import type { NoteDetail, NoteRecord } from '../domain/note'

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

/** What capture stores: tag names are already derived, due and original due are equal. */
export interface NewNote {
  title: string
  dueAt: Date | null
  tags: { slug: string; name: string }[]
}

/** One row of the notes listing: the head of the body only (the use case builds the excerpt). */
export interface NoteListRow {
  id: string
  title: string
  bodyHead: string
  tags: { name: string; slug: string }[]
  dueAt: Date | null
  doneAt: Date | null
}

/** Reads and writes notes as the caller (RLS applies). */
export interface NoteRepository {
  /** Every note of the caller, without bodies, with its tags. */
  listOwn(identity: Identity): Promise<NoteRecord[]>
  /**
   * Creates a note with its tags in ONE transaction: tags are upserted on (user_id, slug) keeping
   * an existing name, then the note (`due_at = original_due_at = dueAt`) and its links. A failure
   * leaves nothing behind.
   */
  createOwn(identity: Identity, input: NewNote): Promise<NoteRecord>
  /**
   * Runs `decide` on the caller's note under a row lock, in one transaction, and stores the
   * reminder it returns when it differs. Returns the stored note, or null when the id is unknown
   * or not the caller's (R15). `decide` is pure and synchronous; anything it throws rolls the
   * transaction back and propagates.
   */
  mutateReminder(
    identity: Identity,
    id: string,
    decide: (reminder: Reminder) => Reminder,
  ): Promise<NoteRecord | null>
  /**
   * One note of the caller with its body and tags (no row lock). Null when the id is unknown or
   * not the caller's (R15, C11): the two look the same.
   */
  findOwn(identity: Identity, id: string): Promise<NoteDetail | null>
  /**
   * The caller's notes newest first (`created_at desc, id desc`), at most `limit`. With terms, only
   * notes matching EVERY term as a word prefix on title or body; no terms means no filter. `total`
   * is the count of ALL the caller's notes, never narrowed by the terms. `tag` keeps only notes
   * carrying that slug among the caller's own tags, applied BEFORE the limit; an unknown slug
   * matches nothing.
   */
  searchOwn(
    identity: Identity,
    query: { terms: string[]; limit: number; tag?: string },
  ): Promise<{ rows: NoteListRow[]; total: number }>
}
