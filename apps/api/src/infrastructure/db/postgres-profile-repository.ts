import type { Kysely } from 'kysely'
import type { Profile, ProfileRepository } from '../../application/ports'
import type { Identity } from '../../domain/identity'
import { asUser } from './as-user'
import type { Database } from './database'

export class PostgresProfileRepository implements ProfileRepository {
  constructor(private readonly db: Kysely<Database>) {}

  findOwn(identity: Identity): Promise<Profile | null> {
    return asUser(this.db, identity, async (trx) => {
      const row = await trx
        .selectFrom('profiles')
        .select('timezone')
        .where('id', '=', identity.userId)
        .executeTakeFirst()
      return row ?? null
    })
  }

  /** One conditional statement, so "only while UTC" cannot race between two tabs (Decision 1). */
  setTimezoneIfDefault(identity: Identity, timezone: string): Promise<string | null> {
    return asUser(this.db, identity, async (trx) => {
      const updated = await trx
        .updateTable('profiles')
        .set({ timezone })
        .where('id', '=', identity.userId)
        .where('timezone', '=', 'UTC')
        .returning('timezone')
        .executeTakeFirst()
      if (updated) return updated.timezone

      const current = await trx
        .selectFrom('profiles')
        .select('timezone')
        .where('id', '=', identity.userId)
        .executeTakeFirst()
      return current?.timezone ?? null
    })
  }
}
