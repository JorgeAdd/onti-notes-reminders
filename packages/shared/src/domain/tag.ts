import { CAPTURE_LIMITS } from '../timezone'

export const TAG_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** "client-a" → "Client A" (R11). */
export function tagNameFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const slugOf = (tag: string | { slug: string }) => (typeof tag === 'string' ? tag : tag.slug)

/** R12 · accepts slug strings and `{ slug }` objects (the stored note shape). */
export function filterByTag<T extends { tags: (string | { slug: string })[] }>(
  notes: T[],
  slug: string,
) {
  const matching = notes.filter((note) => note.tags.some((tag) => slugOf(tag) === slug))
  return { matching, hiddenCount: notes.length - matching.length }
}

export type TagListResult = { slugs: string[] } | { error: 'invalid' | 'tooMany' }

/**
 * R11 · reads the edit form's tags field: whitespace-separated slugs, `#` optional, lowercased,
 * duplicates collapsed, at most `tagsMax` distinct. Any bad token blocks (`invalid`, reported
 * before `tooMany`).
 */
export function parseTagList(text: string): TagListResult {
  const tokens = text.split(/\s+/).filter(Boolean)
  const slugs = new Set<string>()
  for (const token of tokens) {
    const slug = (token.startsWith('#') ? token.slice(1) : token).toLowerCase()
    if (slug.length > CAPTURE_LIMITS.slugMax || !TAG_SLUG.test(slug)) return { error: 'invalid' }
    slugs.add(slug)
  }
  if (slugs.size > CAPTURE_LIMITS.tagsMax) return { error: 'tooMany' }
  return { slugs: [...slugs] }
}
