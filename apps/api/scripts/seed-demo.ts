/**
 * Loads docs/product/scenario-dataset.md into ONE account (decisions 8-11).
 * Dry run unless --yes. Every read and write runs through `asUser` (RLS), so
 * other users' rows are physically out of reach. The `auth.users` lookup below
 * is the only owner-role query and lives only in this CLI.
 */
import { sql, type Kysely } from 'kysely'
import { pathToFileURL } from 'node:url'
import { resolveTimezone } from '../src/application/timezone'
import type { Identity } from '../src/domain/identity'
import { SystemClock } from '../src/infrastructure/clock/system-clock'
import { asUser } from '../src/infrastructure/db/as-user'
import { createDatabase, type Database } from '../src/infrastructure/db/database'
import { PostgresProfileRepository } from '../src/infrastructure/db/postgres-profile-repository'
import { buildScenario, type Scenario } from './demo-scenario'
import {
  formatReport,
  parseArgs,
  pickSingleUser,
  planRemove,
  planSeed,
  type CliArgs,
  type ExistingState,
  type SeedPlan,
} from './seed-plan'

async function resolveTarget(db: Kysely<Database>, args: CliArgs) {
  const { rows } = args.email
    ? await sql<{ id: string; email: string | null }>`
        select id, email from auth.users where lower(email) = lower(${args.email})`.execute(db)
    : await sql<{ id: string; email: string | null }>`
        select id, email from auth.users where id = ${args.userId ?? ''}::uuid`.execute(db)
  const picked = pickSingleUser(rows)
  if (!picked.ok) return picked
  const label = rows[0]?.email ?? picked.userId
  const identity: Identity = {
    userId: picked.userId,
    email: rows[0]?.email ?? null,
    claims: { sub: picked.userId, role: 'authenticated' },
  }
  return { ok: true as const, identity, label }
}

/** Only rows with seeded ids, plus the user's tags (slugs are unique per user). */
function readExisting(db: Kysely<Database>, identity: Identity, scenario: Scenario) {
  return asUser(db, identity, async (trx): Promise<ExistingState> => {
    const noteIds = scenario.notes.map((n) => n.id)
    const notes = await trx
      .selectFrom('notes')
      .select(['id', 'title', 'due_at', 'done_at', 'snooze_count'])
      .where('user_id', '=', identity.userId)
      .where('id', 'in', noteIds)
      .execute()
    const links = await trx
      .selectFrom('note_tags')
      .innerJoin('tags', 'tags.id', 'note_tags.tag_id')
      .select(['note_tags.note_id', 'tags.slug'])
      .where('note_tags.user_id', '=', identity.userId)
      .where('note_tags.note_id', 'in', noteIds)
      .execute()
    const tags = await trx
      .selectFrom('tags')
      .select(['id', 'slug'])
      .where('user_id', '=', identity.userId)
      .execute()
    return {
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        dueAt: n.due_at,
        doneAt: n.done_at,
        snoozeCount: n.snooze_count,
        tagSlugs: links.filter((l) => l.note_id === n.id).map((l) => l.slug),
      })),
      tags,
    }
  })
}

function writeSeed(
  db: Kysely<Database>,
  identity: Identity,
  plan: SeedPlan,
  timezone: string | undefined,
) {
  const userId = identity.userId
  const changed = [...plan.notes.created, ...plan.notes.updated]
  return asUser(db, identity, async (trx) => {
    if (timezone)
      await trx.updateTable('profiles').set({ timezone }).where('id', '=', userId).execute()
    if (plan.tags.created.length > 0) {
      await trx
        .insertInto('tags')
        .values(
          plan.tags.created.map((t) => ({ id: t.id, user_id: userId, name: t.name, slug: t.slug })),
        )
        .execute()
    }
    if (changed.length === 0) return
    await trx
      .insertInto('notes')
      .values(
        changed.map((n) => ({
          id: n.id,
          user_id: userId,
          title: n.title,
          due_at: n.dueAt,
          original_due_at: n.dueAt,
          snooze_count: 0,
          done_at: n.doneAt,
          notified_due_at: null,
        })),
      )
      .onConflict((oc) =>
        oc.column('id').doUpdateSet((eb) => ({
          title: eb.ref('excluded.title'),
          due_at: eb.ref('excluded.due_at'),
          original_due_at: eb.ref('excluded.original_due_at'),
          done_at: eb.ref('excluded.done_at'),
          snooze_count: 0,
          notified_due_at: null,
        })),
      )
      .execute()
    await trx
      .deleteFrom('note_tags')
      .where('user_id', '=', userId)
      .where(
        'note_id',
        'in',
        changed.map((n) => n.id),
      )
      .execute()
    await trx
      .insertInto('note_tags')
      .values(
        changed.flatMap((n) =>
          n.tagSlugs.map((slug) => ({
            user_id: userId,
            note_id: n.id,
            tag_id: plan.tagIdBySlug[slug] as string,
          })),
        ),
      )
      .execute()
  })
}

function writeRemove(
  db: Kysely<Database>,
  identity: Identity,
  removal: { noteIds: string[]; tagIds: string[] },
) {
  return asUser(db, identity, async (trx) => {
    if (removal.noteIds.length > 0) {
      await trx
        .deleteFrom('notes')
        .where('user_id', '=', identity.userId)
        .where('id', 'in', removal.noteIds)
        .execute()
    }
    if (removal.tagIds.length > 0) {
      // Seeded tags only, and only once no other note of the user still uses them.
      await trx
        .deleteFrom('tags')
        .where('user_id', '=', identity.userId)
        .where('id', 'in', removal.tagIds)
        .where((eb) =>
          eb.not(
            eb.exists(
              eb
                .selectFrom('note_tags')
                .select('note_id')
                .whereRef('note_tags.tag_id', '=', 'tags.id'),
            ),
          ),
        )
        .execute()
    }
  })
}

export async function main(argv: string[], env: NodeJS.ProcessEnv): Promise<number> {
  const parsed = parseArgs(argv)
  if (!parsed.ok) {
    console.error(parsed.error)
    return 2
  }
  const { args } = parsed
  if (!env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.')
    return 2
  }

  const db = createDatabase(env.DATABASE_URL)
  try {
    const target = await resolveTarget(db, args)
    if (!target.ok) {
      console.error(target.error)
      return 1
    }
    const { identity, label } = target
    const now = new SystemClock().now()
    const profile = await new PostgresProfileRepository(db).findOwn(identity)
    const timezone = args.timezone ?? resolveTimezone(profile)
    if (timezone === 'UTC') {
      console.warn('Warning: timezone is UTC, so "today" is the UTC day. Pass --timezone <IANA>.')
    }
    const scenario = buildScenario(identity.userId, now, timezone)
    const existing = await readExisting(db, identity, scenario)

    if (args.remove) {
      const removal = planRemove(existing, scenario)
      if (args.yes) await writeRemove(db, identity, removal)
      console.log(
        `${args.yes ? 'Removed' : 'DRY RUN: would remove'} ${removal.noteIds.length} notes and ${removal.tagIds.length} tags for ${label}.`,
      )
      return 0
    }

    const plan = planSeed(existing, scenario)
    if (args.yes) await writeSeed(db, identity, plan, args.timezone)
    console.log(formatReport(plan, { target: label, timezone, anchor: now, applied: args.yes }))
    return 0
  } catch (error) {
    console.error(`Seed failed: ${error instanceof Error ? error.message : 'unknown error'}`)
    return 1
  } finally {
    await db.destroy()
  }
}

// Never runs on import (tests, tooling).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2), process.env)
}
