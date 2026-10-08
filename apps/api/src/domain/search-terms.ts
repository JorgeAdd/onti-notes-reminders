const MAX_TERMS = 8

/**
 * The plain words of a search query: NFC-normalized, lowercased, split on everything that is not a
 * letter or a digit, deduplicated, first {@link MAX_TERMS} kept. Quotes, operators and other
 * punctuation are separators, so no query syntax can come out of user input. An empty result means
 * "no search filter".
 */
export function searchTerms(q: string | undefined): string[] {
  if (q === undefined) return []
  const words = q
    .normalize('NFC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== '')
  return [...new Set(words)].slice(0, MAX_TERMS)
}
