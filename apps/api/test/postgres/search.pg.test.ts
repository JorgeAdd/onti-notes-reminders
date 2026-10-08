import { tagNameFromSlug } from '@onti/shared'
import { at, BEFORE_CAPTURE, N1 } from '@onti/shared/fixtures/jorge-week'
import type { Kysely } from 'kysely'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { searchTerms } from '../../src/domain/search-terms'
import type { Identity } from '../../src/domain/identity'
import { createDatabase, type Database } from '../../src/infrastructure/db/database'
import { PostgresNoteRepository } from '../../src/infrastructure/db/postgres-note-repository'
import { noteId } from '../fakes'

/**
 * Real-Postgres characterization of GET /notes (decision 14). Runs only against a THROWAWAY database
 * prepared with `standins.sql` and the migrations (commands in its header):
 *
 *   ONTI_TEST_DATABASE_URL='postgresql://onti_check_api@/onti_s5_check?host=/tmp' npm run test -w @onti/api
 *
 * It is the arbiter of tokenizing: the in-memory fake only approximates it. Not run in CI.
 */
const URL = process.env.ONTI_TEST_DATABASE_URL

const JORGE_ID = 'c0c0c0c0-5a5a-4a5a-8a5a-000000000001'
const ANA_ID = 'c0c0c0c0-5a5a-4a5a-8a5a-000000000002'
const BULK_ID = 'c0c0c0c0-5a5a-4a5a-8a5a-000000000003'
const identity = (userId: string, sub = userId): Identity => ({
  userId,
  email: null,
  claims: { sub, role: 'authenticated', aud: 'authenticated' },
})
const JORGE = identity(JORGE_ID)
const ANA = identity(ANA_ID)
const BULK = identity(BULK_ID)

/** docs/product/scenario-dataset.md: the only two bodies the dataset defines. */
const N1_BODY = `Ana needs to move **admin** permissions on \`client-a/web\` from me to Luis
before Friday's release.

- Repo settings → Collaborators
- Keep me as _maintainer_ until the handoff`
const N8_BODY = `Staging: https://staging.client-b.example

- \`qa-admin\` / see 1Password
- \`qa-viewer\` / see 1Password`

const DATASET = [N1, ...BEFORE_CAPTURE]
const N2_ID = noteId(2)
const N8_ID = noteId(8)
const BASE = at('2026-10-01 10:00').getTime()
/** Explicit, distinct creation times: N1 is the newest, N15 the oldest. */
const createdAt = (index: number) => new Date(BASE + (DATASET.length - index) * 60_000)

