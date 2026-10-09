import { markdownToPlainText } from '@onti/shared'

/** UTF-16 code units, the unit `z.string().max()` counts. */
const EXCERPT_MAX = 120
const WORD_CUT_WINDOW = 40
const ELLIPSIS = '…'

const isHighSurrogate = (unit: string): boolean => /[\uD800-\uDBFF]/.test(unit)

/**
 * A one-line plain-text preview of a note body: markdown markers stripped (R14), whitespace
 * collapsed, at most {@link EXCERPT_MAX} UTF-16 units including the `…`. A cut falls on the last space when one lies in the last
 * {@link WORD_CUT_WINDOW} units, and never between the halves of a surrogate pair.
 */
export function excerptOf(bodyHead: string): string {
  const text = markdownToPlainText(bodyHead).replace(/\s+/gu, ' ').trim()
  if (text.length <= EXCERPT_MAX) return text
  let kept = text.slice(0, EXCERPT_MAX - ELLIPSIS.length)
  if (isHighSurrogate(kept.slice(-1))) kept = kept.slice(0, -1)
  const space = kept.lastIndexOf(' ')
  if (space >= EXCERPT_MAX - WORD_CUT_WINDOW) kept = kept.slice(0, space)
  return `${kept.trimEnd()}${ELLIPSIS}`
}
