import { createHash } from 'node:crypto'
import { localTimeOn, tagNameFromSlug } from '@onti/shared'

/** docs/product/scenario-dataset.md as data. Day offsets: Tue = -1, Wed = 0, Thu = +1. */
interface ScenarioNote {
  key: string
  title: string
  tag: string
  due: { day: number; hours: number; minutes: number } | null
  /** Done at the due time (N1 only). */
  done?: boolean
  /** Markdown body, verbatim from the dataset. Only N1 and N8 have one; none is invented. */
  body?: string
}

const due = (day: number, hours: number, minutes: number) => ({ day, hours, minutes })

/** docs/product/scenario-dataset.md, "Body examples". */
const N1_BODY = [
  'Ana needs to move **admin** permissions on `client-a/web` from me to Luis',
  "before Friday's release.",
  '',
  '- Repo settings → Collaborators',
  '- Keep me as _maintainer_ until the handoff',
].join('\n')

const N8_BODY = [
  'Staging: https://staging.client-b.example',
  '',
  '- `qa-admin` / see 1Password',
  '- `qa-viewer` / see 1Password',
].join('\n')

const SCENARIO: ScenarioNote[] = [
  {
    key: 'N1',
    title: 'Notify Ana: move repo permissions from me to Luis',
    tag: 'client-a',
    due: due(-1, 17, 0),
    done: true,
    body: N1_BODY,
  },
  {
    key: 'N2',
    title: 'Reply to Marta about the staging deploy window',
    tag: 'client-a',
    due: due(-1, 18, 0),
  },
  {
    key: 'N3',
    title: 'Update the estimate for the onboarding epic',
    tag: 'client-c',
    due: due(-1, 18, 30),
  },
  {
    key: 'N4',
    title: 'Standup: mention the flaky checkout e2e test',
    tag: 'client-a',
    due: due(0, 9, 30),
  },
  {
    key: 'N5',
    title: 'Send rate-limit numbers to the infra team',
    tag: 'client-c',
    due: due(0, 16, 0),
  },
  {
    key: 'N6',
    title: 'Prep demo of search filters for the review',
    tag: 'client-b',
    due: due(1, 15, 0),
  },
  { key: 'N7', title: 'API keys rotate every 90 days', tag: 'client-b', due: null },
  {
    key: 'N8',
    title: 'Staging URL and test accounts',
    tag: 'client-b',
    due: null,
    body: N8_BODY,
  },
  { key: 'N9', title: 'Review agenda: search, exports, roles', tag: 'client-b', due: null },
  { key: 'N10', title: 'Diego prefers async updates on Slack', tag: 'client-b', due: null },
  { key: 'N11', title: 'PR review checklist', tag: 'client-a', due: null },
  { key: 'N12', title: 'Domain glossary', tag: 'client-c', due: null },
  { key: 'N13', title: 'Shortcut cheat sheet for the team', tag: 'personal', due: null },
  { key: 'N14', title: 'Read: Postgres partial indexes', tag: 'personal', due: null },
  { key: 'N15', title: '1:1 with manager: topics', tag: 'personal', due: null },
]

export interface DesiredNote {
  /** Scenario key (N1..N15). Never shown in the UI (CLAUDE.md rule 13). */
  key: string
  id: string
  title: string
  tagSlugs: string[]
  dueAt: Date | null
  doneAt: Date | null
  /** Empty for the notes the dataset gives no body. */
  body: string
}

export interface DesiredTag {
  id: string
  slug: string
  name: string
}

export interface Scenario {
  notes: DesiredNote[]
  tags: DesiredTag[]
}

/** Fixed namespace for the demo seed; changing it orphans previously seeded rows. */
const NAMESPACE = '6f1a1e0e-5d0c-4f0e-9a52-0d3b5f7c9e11'

/** RFC 4122 UUIDv5 of (user id, scenario key): stable across runs and users. */
export function seedId(userId: string, key: string): string {
  const namespace = Buffer.from(NAMESPACE.replaceAll('-', ''), 'hex')
  const hash = createHash('sha1').update(namespace).update(`${userId}:${key}`).digest()
  hash[6] = (hash[6]! & 0x0f) | 0x50
  hash[8] = (hash[8]! & 0x3f) | 0x80
  const hex = hash.subarray(0, 16).toString('hex')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}

/** The 15 notes placed so the local day of `now` in `timeZone` plays Wed 7 (decision 11). */
export function buildScenario(userId: string, now: Date, timeZone: string): Scenario {
  const notes = SCENARIO.map((n): DesiredNote => {
    const dueAt = n.due ? localTimeOn(now, timeZone, n.due.day, n.due.hours, n.due.minutes) : null
    return {
      key: n.key,
      id: seedId(userId, n.key),
      title: n.title,
      tagSlugs: [n.tag],
      dueAt,
      doneAt: n.done ? dueAt : null,
      body: n.body ?? '',
    }
  })
  const slugs = [...new Set(SCENARIO.map((n) => n.tag))]
  const tags = slugs.map((slug) => ({
    id: seedId(userId, `tag:${slug}`),
    slug,
    name: tagNameFromSlug(slug),
  }))
  return { notes, tags }
}