describe.skipIf(!URL)('Postgres searchOwn (real database)', () => {
  let pool: pg.Pool
  let db: Kysely<Database>
  let repo: PostgresNoteRepository

  const q = async <T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<T[]> => (await pool.query<T>(text, params)).rows
  /** Terms exactly as the use case derives them from the user's input. */
  const search = (input: string, who: Identity = JORGE) =>
    repo.searchOwn(who, { terms: searchTerms(input), limit: 50 })
  const titles = (page: { rows: { title: string }[] }) => page.rows.map((r) => r.title)
  /** Does `text` match the tsquery text under the `simple` configuration? */
  const matches = async (text: string, tsquery: string) =>
    (
      await q<{ hit: boolean }>(
        `select to_tsvector('simple', $1) @@ to_tsquery('simple', $2) as hit`,
        [text, tsquery],
      )
    )[0]!.hit

  const insertNote = (
    id: string,
    userId: string,
    title: string,
    body: string,
    created: Date,
    extra: { dueAt?: Date | null; doneAt?: Date | null } = {},
  ) =>
    q(
      `insert into notes (id, user_id, title, body, due_at, original_due_at, done_at, created_at)
       values ($1, $2, $3, $4, $5, $5, $6, $7)`,
      [id, userId, title, body, extra.dueAt ?? null, extra.doneAt ?? null, created],
    )

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: URL, max: 2 })
    db = createDatabase(URL!)
    repo = new PostgresNoteRepository(db)

    await q('delete from auth.users where id = any($1)', [[JORGE_ID, ANA_ID, BULK_ID]])
    for (const [id, email] of [
      [JORGE_ID, 'jorge-s5@example.test'],
      [ANA_ID, 'ana-s5@example.test'],
      [BULK_ID, 'bulk-s5@example.test'],
    ]) {
      await q('insert into auth.users (id, email) values ($1, $2)', [id, email])
    }

    for (const [index, fixture] of DATASET.entries()) {
      const body = fixture.id === 'N1' ? N1_BODY : fixture.id === 'N8' ? N8_BODY : ''
      const id = noteId(index + 1)
      await insertNote(id, JORGE_ID, fixture.title, body, createdAt(index), {
        dueAt: fixture.dueAt,
        doneAt: fixture.id === 'N1' ? at('2026-10-06 17:00') : null,
      })
      for (const slug of fixture.tags) {
        await q(
          `insert into tags (user_id, slug, name) values ($1, $2, $3) on conflict (user_id, slug) do nothing`,
          [JORGE_ID, slug, tagNameFromSlug(slug)],
        )
        await q(
          `insert into note_tags (user_id, note_id, tag_id)
           select $1, $2, id from tags where user_id = $1 and slug = $3`,
          [JORGE_ID, id, slug],
        )
      }
    }
    // Ana's decoy: the same word in her own title and body.
    await insertNote(noteId(101), ANA_ID, 'Ana staging checklist', 'staging for Ana', createdAt(0))

    for (let i = 0; i < 60; i += 1) {
      await insertNote(noteId(200 + i), BULK_ID, `Bulk ${i}`, '', new Date(BASE + i * 60_000))
    }
    // Tag held only by the 5 OLDEST bulk notes: it must still list 5 although 55 newer notes exist.
    await q(`insert into tags (user_id, slug, name) values ($1, 'old', 'Old')`, [BULK_ID])
    for (let i = 0; i < 5; i += 1) {
      await q(
        `insert into note_tags (user_id, note_id, tag_id)
         select $1, $2, id from tags where user_id = $1 and slug = 'old'`,
        [BULK_ID, noteId(200 + i)],
      )
    }
    // Ana's decoy carries Jorge's tag slug on her own tag row.
    await q(`insert into tags (user_id, slug, name) values ($1, 'client-b', 'Client B')`, [ANA_ID])
    await q(
      `insert into note_tags (user_id, note_id, tag_id)
       select $1, $2, id from tags where user_id = $1 and slug = 'client-b'`,
      [ANA_ID, noteId(101)],
    )
    await insertNote(noteId(300), BULK_ID, 'Longbody', 'x'.repeat(5000), new Date(BASE - 60_000))
  })

  afterAll(async () => {
    if (!pool) return
    await q('delete from auth.users where id = any($1)', [[JORGE_ID, ANA_ID, BULK_ID]])
    await pool.end()
    await db.destroy()
  })

  describe('requirements', () => {
    it('C9: "staging" gives N2 (title) and N8 (title and body), newest first, never Ana`s decoy', async () => {
      const page = await search('staging')
      expect(page.rows.map((r) => r.id)).toEqual([N2_ID, N8_ID])
      expect(page.total).toBe(15)
    })

    it('is case-insensitive and matches by word prefix', async () => {
      for (const input of ['STAGING', 'Staging', 'stag']) {
        expect((await search(input)).rows.map((r) => r.id)).toEqual([N2_ID, N8_ID])
      }
    })

    it('searches bodies: "collaborators" and "release" appear only in the body of N1', async () => {
      for (const input of ['collaborators', 'release', 'COLLAB']) {
        expect(titles(await search(input))).toEqual([N1.title])
      }
    })

    it('requires every term (AND)', async () => {
      expect((await search('staging url')).rows.map((r) => r.id)).toEqual([N8_ID])
      expect((await search('staging zzzz')).rows).toEqual([])
    })

    it('lists every note by created_at desc when there are no terms', async () => {
      const page = await search('')
      expect(page.rows).toHaveLength(15)
      expect(page.rows.map((r) => r.id)).toEqual(DATASET.map((_, i) => noteId(i + 1)))
    })

    it('returns tags, due and done with each row', async () => {
      const [first] = (await search('collaborators')).rows
      expect(first).toMatchObject({
        id: noteId(1),
        tags: [{ name: 'Client A', slug: 'client-a' }],
        dueAt: N1.dueAt,
        doneAt: at('2026-10-06 17:00'),
      })
    })

    it('gives 50 of 60 and a total of 60; the total counts only the caller`s notes', async () => {
      const page = await repo.searchOwn(BULK, { terms: [], limit: 50 })
      expect(page.rows).toHaveLength(50)
      expect(page.total).toBe(61)
      expect(page.rows[0]!.id).toBe(noteId(259))
      const ana = await search('', ANA)
      expect(ana.total).toBe(1)
      expect(ana.rows).toHaveLength(1)
    })

    it('does not narrow the total by the terms', async () => {
      expect((await search('collaborators')).total).toBe(15)
      expect((await search('zzzz')).total).toBe(15)
    })

    it('ships at most 400 characters of the body', async () => {
      const page = await repo.searchOwn(BULK, { terms: ['longbody'], limit: 50 })
      expect(page.rows[0]!.bodyHead).toBe('x'.repeat(400))
    })

    it('isolates users: Ana searching "staging" sees only her own note', async () => {
      const page = await search('staging', ANA)
      expect(titles(page)).toEqual(['Ana staging checklist'])
      expect(page.total).toBe(1)
    })

    it('rejects a hostile term array before any query runs', async () => {
      for (const terms of [[`a'b`], ['a', 'b|c'], ['x:*'], ['(']]) {
        await expect(repo.searchOwn(JORGE, { terms, limit: 50 })).rejects.toThrow(/plain word/)
      }
    })

    it('runs as `authenticated`: RLS is a second lock behind the explicit user_id', async () => {
      // Jorge's id in the query, Ana's token claims: the policy hides every row.
      const forged = identity(JORGE_ID, ANA_ID)
      const page = await repo.searchOwn(forged, { terms: [], limit: 50 })
      expect(page).toEqual({ rows: [], total: 0 })
      // A role that bypasses RLS (the login role) does see them, which proves the filter is RLS.
      expect(
        await q('select count(*)::int as n from notes where user_id = $1', [JORGE_ID]),
      ).toEqual([{ n: 15 }])
    })
  })

  describe('tag filter', () => {
    const tagged = (tag: string, who: Identity = JORGE, input = '') =>
      repo.searchOwn(who, { terms: searchTerms(input), limit: 50, tag })

    it('lists only the notes with the tag, and combines it with the terms', async () => {
      const page = await tagged('client-b')
      expect(page.rows).toHaveLength(5)
      expect(page.total).toBe(15)
      expect((await tagged('client-b', JORGE, 'staging')).rows.map((r) => r.id)).toEqual([N8_ID])
    })

    it('filters in SQL before the cap: 5 tagged notes among the 55 newer ones', async () => {
      const page = await tagged('old', BULK)
      expect(page.rows.map((r) => r.id)).toEqual([204, 203, 202, 201, 200].map(noteId))
      expect(page.total).toBe(61)
    })

    it('never crosses users: Ana`s same-slug tag does not show Jorge`s notes or the reverse', async () => {
      expect(titles(await tagged('client-b', ANA))).toEqual(['Ana staging checklist'])
      expect((await tagged('client-b', JORGE, 'ana')).rows).toEqual([])
      expect(await tagged('old', JORGE)).toEqual({ rows: [], total: 15 })
    })
  })

  describe('tokenizing (characterization, Postgres 16)', () => {
    it('keeps the https host as ONE token next to the word "staging"', async () => {
      const [row] = await q<{ tokens: string }>(
        'select search::text as tokens from notes where id = $1',
        [N8_ID],
      )
      expect(row?.tokens).toContain(`'staging':1`)
      expect(row?.tokens).toContain(`'staging.client-b.example':`)
      expect(row?.tokens).not.toContain(`'example'`)
    })

    it('matches "staging" inside the host by prefix, but not its inner words', async () => {
      const host = 'staging.client-b.example'
      expect(await matches(host, `'staging':*`)).toBe(true)
      expect(await matches(host, `'client':* & 'b':*`)).toBe(false)
      expect(await matches(host, `'example':*`)).toBe(false)
      // Same through the adapter: terms split on the dot reach no host token.
      expect((await search('client b')).rows.map((r) => r.id)).not.toContain(N8_ID)
      expect((await search('example')).rows).toEqual([])
    })

    it('splits "client-a" into client-a, client and a', async () => {
      const [row] = await q<{ tokens: string }>(
        `select to_tsvector('simple', 'client-a')::text as tokens`,
      )
      expect(row?.tokens).toBe(`'a':3 'client':2 'client-a':1`)
      expect(titles(await search('client'))).toContain(N1.title)
    })

    it('reads "/web" in "client-a/web" as a file token, so "web" does not match N1', async () => {
      const [row] = await q<{ tokens: string }>(
        'select search::text as tokens from notes where id = $1',
        [noteId(1)],
      )
      expect(row?.tokens).toContain(`'/web':`)
      expect(row?.tokens).not.toMatch(/'web':/)
      expect((await search('web')).rows).toEqual([])
    })

    it('matches "collab:*" and "COLLAB:*" against "Collaborators"', async () => {
      expect(await matches('Repo settings → Collaborators', `collab:*`)).toBe(true)
      expect(await matches('Repo settings → Collaborators', `COLLAB:*`)).toBe(true)
    })

    it('answers 200 with an empty list for terms the tokenizer ignores (² and Ⅻ)', async () => {
      for (const input of ['²', 'Ⅻ', '² Ⅻ']) {
        expect(await search(input)).toEqual({ rows: [], total: 15 })
      }
    })
  })
})
