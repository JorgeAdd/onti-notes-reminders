import { parseArgs as nodeParseArgs } from 'node:util'
import type { DesiredNote, DesiredTag, Scenario } from './demo-scenario'

/** What the target user already has for the seeded scope (read as that user, via RLS). */
export interface ExistingState {
  notes: {
    id: string
    title: string
    dueAt: Date | null
    doneAt: Date | null
    snoozeCount: number
    tagSlugs: string[]
    body: string
  }[]
  tags: { id: string; slug: string }[]
}

export interface SeedPlan {
  notes: { created: DesiredNote[]; updated: DesiredNote[]; unchanged: DesiredNote[] }
  tags: { created: DesiredTag[]; unchanged: DesiredTag[] }
  /** Tag id to link notes with: the user's own tag when the slug already exists. */
  tagIdBySlug: Record<string, string>
}

const sameInstant = (a: Date | null, b: Date | null) => a?.getTime() === b?.getTime()
const sameList = (a: string[], b: string[]) => [...a].sort().join() === [...b].sort().join()

/** Pure diff of the desired scenario against what exists; only seeded ids are considered. */
export function planSeed(existing: ExistingState, desired: Scenario): SeedPlan {
  const existingTags = new Map(existing.tags.map((t) => [t.slug, t.id]))
  const tags: SeedPlan['tags'] = { created: [], unchanged: [] }
  const tagIdBySlug: Record<string, string> = {}
  for (const tag of desired.tags) {
    const id = existingTags.get(tag.slug)
    tagIdBySlug[tag.slug] = id ?? tag.id
    if (id) tags.unchanged.push({ ...tag, id })
    else tags.created.push(tag)
  }

  const current = new Map(existing.notes.map((n) => [n.id, n]))
  const notes: SeedPlan['notes'] = { created: [], updated: [], unchanged: [] }
  for (const note of desired.notes) {
    const row = current.get(note.id)
    if (!row) notes.created.push(note)
    else if (
      row.title === note.title &&
      row.body === note.body &&
      sameInstant(row.dueAt, note.dueAt) &&
      sameInstant(row.doneAt, note.doneAt) &&
      row.snoozeCount === 0 &&
      sameList(row.tagSlugs, note.tagSlugs)
    )
      notes.unchanged.push(note)
    else notes.updated.push(note)
  }
  return { notes, tags, tagIdBySlug }
}

/** `--remove`: exactly the seeded ids that exist. The user's own tags are never selected. */
export function planRemove(existing: ExistingState, desired: Scenario) {
  const noteIds = new Set(existing.notes.map((n) => n.id))
  const tagIds = new Set(existing.tags.map((t) => t.id))
  return {
    noteIds: desired.notes.filter((n) => noteIds.has(n.id)).map((n) => n.id),
    tagIds: desired.tags.filter((t) => tagIds.has(t.id)).map((t) => t.id),
  }
}

/** The script writes only when `auth.users` resolves to exactly one user. */
export function pickSingleUser(
  rows: { id: string }[],
): { ok: true; userId: string } | { ok: false; error: string } {
  const [only] = rows
  if (rows.length === 1 && only) return { ok: true, userId: only.id }
  return { ok: false, error: `Expected exactly one user, found ${rows.length}. Nothing changed.` }
}

export interface CliArgs {
  email?: string
  userId?: string
  timezone?: string
  yes: boolean
  remove: boolean
}

const USAGE = `Usage: npm run seed:demo -w @onti/api -- (--email <email> | --user-id <uuid>)
       [--timezone <IANA>] [--remove] [--yes]
Dry run unless --yes. Reads DATABASE_URL from the environment.`

export function parseArgs(
  argv: string[],
): { ok: true; args: CliArgs } | { ok: false; error: string } {
  let values
  try {
    values = nodeParseArgs({
      args: argv,
      options: {
        email: { type: 'string' },
        'user-id': { type: 'string' },
        timezone: { type: 'string' },
        yes: { type: 'boolean', default: false },
        remove: { type: 'boolean', default: false },
      },
    }).values
  } catch (error) {
    return { ok: false, error: `${(error as Error).message}\n${USAGE}` }
  }
  const { email, 'user-id': userId, timezone, yes, remove } = values
  if (!email === !userId) {
    return { ok: false, error: `Pass exactly one of --email or --user-id.\n${USAGE}` }
  }
  if (timezone && !isTimezone(timezone)) {
    return { ok: false, error: `Unknown IANA timezone: ${timezone}\n${USAGE}` }
  }
  return {
    ok: true,
    args: {
      ...(email ? { email } : {}),
      ...(userId ? { userId } : {}),
      ...(timezone ? { timezone } : {}),
      yes: yes ?? false,
      remove: remove ?? false,
    },
  }
}

function isTimezone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

export interface ReportContext {
  target: string
  timezone: string
  anchor: Date
  applied: boolean
}

export function formatReport(plan: SeedPlan, ctx: ReportContext): string {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: ctx.timezone }).format(ctx.anchor)
  const { notes, tags } = plan
  return [
    ctx.applied ? 'Seed applied.' : 'DRY RUN: nothing was written. Re-run with --yes to apply.',
    `target: ${ctx.target}`,
    `timezone: ${ctx.timezone}`,
    `anchor (plays Wed 7): ${day}`,
    `notes: ${notes.created.length} created, ${notes.updated.length} updated, ${notes.unchanged.length} unchanged`,
    `tags: ${tags.created.length} created, ${tags.unchanged.length} unchanged`,
  ].join('\n')
}
