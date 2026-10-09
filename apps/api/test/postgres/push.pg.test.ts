import { readFileSync } from 'node:fs'
import { isNotificationDue, type Reminder } from '@onti/shared'
import type { Kysely } from 'kysely'
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createDatabase, type Database } from '../../src/infrastructure/db/database'
import { PostgresPushSubscriptions } from '../../src/infrastructure/db/postgres-push-subscriptions'
import { PostgresReminderClaimer } from '../../src/infrastructure/db/postgres-reminder-claimer'

/**
 * Real-Postgres proof of the scheduler's statements (decisions 2, 9, 25). Runs only against a
 * THROWAWAY database prepared with `standins.sql` and the migrations (commands in its header):
 *
 *   ONTI_TEST_DATABASE_URL='postgresql://onti_check_api@/onti_s6_check?host=/tmp' npm run test -w @onti/api
 *
 * The connection is the owner role (bypasses RLS), like the scheduler. Not run in CI.
 */
const DB_URL = process.env.ONTI_TEST_DATABASE_URL

const ANA = 'c0c0c0c0-6a6a-4a6a-8a6a-000000000001'
const JORGE = 'c0c0c0c0-6a6a-4a6a-8a6a-000000000002'
const NO_PROFILE = 'c0c0c0c0-6a6a-4a6a-8a6a-000000000003'
const USERS = [ANA, JORGE, NO_PROFILE]
const nid = (n: number) => `66666666-6666-4666-8666-${String(n).padStart(12, '0')}`

/** Far before the other pg tests' data (October 2026), so their rows are never due at this instant. */
const NOW = new Date('2026-08-01T12:00:00.000Z')
const minutes = (delta: number) => new Date(NOW.getTime() + delta * 60_000)

const MIGRATION = new URL(
  '../../../../supabase/migrations/20261008180000_backfill_notified_due_at.sql',
  import.meta.url,
)

