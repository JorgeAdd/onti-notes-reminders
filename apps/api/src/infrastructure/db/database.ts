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
  notes: {
    id: string
    user_id: string
    title: string
    due_at: Date | null
    original_due_at: Date | null
    snooze_count: number
    done_at: Date | null
    notified_due_at: Date | null
  }
  tags: {
    id: string
    user_id: string
    name: string
    slug: string
  }
  note_tags: {
    user_id: string
    note_id: string
    tag_id: string
  }
}

export function createDatabase(connectionString: string): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({ connectionString, max: 5 }),
    }),
  })
}
