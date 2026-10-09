import type { Kysely } from 'kysely'
import type { PushSubscription, SubscriptionStore } from '../../application/push-ports'
import type { Database } from './database'

/**
 * The scheduler's side of `push_subscriptions`, as the owner role: it reads the subscriptions of
 * the owner of a claimed reminder and applies send outcomes. The user-facing writes arrive in
 * the subscription routes (ADR-001 amendment).
 */
export class PostgresPushSubscriptions implements SubscriptionStore {
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
}
