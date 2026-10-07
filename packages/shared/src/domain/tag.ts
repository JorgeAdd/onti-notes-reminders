export const TAG_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** "client-a" → "Client A" (R11). */
export function tagNameFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function filterByTag<T extends { tags: string[] }>(notes: T[], slug: string) {
  const matching = notes.filter((note) => note.tags.includes(slug))
  return { matching, hiddenCount: notes.length - matching.length }
}
