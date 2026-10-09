import { TAG_SLUG, tagNameFromSlug } from './tag'
import { localTimeOn, truncateToMinute } from './time'

export interface CaptureResult {
  title: string
  tags: { slug: string; name: string }[]
  dueAt: Date | null
}

const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/
const RELATIVE = /^\+(\d{1,3})(h|m)$/i

/** The time expression starting at `tokens[i]` and how many tokens it uses, or null. */
function matchDue(
  tokens: string[],
  i: number,
  now: Date,
  timeZone: string,
): { dueAt: Date; used: number } | null {
  const token = tokens[i] as string
  const lower = token.toLowerCase()
  const next = tokens[i + 1]

  if ((lower === 'today' || lower === 'tomorrow') && next !== undefined && TIME.test(next)) {
    const [h, m] = next.split(':').map(Number) as [number, number]
    return { dueAt: localTimeOn(now, timeZone, lower === 'today' ? 0 : 1, h, m), used: 2 }
  }
  const time = TIME.exec(token)
  if (time) {
    const h = Number(time[1])
    const m = Number(time[2])
    const todayAt = localTimeOn(now, timeZone, 0, h, m)
    return { dueAt: todayAt > now ? todayAt : localTimeOn(now, timeZone, 1, h, m), used: 1 }
  }
  const relative = RELATIVE.exec(token)
  if (relative) {
    const amount = Number(relative[1])
    const unit = relative[2]?.toLowerCase() === 'h' ? 3_600_000 : 60_000
    return { dueAt: new Date(truncateToMinute(now).getTime() + amount * unit), used: 1 }
  }
  return null
}

/**
 * R11 · the time grammar of the command bar for a single field (the note edit form): the first
 * time expression in `input` as an instant, or null. Other words and tags are ignored.
 */
export function readDue(input: string, now: Date, timeZone: string): Date | null {
  const tokens = input.trim().split(/\s+/).filter(Boolean)
  for (let i = 0; i < tokens.length; i++) {
    const due = matchDue(tokens, i, now, timeZone)
    if (due) return due.dueAt
  }
  return null
}

/**
 * R11 · parses the command bar. `#slug` → tag; `HH:MM` → next occurrence;
 * `today HH:MM`, `tomorrow HH:MM`, `+Nh`, `+Nm`. The first time expression
 * wins; the rest of the text is the title.
 */
export function parseCapture(input: string, now: Date, timeZone: string): CaptureResult {
  const tokens = input.trim().split(/\s+/).filter(Boolean)
  const titleTokens: string[] = []
  const tags = new Map<string, { slug: string; name: string }>()
  let dueAt: Date | null = null

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] as string
    const lower = token.toLowerCase()

    if (lower.startsWith('#') && TAG_SLUG.test(lower.slice(1))) {
      const slug = lower.slice(1)
      tags.set(slug, { slug, name: tagNameFromSlug(slug) })
      continue
    }

    if (dueAt === null) {
      const due = matchDue(tokens, i, now, timeZone)
      if (due) {
        dueAt = due.dueAt
        i += due.used - 1
        continue
      }
    }

    titleTokens.push(token)
  }

  return { title: titleTokens.join(' '), tags: [...tags.values()], dueAt }
}