describe.skipIf(!DB_URL)('Postgres push scheduler statements (real database)', () => {
  let pool: pg.Pool
  let db: Kysely<Database>
  let claimer: PostgresReminderClaimer
  let subscriptions: PostgresPushSubscriptions

  const q = async <T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<T[]> => (await pool.query<T>(text, params)).rows

  const insertNote = (
    n: number,
    userId: string,
    due: Date | null,
    extra: { doneAt?: Date | null; notified?: Date | null; title?: string; body?: string } = {},
  ) =>
    q(
      `insert into notes (id, user_id, title, body, due_at, original_due_at, done_at, notified_due_at)
       values ($1, $2, $3, $4, $5, $5, $6, $7)`,
      [
        nid(n),
        userId,
        extra.title ?? `Note ${n}`,
        extra.body ?? '',
        due,
        extra.doneAt ?? null,
        extra.notified ?? null,
      ],
    )

  const notifiedAt = async (n: number) =>
    (
      await q<{ notified_due_at: Date | null }>('select notified_due_at from notes where id = $1', [
        nid(n),
      ])
    )[0]!.notified_due_at

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DB_URL, max: 4 })
    db = createDatabase(DB_URL!)
    claimer = new PostgresReminderClaimer(db)
    subscriptions = new PostgresPushSubscriptions(db)

    await q('delete from auth.users where id = any($1)', [USERS])
    for (const [id, email] of [
      [ANA, 'ana-s6@example.test'],
      [JORGE, 'jorge-s6@example.test'],
      [NO_PROFILE, 'noprofile-s6@example.test'],
    ]) {
      await q('insert into auth.users (id, email) values ($1, $2)', [id, email])
    }
    await q('delete from profiles where id = $1', [NO_PROFILE])
    await q(`update profiles set timezone = 'America/Mexico_City' where id = $1`, [JORGE])
  })

  beforeEach(async () => {
    await q('delete from notes where user_id = any($1)', [USERS])
    await q('delete from tags where user_id = any($1)', [USERS])
    await q('delete from push_subscriptions where user_id = any($1)', [USERS])
  })

  afterAll(async () => {
    await q('delete from auth.users where id = any($1)', [USERS])
    await db.destroy()
    await pool.end()
  })

  describe('claim', () => {
    it('two overlapping claims over 20 due notes are disjoint and complete', async () => {
      for (let n = 1; n <= 20; n += 1) await insertNote(n, ANA, minutes(-n))

      const [a, b] = await Promise.all([claimer.claimDue(NOW, 20), claimer.claimDue(NOW, 20)])
      const ids = [...a, ...b].map((r) => r.noteId)

      expect(new Set(ids).size).toBe(ids.length)
      expect([...ids].sort()).toEqual(Array.from({ length: 20 }, (_, i) => nid(i + 1)).sort())
    })

    it('claims the earliest first up to the limit, marks them, and the next claim takes the rest', async () => {
      for (let n = 1; n <= 20; n += 1) await insertNote(n, ANA, minutes(-100 + n))

      const first = await claimer.claimDue(NOW, 12)
      expect(first.map((r) => r.noteId)).toEqual(Array.from({ length: 12 }, (_, i) => nid(i + 1)))
      expect(await notifiedAt(1)).toEqual(minutes(-99))
      expect(await notifiedAt(13)).toBeNull()

      expect(await claimer.claimDue(NOW, 12)).toHaveLength(8)
      expect(await claimer.claimDue(NOW, 12)).toHaveLength(0)
    })

    it('agrees with isNotificationDue over the whole state matrix (R10)', async () => {
      const dues = [null, minutes(-30), NOW, minutes(30)]
      const dones = [null, minutes(-20)]
      const notifieds: ('none' | 'same' | 'older')[] = ['none', 'same', 'older']
      const cases: { n: number; reminder: Reminder }[] = []
      let n = 0
      for (const due of dues) {
        for (const done of due ? dones : [null]) {
          for (const notified of due ? notifieds : (['none'] as const)) {
            n += 1
            const notifiedDueAt =
              notified === 'none' ? null : notified === 'same' ? due : minutes(-600)
            await insertNote(n, ANA, due, { doneAt: done, notified: notifiedDueAt })
            cases.push({
              n,
              reminder: {
                dueAt: due,
                originalDueAt: due,
                snoozeCount: 0,
                doneAt: done,
                notifiedDueAt,
              },
            })
          }
        }
      }

      const claimed = new Set((await claimer.claimDue(NOW, 1000)).map((r) => r.noteId))
      const expected = cases.filter((c) => isNotificationDue(c.reminder, NOW))

      expect(expected.length).toBeGreaterThan(0)
      expect(expected.length).toBeLessThan(cases.length)
      expect(claimed).toEqual(new Set(expected.map((c) => nid(c.n))))
    })

    it('returns the zone, the tag names by slug and the body head, and marks notified_due_at', async () => {
      await insertNote(1, JORGE, minutes(-5), { title: 'Notify Ana', body: 'x'.repeat(3000) })
      for (const [slug, name] of [
        ['client-b', 'Client B'],
        ['client-a', 'Client A'],
      ] as const) {
        await q('insert into tags (user_id, slug, name) values ($1, $2, $3)', [JORGE, slug, name])
        await q(
          `insert into note_tags (user_id, note_id, tag_id)
           select $1, $2, id from tags where user_id = $1 and slug = $3`,
          [JORGE, nid(1), slug],
        )
      }

      const [claimed] = await claimer.claimDue(NOW, 10)

      expect(claimed).toEqual({
        noteId: nid(1),
        userId: JORGE,
        title: 'Notify Ana',
        body: 'x'.repeat(2000),
        dueAt: minutes(-5),
        timezone: 'America/Mexico_City',
        tagNames: ['Client A', 'Client B'],
      })
      expect(await notifiedAt(1)).toEqual(minutes(-5))
    })

    it('falls back to UTC without a profile and to no tags', async () => {
      await insertNote(1, NO_PROFILE, minutes(-5))
      const [claimed] = await claimer.claimDue(NOW, 10)
      expect(claimed!.timezone).toBe('UTC')
      expect(claimed!.tagNames).toEqual([])
    })

    it('re-arms after a snooze: a new due_at is claimed again, the same one is not', async () => {
      await insertNote(1, ANA, minutes(-5))
      expect(await claimer.claimDue(NOW, 10)).toHaveLength(1)
      expect(await claimer.claimDue(NOW, 10)).toHaveLength(0)

      await q('update notes set due_at = $2 where id = $1', [nid(1), minutes(60)])
      expect(await claimer.claimDue(minutes(59), 10)).toHaveLength(0)
      expect(await claimer.claimDue(minutes(60), 10)).toHaveLength(1)
    })
  })

  describe('backfill migration', () => {
    // The migration is global, so other pg files' notes may change too: assert only this user's rows.
    const run = async () => {
      await pool.query(readFileSync(MIGRATION, 'utf8'))
    }
    const anaRows = () =>
      q<{ id: string; due_at: Date | null; notified_due_at: Date | null }>(
        'select id, due_at, notified_due_at from notes where user_id = $1 order by id',
        [ANA],
      )

    it('marks only overdue open reminders, leaves due_at, and a second run is a no-op', async () => {
      await q(
        `insert into notes (id, user_id, title, due_at, original_due_at)
               values ($1, $3, 'overdue open', now() - interval '2 hours', now() - interval '2 hours'),
                      ($2, $3, 'future', now() + interval '2 hours', now() + interval '2 hours')`,
        [nid(1), nid(2), ANA],
      )
      await q(
        `insert into notes (id, user_id, title, due_at, original_due_at, done_at)
               values ($1, $2, 'overdue done', now() - interval '2 hours', now() - interval '2 hours', now() - interval '1 hour')`,
        [nid(3), ANA],
      )
      await q(`insert into notes (id, user_id, title) values ($1, $2, 'plain')`, [nid(4), ANA])

      const before = await anaRows()
      await run()

      const after = await anaRows()
      expect(after.map((r) => r.due_at)).toEqual(before.map((r) => r.due_at))
      expect(after.map((r) => r.notified_due_at !== null)).toEqual([true, false, false, false])
      expect(after[0]!.notified_due_at).toEqual(after[0]!.due_at)
      await run()
      expect(await anaRows()).toEqual(after)
    })
  })

  describe('subscriptions (scheduler side)', () => {
    const insertSub = (id: string, userId: string, failures = 0) =>
      q(
        `insert into push_subscriptions (id, user_id, endpoint, p256dh, auth, failure_count)
         values ($1, $2, $3, 'P', 'A', $4)`,
        [id, userId, `https://push.example.com/${id}`, failures],
      )
    const SUB_1 = '77777777-7777-4777-8777-000000000001'
    const SUB_2 = '77777777-7777-4777-8777-000000000002'
    const SUB_3 = '77777777-7777-4777-8777-000000000003'
    const failures = async (id: string) =>
      (
        await q<{ failure_count: number }>(
          'select failure_count from push_subscriptions where id = $1',
          [id],
        )
      )[0]?.failure_count

    it('lists only the user subscriptions with their keys', async () => {
      await insertSub(SUB_1, ANA)
      await insertSub(SUB_2, ANA)
      await insertSub(SUB_3, JORGE)

      const listed = await subscriptions.listForUser(ANA)
      expect(listed.map((s) => s.id).sort()).toEqual([SUB_1, SUB_2])
      expect(listed.find((s) => s.id === SUB_1)).toEqual({
        id: SUB_1,
        endpoint: `https://push.example.com/${SUB_1}`,
        p256dh: 'P',
        auth: 'A',
      })
    })

    it('counts consecutive failures and drops the row at the maximum', async () => {
      await insertSub(SUB_1, ANA)
      for (let i = 1; i <= 4; i += 1) {
        await subscriptions.registerFailure(SUB_1, 5)
        expect(await failures(SUB_1)).toBe(i)
      }
      await subscriptions.registerFailure(SUB_1, 5)
      expect(await failures(SUB_1)).toBeUndefined()
    })

    it('does not touch another subscription when one fails', async () => {
      await insertSub(SUB_1, ANA, 4)
      await insertSub(SUB_2, ANA, 4)
      await subscriptions.registerFailure(SUB_1, 5)
      expect(await failures(SUB_1)).toBeUndefined()
      expect(await failures(SUB_2)).toBe(4)
    })

    it('resets the count and stamps last_success_at on success', async () => {
      await insertSub(SUB_1, ANA, 3)
      await subscriptions.recordSuccess(SUB_1, NOW)
      const [row] = await q<{ failure_count: number; last_success_at: Date }>(
        'select failure_count, last_success_at from push_subscriptions where id = $1',
        [SUB_1],
      )
      expect(row).toEqual({ failure_count: 0, last_success_at: NOW })
    })

    it('removes a subscription', async () => {
      await insertSub(SUB_1, ANA)
      await insertSub(SUB_2, ANA)
      await subscriptions.remove(SUB_1)
      expect((await subscriptions.listForUser(ANA)).map((s) => s.id)).toEqual([SUB_2])
    })
  })
})
