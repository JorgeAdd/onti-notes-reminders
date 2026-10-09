import type { Kysely } from 'kysely'
import type {
  NewSubscription,
  PushSubscription,
  SubscriptionRepository,
  SubscriptionStore,
} from '../../application/push-ports'
import type { Identity } from '../../domain/identity'
import { asUser } from './as-user'
import type { Database } from './database'

/**
 * `push_subscriptions` in two roles. Scheduler side (owner role): reads the subscriptions of the
 * owner of a claimed reminder and applies send outcomes. User side: `subscribe` is the ONE
 * owner-role user statement (ADR-001 amendment, 2026-10-08); `unsubscribe` runs as the user.
 */
export class PostgresPushSubscriptions implements SubscriptionStore, SubscriptionRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async listForUser(userId: string): Promise<PushSubscription[]> {
    const rows = await this.db
      .selectFrom('push_subscriptions')
      .select(['id', 'endpoint', 'p256dh', 'auth'])
      .where('user_id', '=', userId)
      .execute()
    return rows
  }

  async recordSuccess(id: string, now: Date): Promise<void> {
    await this.db
      .updateTable('push_subscriptions')
      .set({ failure_count: 0, last_success_at: now })
      .where('id', '=', id)
      .execute()
  }

  /** Two statements in one transaction: a data-modifying CTE cannot update and delete one row. */
  async registerFailure(id: string, maxFailures: number): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      await trx
        .updateTable('push_subscriptions')
        .set((eb) => ({ failure_count: eb('failure_count', '+', 1) }))
        .where('id', '=', id)
        .execute()
      await trx
        .deleteFrom('push_subscriptions')
        .where('id', '=', id)
        .where('failure_count', '>=', maxFailures)
        .execute()
    })
  }

  async remove(id: string): Promise<void> {
    await this.db.deleteFrom('push_subscriptions').where('id', '=', id).execute()
  }

  /** One owner-role upsert on the endpoint; `userId` is the verified JWT subject, never a body field. */
  async subscribe(userId: string, input: NewSubscription): Promise<void> {
    const row = {
      user_id: userId,
      p256dh: input.p256dh,
      auth: input.auth,
      user_agent: input.userAgent,
      failure_count: 0,
    }
    await this.db
      .insertInto('push_subscriptions')
      .values({ endpoint: input.endpoint, ...row })
      .onConflict((conflict) => conflict.column('endpoint').doUpdateSet(row))
      .execute()
  }

  async unsubscribe(identity: Identity, endpoint: string): Promise<void> {
    await asUser(this.db, identity, (trx) =>
      trx
        .deleteFrom('push_subscriptions')
        .where('user_id', '=', identity.userId)
        .where('endpoint', '=', endpoint)
        .execute(),
    )
  }
}
