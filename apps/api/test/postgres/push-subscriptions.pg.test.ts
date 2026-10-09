import type { Kysely } from 'kysely'
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Identity } from '../../src/domain/identity'
import { asUser } from '../../src/infrastructure/db/as-user'
import { createDatabase, type Database } from '../../src/infrastructure/db/database'
import { PostgresPushSubscriptions } from '../../src/infrastructure/db/postgres-push-subscriptions'

/**
 * Real-Postgres proof of the user-side subscription statements (ADR-001 amendment, decision 16).
 * Runs only against a THROWAWAY database prepared with `standins.sql` and the migrations
 * (commands in its header):
 *
 *   ONTI_TEST_DATABASE_URL='postgresql://onti_check_api@/onti_s6_check?host=/tmp' npm run test -w @onti/api
 *
 * The connection is the owner role, like the API; reads and deletes as a user go through `asUser`
 * (`authenticated` plus the verified claims), so RLS applies. Not run in CI.
 */
const DB_URL = process.env.ONTI_TEST_DATABASE_URL

const ANA_ID = 'c0c0c0c0-6b6b-4b6b-8b6b-000000000001'
const JORGE_ID = 'c0c0c0c0-6b6b-4b6b-8b6b-000000000002'
const identity = (userId: string): Identity => ({
  userId,
  email: null,
  claims: { sub: userId, role: 'authenticated', aud: 'authenticated' },
})
const ANA = identity(ANA_ID)
const JORGE = identity(JORGE_ID)

const E = 'https://push.example.com/send/pg-swap'
const keys = { p256dh: 'p256-key', auth: 'auth-key' }

describe.skipIf(!DB_URL)('Postgres push subscription statements (real database)', () => {
  let pool: pg.Pool
  let db: Kysely<Database>
  let subscriptions: PostgresPushSubscriptions

  const q = async <T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<T[]> => (await pool.query<T>(text, params)).rows

  /** What the user sees through RLS. */
  const visibleTo = (who: Identity) =>
    asUser(db, who, (trx) =>
      trx.selectFrom('push_subscriptions').select(['user_id', 'endpoint']).execute(),
    )

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DB_URL, max: 2 })
    db = createDatabase(DB_URL!)
    subscriptions = new PostgresPushSubscriptions(db)
    await q('delete from auth.users where id = any($1)', [[ANA_ID, JORGE_ID]])
    await q('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [
      ANA_ID,
      'ana-s6b@example.test',
      JORGE_ID,
      'jorge-s6b@example.test',
    ])
  })

  beforeEach(async () => {
    await q('delete from push_subscriptions where user_id = any($1)', [[ANA_ID, JORGE_ID]])
  })

  afterAll(async () => {
    await q('delete from auth.users where id = any($1)', [[ANA_ID, JORGE_ID]])
    await db.destroy()
    await pool.end()
  })

  it('the one owner-role upsert moves the endpoint, resets failures and keeps one row', async () => {
    await subscriptions.subscribe(ANA_ID, { endpoint: E, ...keys, userAgent: 'Ana UA' })
    await q('update push_subscriptions set failure_count = 4 where endpoint = $1', [E])

    await subscriptions.subscribe(JORGE_ID, {
      endpoint: E,
      p256dh: 'new',
      auth: 'new',
      userAgent: null,
    })

    const rows = await q(
      'select user_id, p256dh, auth, user_agent, failure_count from push_subscriptions where endpoint = $1',
      [E],
    )
    expect(rows).toEqual([
      { user_id: JORGE_ID, p256dh: 'new', auth: 'new', user_agent: null, failure_count: 0 },
    ])
  })

  it('as authenticated, Jorge reads his row and Ana reads none', async () => {
    await subscriptions.subscribe(ANA_ID, { endpoint: E, ...keys, userAgent: null })
    await subscriptions.subscribe(JORGE_ID, { endpoint: E, ...keys, userAgent: null })

    expect(await visibleTo(JORGE)).toEqual([{ user_id: JORGE_ID, endpoint: E }])
    expect(await visibleTo(ANA)).toEqual([])
  })

  it("Ana cannot delete Jorge's row, through the adapter or through RLS directly", async () => {
    await subscriptions.subscribe(JORGE_ID, { endpoint: E, ...keys, userAgent: null })

    await subscriptions.unsubscribe(ANA, E)
    const direct = await asUser(db, ANA, (trx) =>
      trx.deleteFrom('push_subscriptions').where('endpoint', '=', E).executeTakeFirst(),
    )

    expect(direct.numDeletedRows).toBe(0n)
    expect(await visibleTo(JORGE)).toHaveLength(1)
  })

  it('unsubscribe deletes the caller row only, and an unknown endpoint is a no-op', async () => {
    await subscriptions.subscribe(JORGE_ID, { endpoint: E, ...keys, userAgent: null })
    await subscriptions.subscribe(JORGE_ID, { endpoint: `${E}-2`, ...keys, userAgent: null })

    await subscriptions.unsubscribe(JORGE, E)
    await subscriptions.unsubscribe(JORGE, 'https://push.example.com/never')

    expect(await visibleTo(JORGE)).toEqual([{ user_id: JORGE_ID, endpoint: `${E}-2` }])
  })
})
