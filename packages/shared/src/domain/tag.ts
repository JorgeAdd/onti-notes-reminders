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
