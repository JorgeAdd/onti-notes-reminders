import type { Reminder } from '@onti/shared'
import type { Identity } from '../src/domain/identity'
import type {
  NewNote,
  NoteListRow,
  NoteRepository,
  Profile,
  ProfileRepository,
} from '../src/application/ports'
import type { NoteRecord } from '../src/domain/note'

export const JORGE: Identity = {
  userId: '7b0c5a2e-3f4d-4c1a-9e8b-2d6f0a1b3c4d',
  email: 'jorge@example.com',
  claims: {},
}

export const ANA: Identity = {
  userId: '1d2e3f40-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
  email: 'ana@example.com',
  claims: {},
}

/** Owner-scoped like RLS: a caller only reaches their own profile row. */
export class InMemoryProfiles implements ProfileRepository {
  readonly writes: { userId: string; timezone: string }[] = []

  constructor(private readonly rows = new Map<string, Profile>()) {}

  static of(entries: Record<string, string>): InMemoryProfiles {
    return new InMemoryProfiles(
      new Map(Object.entries(entries).map(([userId, timezone]) => [userId, { timezone }])),
    )
  }

  findOwn(identity: Identity): Promise<Profile | null> {
    return Promise.resolve(this.rows.get(identity.userId) ?? null)
  }

  /** Mirrors `update … where timezone = 'UTC'`: only a default profile changes. */
  setTimezoneIfDefault(identity: Identity, timezone: string): Promise<string | null> {
    const row = this.rows.get(identity.userId)
    if (!row) return Promise.resolve(null)
    if (row.timezone === 'UTC') {
      row.timezone = timezone
      this.writes.push({ userId: identity.userId, timezone })
    }
    return Promise.resolve(row.timezone)
  }
}

/** A read-only profile port that always answers `profile`; writes are never expected. */
export function profileReturning(profile: Profile | null): ProfileRepository {
  return {
    findOwn: () => Promise.resolve(profile),
    setTimezoneIfDefault: () => Promise.reject(new Error('unexpected write')),
  }
}

export const noteId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

export function noteRecord(n: number, overrides: Partial<NoteRecord> = {}): NoteRecord {
  return {
    id: noteId(n),
    title: `Note ${n}`,
    tags: [],
    dueAt: null,
    originalDueAt: null,
    snoozeCount: 0,
    doneAt: null,
    notifiedDueAt: null,
    ...overrides,
  }
}

interface OwnedNote {
  ownerId: string
  note: NoteRecord
  body?: string
  createdAt?: Date
}
type StoredNote = Required<OwnedNote>

/** The words a stored note offers to a search: the fake's stand-in for Postgres' `simple` parser. */
const wordsOf = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== '')

const BODY_HEAD = 400

/**
 * Owner-scoped like RLS plus the adapter's contract: an unknown or foreign id answers `null`,
 * `decide` runs on the stored reminder, a thrown error leaves the row untouched (rollback), and
 * an unchanged result writes nothing.
 */
export class InMemoryNotes implements NoteRepository {
  readonly writes: string[] = []
  readonly created: { ownerId: string; input: NewNote }[] = []
  private nextId = 1000
  private readonly rows = new Map<string, StoredNote>()

  /** `body` defaults to empty; `createdAt` defaults to the insertion order (later is newer). */
  constructor(owned: OwnedNote[] = []) {
    for (const row of owned) {
      this.rows.set(row.note.id, {
        body: '',
        createdAt: new Date(this.rows.size),
        ...row,
      })
    }
  }

  get(id: string): NoteRecord | undefined {
    return this.rows.get(id)?.note
  }

  createOwn(identity: Identity, input: NewNote): Promise<NoteRecord> {
    const note: NoteRecord = {
      ...noteRecord(this.nextId++),
      title: input.title,
      tags: input.tags.map(({ slug, name }) => ({ slug, name })),
      dueAt: input.dueAt,
      originalDueAt: input.dueAt,
    }
    this.rows.set(note.id, {
      ownerId: identity.userId,
      note,
      body: '',
      createdAt: new Date(this.rows.size),
    })
    this.created.push({ ownerId: identity.userId, input })
    return Promise.resolve(note)
  }

  listOwn(identity: Identity): Promise<NoteRecord[]> {
    return Promise.resolve(
      [...this.rows.values()].filter((r) => r.ownerId === identity.userId).map((r) => r.note),
    )
  }

  mutateReminder(
    identity: Identity,
    id: string,
    decide: (reminder: Reminder) => Reminder,
  ): Promise<NoteRecord | null> {
    const row = this.rows.get(id)
    if (!row || row.ownerId !== identity.userId) return Promise.resolve(null)
    try {
      const next = decide(row.note)
      if (next !== row.note) {
        row.note = {
          ...row.note,
          dueAt: next.dueAt,
          originalDueAt: next.originalDueAt,
          snoozeCount: next.snoozeCount,
          doneAt: next.doneAt,
          notifiedDueAt: next.notifiedDueAt,
        }
        this.writes.push(id)
      }
      return Promise.resolve(row.note)
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Same word-prefix rule as the adapter (every term starts some word of title or body), newest
   * first with the id as tie-break. It splits on `[^\p{L}\p{N}]`, so unlike Postgres it also matches
   * words inside hosts and paths: tests must not assert those terms.
   */
  searchOwn(
    identity: Identity,
    query: { terms: string[]; limit: number },
  ): Promise<{ rows: NoteListRow[]; total: number }> {
    const own = [...this.rows.values()].filter((r) => r.ownerId === identity.userId)
    const matches = own.filter((r) => {
      const words = wordsOf(`${r.note.title} ${r.body}`)
      return query.terms.every((term) => words.some((word) => word.startsWith(term)))
    })
    const rows = matches
      .sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.note.id < b.note.id ? 1 : -1),
      )
      .slice(0, query.limit)
      .map((r) => ({
        id: r.note.id,
        title: r.note.title,
        bodyHead: r.body.slice(0, BODY_HEAD),
        tags: r.note.tags,
        dueAt: r.note.dueAt,
        doneAt: r.note.doneAt,
      }))
    return Promise.resolve({ rows, total: own.length })
  }
}
