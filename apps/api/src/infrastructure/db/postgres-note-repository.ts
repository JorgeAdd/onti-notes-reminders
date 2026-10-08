import type { Reminder } from '@onti/shared'
import { sql, type Kysely } from 'kysely'
import type { NewNote, NoteListRow, NoteRepository } from '../../application/ports'
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

  createOwn(identity: Identity, input: NewNote): Promise<NoteRecord> {
    return asUser(this.db, identity, async (trx) => {
      // Sorted so two concurrent captures take tag row locks in the same order.
      const wanted = [...input.tags].sort((a, b) => a.slug.localeCompare(b.slug))

      // `do update set slug = tags.slug` is a no-op write that makes RETURNING yield the existing
      // row too, so a known slug keeps its stored name (e.g. "Client A") and gets reused.
      const tags =
        wanted.length === 0
          ? []
          : await trx
              .insertInto('tags')
              .values(wanted.map(({ slug, name }) => ({ user_id: identity.userId, slug, name })))
              .onConflict((conflict) =>
                conflict
                  .columns(['user_id', 'slug'])
                  .doUpdateSet({ slug: (eb) => eb.ref('tags.slug') }),
              )
              .returning(['id', 'name', 'slug'])
              .execute()

      const note = await trx
        .insertInto('notes')
        .values({
          user_id: identity.userId,
          title: input.title,
          due_at: input.dueAt,
          original_due_at: input.dueAt,
        })
        .returning([
          'id',
          'title',
          'due_at',
          'original_due_at',
          'snooze_count',
          'done_at',
          'notified_due_at',
        ])
        .executeTakeFirstOrThrow()

      if (tags.length > 0) {
        await trx
          .insertInto('note_tags')
          .values(
            tags.map((tag) => ({ user_id: identity.userId, note_id: note.id, tag_id: tag.id })),
          )
          .execute()
      }

      return {
        id: note.id,
        title: note.title,
        tags: tags
          .map(({ name, slug }) => ({ name, slug }))
          .sort((a, b) => a.slug.localeCompare(b.slug)),
        dueAt: note.due_at,
        originalDueAt: note.original_due_at,
        snoozeCount: note.snooze_count,
        doneAt: note.done_at,
        notifiedDueAt: note.notified_due_at,
      }
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

  async searchOwn(
    identity: Identity,
    query: { terms: string[]; limit: number; tag?: string },
  ): Promise<{ rows: NoteListRow[]; total: number }> {
    // Built before the transaction: a hostile term rejects without touching the database.
    const tsquery = tsqueryOf(query.terms)
    return await asUser(this.db, identity, async (trx) => {
      let select = trx
        .selectFrom('notes')
        .select([
          'id',
          'title',
          'due_at',
          'done_at',
          // Only the head: a 20 kB body is never shipped for a 120-unit excerpt.
          sql<string>`left(body, ${sql.lit(BODY_HEAD)})`.as('body_head'),
        ])
        .where('user_id', '=', identity.userId)
      if (tsquery !== null) {
        // The tsquery is a bound parameter, never part of the SQL text.
        select = select.where(sql<boolean>`search @@ to_tsquery('simple', ${tsquery})`)
      }
      if (query.tag !== undefined) {
        // Before the cap, or tagged notes older than the newest 50 would vanish. Both rows are the
        // caller's (explicit user_id on each side, RLS behind it); the slug is a bound parameter.
        const slug = query.tag
        select = select.where((eb) =>
          eb.exists(
            eb
              .selectFrom('note_tags')
              .innerJoin('tags', 'tags.id', 'note_tags.tag_id')
              .select('note_tags.note_id')
              .whereRef('note_tags.note_id', '=', 'notes.id')
              .where('note_tags.user_id', '=', identity.userId)
              .where('tags.user_id', '=', identity.userId)
              .where('tags.slug', '=', slug),
          ),
        )
      }
      const found = await select
        .orderBy('created_at', 'desc')
        .orderBy('id', 'desc')
        .limit(query.limit)
        .execute()

      const { total } = await trx
        .selectFrom('notes')
        .select(sql<string>`count(*)`.as('total'))
        .where('user_id', '=', identity.userId)
        .executeTakeFirstOrThrow()

      const ids = found.map((row) => row.id)
      const links =
        ids.length === 0
          ? []
          : await trx
              .selectFrom('note_tags')
              .innerJoin('tags', 'tags.id', 'note_tags.tag_id')
              .select(['note_tags.note_id', 'tags.name', 'tags.slug'])
              .where('note_tags.user_id', '=', identity.userId)
              .where('note_tags.note_id', 'in', ids)
              .orderBy('tags.slug')
              .execute()
      const tagsByNote = new Map<string, NoteListRow['tags']>()
      for (const link of links) {
        const tags = tagsByNote.get(link.note_id) ?? []
        tags.push({ name: link.name, slug: link.slug })
        tagsByNote.set(link.note_id, tags)
      }

      return {
        total: Number(total),
        rows: found.map((row) => ({
          id: row.id,
          title: row.title,
          bodyHead: row.body_head,
          tags: tagsByNote.get(row.id) ?? [],
          dueAt: row.due_at,
          doneAt: row.done_at,
        })),
      }
    })
  }
}

const BODY_HEAD = 400
const WORD = /^[\p{L}\p{N}]+$/u

/**
 * `'t1':* & 't2':*` for `to_tsquery('simple', $1)`, or null when there are no terms. The domain
 * already reduces input to letters and digits; every term is re-checked here (defense in depth) so
 * quotes, operators and `:` can never reach the tsquery even if a caller skips `searchTerms`.
 */
export function tsqueryOf(terms: string[]): string | null {
  for (const term of terms) {
    if (!WORD.test(term)) throw new Error('Search term is not a plain word')
  }
  return terms.length === 0 ? null : terms.map((term) => `'${term}':*`).join(' & ')
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
