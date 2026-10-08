import type { Reminder } from '@onti/shared'
import type { Kysely } from 'kysely'
import type { NoteRepository } from '../../application/ports'
import type { Identity } from '../../domain/identity'
import type { NoteRecord } from '../../domain/note'
import { asUser } from './as-user'
import type { Database } from './database'

export class PostgresNoteRepository implements NoteRepository {
  constructor(private readonly db: Kysely<Database>) {}

  listOwn(identity: Identity): Promise<NoteRecord[]> {
    return asUser(this.db, identity, async (trx) => {
      const notes = await trx
        .selectFrom('notes')
        .select([
          'id',
          'title',
          'due_at',
          'original_due_at',
          'snooze_count',
          'done_at',
          'notified_due_at',
        ])
        .where('user_id', '=', identity.userId)
        .execute()

      const links = await trx
        .selectFrom('note_tags')
        .innerJoin('tags', 'tags.id', 'note_tags.tag_id')
        .select(['note_tags.note_id', 'tags.name', 'tags.slug'])
        .where('note_tags.user_id', '=', identity.userId)
        .orderBy('tags.slug')
        .execute()

      const tagsByNote = new Map<string, NoteRecord['tags']>()
      for (const link of links) {
        const tags = tagsByNote.get(link.note_id) ?? []
        tags.push({ name: link.name, slug: link.slug })
        tagsByNote.set(link.note_id, tags)
      }

      return notes.map((row) => ({
        id: row.id,
        title: row.title,
        tags: tagsByNote.get(row.id) ?? [],
        dueAt: row.due_at,
        originalDueAt: row.original_due_at,
        snoozeCount: row.snooze_count,
        doneAt: row.done_at,
        notifiedDueAt: row.notified_due_at,
      }))
    })
  }

  mutateReminder(
    identity: Identity,
    id: string,
    decide: (reminder: Reminder) => Reminder,
  ): Promise<NoteRecord | null> {
    return asUser(this.db, identity, async (trx) => {
      // `for update` serialises concurrent actions on one note, so no snooze count is lost.
      const row = await trx
        .selectFrom('notes')
        .select([
          'id',
          'title',
          'due_at',
          'original_due_at',
          'snooze_count',
          'done_at',
          'notified_due_at',
        ])
        .where('id', '=', id)
        .where('user_id', '=', identity.userId)
        .forUpdate()
        .executeTakeFirst()
      if (!row) return null

      const current: Reminder = {
        dueAt: row.due_at,
        originalDueAt: row.original_due_at,
        snoozeCount: row.snooze_count,
        doneAt: row.done_at,
        notifiedDueAt: row.notified_due_at,
      }
      // Anything `decide` throws rolls the transaction back and reaches the caller.
      const next = decide(current)

      if (!sameReminder(current, next)) {
        await trx
          .updateTable('notes')
          .set({
            due_at: next.dueAt,
            original_due_at: next.originalDueAt,
            snooze_count: next.snoozeCount,
            done_at: next.doneAt,
            notified_due_at: next.notifiedDueAt,
          })
          .where('id', '=', id)
          .where('user_id', '=', identity.userId)
          .execute()
      }

      const tags = await trx
        .selectFrom('note_tags')
        .innerJoin('tags', 'tags.id', 'note_tags.tag_id')
        .select(['tags.name', 'tags.slug'])
        .where('note_tags.note_id', '=', id)
        .where('note_tags.user_id', '=', identity.userId)
        .orderBy('tags.slug')
        .execute()

      return { id: row.id, title: row.title, tags, ...next }
    })
  }
}

const sameInstant = (a: Date | null, b: Date | null) => a?.getTime() === b?.getTime()

function sameReminder(a: Reminder, b: Reminder): boolean {
  return (
    sameInstant(a.dueAt, b.dueAt) &&
    sameInstant(a.originalDueAt, b.originalDueAt) &&
    a.snoozeCount === b.snoozeCount &&
    sameInstant(a.doneAt, b.doneAt) &&
    sameInstant(a.notifiedDueAt, b.notifiedDueAt)
  )
}
