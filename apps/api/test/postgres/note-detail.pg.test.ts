import type { Kysely } from 'kysely'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Identity } from '../../src/domain/identity'
import { createDatabase, type Database } from '../../src/infrastructure/db/database'
import { PostgresNoteRepository } from '../../src/infrastructure/db/postgres-note-repository'
import { noteId } from '../fakes'

/**
 * Real-Postgres characterization of `findOwn` (GET /notes/:id): body, tags ordered by slug,
 * creation time, and the C11 404 through the explicit `user_id` plus RLS. Same throwaway database
 * as `search.pg.test.ts` (commands in `standins.sql`):
 *
 *   ONTI_TEST_DATABASE_URL='postgresql://onti_check_api@/onti_s5_check?host=/tmp' npm run test -w @onti/api
 *
 * Not run in CI.
 */
const URL = process.env.ONTI_TEST_DATABASE_URL

const JORGE_ID = 'c0c0c0c0-5a5a-4a5a-8a5a-0000000000a1'
const ANA_ID = 'c0c0c0c0-5a5a-4a5a-8a5a-0000000000a2'
const identity = (userId: string): Identity => ({
  userId,
  email: null,
  claims: { sub: userId, role: 'authenticated', aud: 'authenticated' },
})
const JORGE = identity(JORGE_ID)
const ANA = identity(ANA_ID)

const TAGGED_ID = noteId(9001)
const PLAIN_ID = noteId(9002)
const BODY = 'Ana needs **admin** access\n\n- Repo settings'
const CREATED = new Date('2026-10-01T16:00:00.000Z')

describe.skipIf(!URL)('Postgres findOwn (real database)', () => {
  let pool: pg.Pool
  let db: Kysely<Database>
  let repo: PostgresNoteRepository

  const q = (text: string, params: unknown[] = []) => pool.query(text, params)

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: URL, max: 2 })
    db = createDatabase(URL!)
    repo = new PostgresNoteRepository(db)

    await q('delete from auth.users where id = any($1)', [[JORGE_ID, ANA_ID]])
    await q('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [
      JORGE_ID,
      'jorge-detail@example.test',
      ANA_ID,
      'ana-detail@example.test',
    ])
    await q(
      `insert into notes (id, user_id, title, body, created_at) values ($1, $2, 'Tagged', $3, $4), ($5, $2, 'Plain', '', $4)`,
      [TAGGED_ID, JORGE_ID, BODY, CREATED, PLAIN_ID],
    )
    for (const [slug, name] of [
      ['zeta', 'Zeta'],
      ['alpha', 'Alpha'],
    ]) {
      await q(`insert into tags (user_id, slug, name) values ($1, $2, $3)`, [JORGE_ID, slug, name])
      await q(
        `insert into note_tags (user_id, note_id, tag_id)
         select $1, $2, id from tags where user_id = $1 and slug = $3`,
        [JORGE_ID, TAGGED_ID, slug],
      )
    }
  })

  afterAll(async () => {
    await q('delete from auth.users where id = any($1)', [[JORGE_ID, ANA_ID]])
    await db.destroy()
    await pool.end()
  })

  it('returns the body, creation time and tags ordered by slug', async () => {
    const note = await repo.findOwn(JORGE, TAGGED_ID)
    expect(note).toMatchObject({ id: TAGGED_ID, title: 'Tagged', body: BODY, createdAt: CREATED })
    expect(note!.tags).toEqual([
      { slug: 'alpha', name: 'Alpha' },
      { slug: 'zeta', name: 'Zeta' },
    ])
  })

  it('returns an empty body and no tags for a plain note', async () => {
    expect(await repo.findOwn(JORGE, PLAIN_ID)).toMatchObject({ body: '', tags: [] })
  })

  it("C11: another user's note and an unknown id are both null (explicit user_id plus RLS)", async () => {
    expect(await repo.findOwn(ANA, TAGGED_ID)).toBeNull()
    expect(await repo.findOwn(JORGE, noteId(9999))).toBeNull()
  })
})
