import type { Kysely } from 'kysely'
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Identity } from '../../src/domain/identity'
import { createDatabase, type Database } from '../../src/infrastructure/db/database'
import { PostgresNoteRepository } from '../../src/infrastructure/db/postgres-note-repository'
import { noteId } from '../fakes'

/**
 * Real-Postgres characterization of `updateOwn` and `deleteOwn` (PATCH and DELETE /notes/:id,
 * R20, R8, R15): tag upsert keeping stored names, link replacement, orphan tags never listed,
 * row-lock serialisation, no `updated_at` bump for a no-op, rollback, cascade, RLS. Same
 * throwaway database as `search.pg.test.ts` (commands in `standins.sql`):
 *
 *   ONTI_TEST_DATABASE_URL='postgresql://onti_check_api@/onti_s5_check?host=/tmp' npm run test -w @onti/api
 *
 * Not run in CI.
 */
const URL = process.env.ONTI_TEST_DATABASE_URL

const JORGE_ID = 'c0c0c0c0-5a5a-4a5a-8a5a-0000000000b1'
const ANA_ID = 'c0c0c0c0-5a5a-4a5a-8a5a-0000000000b2'
const identity = (userId: string): Identity => ({
  userId,
  email: null,
  claims: { sub: userId, role: 'authenticated', aud: 'authenticated' },
})
const JORGE = identity(JORGE_ID)
const ANA = identity(ANA_ID)

const NOTE = noteId(9101)
const OTHER = noteId(9102)
const DUE = new Date('2026-10-07T17:00:00.000Z')
const NEW_DUE = new Date('2026-10-09T10:00:00.000Z')

