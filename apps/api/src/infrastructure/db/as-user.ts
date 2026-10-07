import { sql, type Kysely, type Transaction } from 'kysely'
import type { Identity } from '../../domain/identity'
import type { Database } from './database'

/**
 * Runs `work` in a transaction as the `authenticated` role with the caller's
 * verified claims, so Postgres RLS applies to every query (ADR-001).
 */
export function asUser<T>(
  db: Kysely<Database>,
  identity: Identity,
  work: (trx: Transaction<Database>) => Promise<T>,
): Promise<T> {
  return db.transaction().execute(async (trx) => {
    await sql`set local role authenticated`.execute(trx)
    await sql`select set_config('request.jwt.claims', ${JSON.stringify(identity.claims)}, true)`.execute(
      trx,
    )
    return work(trx)
  })
}
