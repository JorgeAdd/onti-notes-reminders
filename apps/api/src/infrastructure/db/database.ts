import { Kysely, PostgresDialect, type ColumnType } from 'kysely'
import pg from 'pg'

/** Columns read by the API so far. Source of truth: supabase/migrations/. */
export interface Database {
  profiles: {
    id: string
    timezone: string
    created_at: ColumnType<Date, never, never>
    updated_at: ColumnType<Date, never, never>
  }
}

export function createDatabase(connectionString: string): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({ connectionString, max: 5 }),
    }),
  })
}
