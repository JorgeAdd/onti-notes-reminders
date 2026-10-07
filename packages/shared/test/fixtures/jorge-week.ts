import { TZDate } from '@date-fns/tz'
import type { PageNote } from '../../src'

/** docs/product/scenario-dataset.md — Jorge's week. IDs never reach the UI. */
export const TZ = 'America/Mexico_City'

/** Local wall time in Mexico City → UTC instant. Format: 'YYYY-MM-DD HH:MM'. */
export function at(local: string): Date {
  const [date, time] = local.split(' ') as [string, string]
  const [y, mo, d] = date.split('-').map(Number) as [number, number, number]
  const [h, mi] = time.split(':').map(Number) as [number, number]
  return new Date(new TZDate(y, mo - 1, d, h, mi, TZ).getTime())
}

export interface FixtureNote extends PageNote {
  title: string
  tags: string[]
  body: string
  createdAt: Date
}

const CREATED = at('2026-10-01 10:00')

function note(
  id: string,
  title: string,
  tag: string,
  due: string | null,
  extra: Partial<FixtureNote> = {},
): FixtureNote {
  const dueAt = due ? at(due) : null
  return {
    id,
    title,
    tags: [tag],
    body: '',
    createdAt: CREATED,
    dueAt,
    originalDueAt: dueAt,
    snoozeCount: 0,
    doneAt: null,
    notifiedDueAt: null,
    ...extra,
  }
}

/** State before Moment 1 (N1 does not exist yet). */
export const BEFORE_CAPTURE: FixtureNote[] = [
  note('N2', 'Reply to Marta about the staging deploy window', 'client-a', '2026-10-06 18:00'),
  note('N3', 'Update the estimate for the onboarding epic', 'client-c', '2026-10-06 18:30'),
  note('N4', 'Standup: mention the flaky checkout e2e test', 'client-a', '2026-10-07 09:30'),
  note('N5', 'Send rate-limit numbers to the infra team', 'client-c', '2026-10-07 16:00'),
  note('N6', 'Prep demo of search filters for the review', 'client-b', '2026-10-08 15:00'),
  note('N7', 'API keys rotate every 90 days', 'client-b', null),
  note('N8', 'Staging URL and test accounts', 'client-b', null, {
    body: 'Staging: https://staging.client-b.example',
  }),
  note('N9', 'Review agenda: search, exports, roles', 'client-b', null),
  note('N10', 'Diego prefers async updates on Slack', 'client-b', null),
  note('N11', 'PR review checklist', 'client-a', null),
  note('N12', 'Domain glossary', 'client-c', null),
  note('N13', 'Shortcut cheat sheet for the team', 'personal', null),
  note('N14', 'Read: Postgres partial indexes', 'personal', null),
  note('N15', '1:1 with manager: topics', 'personal', null),
]

export const N1 = note(
  'N1',
  'Notify Ana: move repo permissions from me to Luis',
  'client-a',
  '2026-10-06 17:00',
  { createdAt: at('2026-10-06 11:12') },
)

export const byId = (notes: FixtureNote[], id: string) => {
  const found = notes.find((n) => n.id === id)
  if (!found) throw new Error(`No note ${id}`)
  return found
}

export const replace = (notes: FixtureNote[], next: FixtureNote) =>
  notes.map((n) => (n.id === next.id ? next : n))
