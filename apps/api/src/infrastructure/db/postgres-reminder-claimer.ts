import { sql, type Kysely } from 'kysely'
import type { ClaimedReminder, ReminderClaimer } from '../../application/push-ports'
import type { Database } from './database'

/** The notification only needs the head of the body (the payload keeps two lines). */
const BODY_HEAD = 2000

interface ClaimRow {
  id: string
  user_id: string
  title: string
  body: string
  due_at: Date
  timezone: string
  tag_names: string[]
}

/**
 * Claims due reminders as the owner role (the scheduler acts for no user, ADR-001): ONE statement
 * picks them under `FOR UPDATE SKIP LOCKED` and marks `notified_due_at := due_at` before anything
 * is sent (at-most-once). Autocommit, so the locks last one statement. `now` is a parameter: SQL
 * never reads the clock (rule 16). The predicate must equal `isNotificationDue`; the `[pg]` test
 * enforces it.
 */
export class PostgresReminderClaimer implements ReminderClaimer {
  constructor(private readonly db: Kysely<Database>) {}

  async claimDue(now: Date, limit: number): Promise<ClaimedReminder[]> {
    const { rows } = await sql<ClaimRow>`
      with due as (
        select n.id from notes n
        where n.due_at is not null and n.due_at <= ${now} and n.done_at is null
          and n.notified_due_at is distinct from n.due_at
        order by n.due_at, n.id
        limit ${limit}
        for update skip locked
      ), claimed as (
        update notes n set notified_due_at = n.due_at
        from due where n.id = due.id
        returning n.id, n.user_id, n.title, left(n.body, ${BODY_HEAD}) as body, n.due_at
      )
      select c.id, c.user_id, c.title, c.body, c.due_at,
             coalesce(p.timezone, 'UTC') as timezone,
             coalesce((select json_agg(t.name order by t.slug)
                       from note_tags nt join tags t on t.id = nt.tag_id
                       where nt.note_id = c.id), '[]'::json) as tag_names
      from claimed c left join profiles p on p.id = c.user_id
      order by c.due_at, c.id`.execute(this.db)

    return rows.map((row) => ({
      noteId: row.id,
      userId: row.user_id,
      title: row.title,
      body: row.body,
      dueAt: row.due_at,
      timezone: row.timezone,
      tagNames: row.tag_names,
    }))
  }
}