describe.skipIf(!URL)('Postgres updateOwn and deleteOwn (real database)', () => {
  let pool: pg.Pool
  let db: Kysely<Database>
  let repo: PostgresNoteRepository

  const q = (text: string, params: unknown[] = []) => pool.query(text, params)
  const row = async (id: string) =>
    (await q('select * from notes where id = $1', [id])).rows[0] as
      | {
          title: string
          body: string
          due_at: Date | null
          original_due_at: Date | null
          snooze_count: number
          done_at: Date | null
          notified_due_at: Date | null
          updated_at: Date
        }
      | undefined
  const slugsOf = async (id: string) =>
    (
      await q(
        `select t.slug from note_tags nt join tags t on t.id = nt.tag_id where nt.note_id = $1 order by t.slug`,
        [id],
      )
    ).rows.map((r: { slug: string }) => r.slug)

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: URL, max: 4 })
    db = createDatabase(URL!)
    repo = new PostgresNoteRepository(db)
    await q('delete from auth.users where id = any($1)', [[JORGE_ID, ANA_ID]])
    await q('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [
      JORGE_ID,
      'jorge-update@example.test',
      ANA_ID,
      'ana-update@example.test',
    ])
  })

  beforeEach(async () => {
    await q('delete from notes where user_id = any($1)', [[JORGE_ID, ANA_ID]])
    await q('delete from tags where user_id = any($1)', [[JORGE_ID, ANA_ID]])
    await q(
      `insert into notes (id, user_id, title, body, due_at, original_due_at, snooze_count, done_at, notified_due_at)
       values ($1, $2, 'Original', 'old body', $3, $4, 2, $5, $4), ($6, $7, 'Hers', 'ana body', null, null, 0, null, null)`,
      [
        NOTE,
        JORGE_ID,
        DUE,
        new Date('2026-10-06T18:00:00.000Z'),
        new Date('2026-10-07T18:00:00.000Z'),
        OTHER,
        ANA_ID,
      ],
    )
    await q(`insert into tags (user_id, slug, name) values ($1, 'client-a', 'Client A Custom')`, [
      JORGE_ID,
    ])
    await q(
      `insert into note_tags (user_id, note_id, tag_id) select $1, $2, id from tags where user_id = $1 and slug = 'client-a'`,
      [JORGE_ID, NOTE],
    )
  })

  afterAll(async () => {
    await q('delete from auth.users where id = any($1)', [[JORGE_ID, ANA_ID]])
    await db.destroy()
    await pool.end()
  })

  it('updates title and body only and returns the detail with its tags', async () => {
    const note = await repo.updateOwn(JORGE, NOTE, { title: 'New', body: '' })
    expect(note).toMatchObject({
      id: NOTE,
      title: 'New',
      body: '',
      snoozeCount: 2,
      tags: [{ slug: 'client-a', name: 'Client A Custom' }],
    })
    expect(await slugsOf(NOTE)).toEqual(['client-a'])
  })

  it('replaces the tag links, keeps a stored name and creates a new slug with the given name', async () => {
    const note = await repo.updateOwn(JORGE, NOTE, {
      tags: [
        { slug: 'new-one', name: 'New One' },
        { slug: 'client-a', name: 'Derived Name' },
      ],
    })
    expect(note!.tags).toEqual([
      { slug: 'client-a', name: 'Client A Custom' },
      { slug: 'new-one', name: 'New One' },
    ])
    const replaced = await repo.updateOwn(JORGE, NOTE, { tags: [{ slug: 'new-one', name: 'x' }] })
    expect(replaced!.tags).toEqual([{ slug: 'new-one', name: 'New One' }])
    expect(await slugsOf(NOTE)).toEqual(['new-one'])
  })

  it('an unlinked tag stays as a row but never lists: not in the notes, not as a search tag (R12, R20)', async () => {
    await repo.updateOwn(JORGE, NOTE, { tags: [] })
    expect(await slugsOf(NOTE)).toEqual([])
    expect(
      (await q(`select 1 from tags where user_id = $1 and slug = 'client-a'`, [JORGE_ID])).rowCount,
    ).toBe(1)
    expect((await repo.listOwn(JORGE)).flatMap((n) => n.tags)).toEqual([])
    expect((await repo.searchOwn(JORGE, { terms: [], limit: 50, tag: 'client-a' })).rows).toEqual(
      [],
    )
  })

  it('applies the reminder step to the locked row: reschedule keeps notified_due_at, clear wipes it', async () => {
    await repo.updateOwn(JORGE, NOTE, {
      reminder: (r) => ({
        ...r,
        dueAt: NEW_DUE,
        originalDueAt: NEW_DUE,
        snoozeCount: 0,
        doneAt: null,
      }),
    })
    expect(await row(NOTE)).toMatchObject({
      due_at: NEW_DUE,
      original_due_at: NEW_DUE,
      snooze_count: 0,
      done_at: null,
      notified_due_at: new Date('2026-10-06T18:00:00.000Z'),
    })
    await repo.updateOwn(JORGE, NOTE, {
      reminder: () => ({
        dueAt: null,
        originalDueAt: null,
        snoozeCount: 0,
        doneAt: null,
        notifiedDueAt: null,
      }),
    })
    expect(await row(NOTE)).toMatchObject({
      due_at: null,
      original_due_at: null,
      notified_due_at: null,
    })
  })

  it('a throw in the reminder step rolls back title, body and tags', async () => {
    await expect(
      repo.updateOwn(JORGE, NOTE, {
        title: 'half',
        body: 'half',
        tags: [{ slug: 'half', name: 'Half' }],
        reminder: () => {
          throw new Error('boom')
        },
      }),
    ).rejects.toThrow('boom')
    expect(await row(NOTE)).toMatchObject({ title: 'Original', body: 'old body' })
    expect(await slugsOf(NOTE)).toEqual(['client-a'])
    expect((await q(`select 1 from tags where slug = 'half'`)).rowCount).toBe(0)
  })

  it('does not move updated_at when nothing differs', async () => {
    const before = (await row(NOTE))!.updated_at
    await new Promise((resolve) => setTimeout(resolve, 20))
    await repo.updateOwn(JORGE, NOTE, { title: 'Original', body: 'old body' })
    expect((await row(NOTE))!.updated_at).toEqual(before)
    await repo.updateOwn(JORGE, NOTE, { title: 'Changed' })
    expect((await row(NOTE))!.updated_at.getTime()).toBeGreaterThan(before.getTime())
  })

  it('serialises two concurrent edits on the row lock: both land, none is lost', async () => {
    await Promise.all([
      repo.updateOwn(JORGE, NOTE, { title: 'From A' }),
      repo.updateOwn(JORGE, NOTE, { body: 'From B' }),
    ])
    expect(await row(NOTE)).toMatchObject({ title: 'From A', body: 'From B' })
  })

  it("C11 and RLS: Ana can neither update nor delete Jorge's note", async () => {
    expect(await repo.updateOwn(ANA, NOTE, { title: 'hijack' })).toBeNull()
    expect(await repo.deleteOwn(ANA, NOTE)).toBe(false)
    expect(await repo.updateOwn(JORGE, noteId(9999), { title: 'x' })).toBeNull()
    expect(await repo.deleteOwn(JORGE, noteId(9999))).toBe(false)
    expect(await row(NOTE)).toMatchObject({ title: 'Original' })
  })

  it('deleteOwn removes the note and cascades its tag links; the tag row and other notes stay', async () => {
    expect(await repo.deleteOwn(JORGE, NOTE)).toBe(true)
    expect(await row(NOTE)).toBeUndefined()
    expect((await q('select 1 from note_tags where note_id = $1', [NOTE])).rowCount).toBe(0)
    expect(await row(OTHER)).toMatchObject({ title: 'Hers' })
    expect(await repo.findOwn(JORGE, NOTE)).toBeNull()
    expect(await repo.deleteOwn(JORGE, NOTE)).toBe(false)
  })
})
