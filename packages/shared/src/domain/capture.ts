import { TAG_SLUG, tagNameFromSlug } from './tag'
import { localTimeOn, truncateToMinute } from './time'

export interface CaptureResult {
  title: string
  tags: { slug: string; name: string }[]
  dueAt: Date | null
}

const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/
const RELATIVE = /^\+(\d{1,3})(h|m)$/i

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
    const next = tokens[i + 1]

    if (lower.startsWith('#') && TAG_SLUG.test(lower.slice(1))) {
      const slug = lower.slice(1)
      tags.set(slug, { slug, name: tagNameFromSlug(slug) })
      continue
    }

    if (dueAt === null) {
      if ((lower === 'today' || lower === 'tomorrow') && next !== undefined && TIME.test(next)) {
        const [h, m] = next.split(':').map(Number) as [number, number]
        dueAt = localTimeOn(now, timeZone, lower === 'today' ? 0 : 1, h, m)
        i++
        continue
      }
      const time = TIME.exec(token)
      if (time) {
        const h = Number(time[1])
        const m = Number(time[2])
        const todayAt = localTimeOn(now, timeZone, 0, h, m)
        dueAt = todayAt > now ? todayAt : localTimeOn(now, timeZone, 1, h, m)
        continue
      }
      const relative = RELATIVE.exec(token)
      if (relative) {
        const amount = Number(relative[1])
        const unit = relative[2]?.toLowerCase() === 'h' ? 3_600_000 : 60_000
        dueAt = new Date(truncateToMinute(now).getTime() + amount * unit)
        continue
      }
    }

    titleTokens.push(token)
  }

  return { title: titleTokens.join(' '), tags: [...tags.values()], dueAt }
}
