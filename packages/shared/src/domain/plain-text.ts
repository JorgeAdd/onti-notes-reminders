/**
 * Markdown to plain text for excerpts (R13, R14): a pure, line-based helper with linear regexes
 * (no nested quantifiers), so a hostile body of 20 000 characters returns at once. It is not a
 * markdown parser; it removes the markers a note author types and keeps everything else, raw
 * HTML included, as text. Output: one `\n` per kept source line, blank lines dropped.
 */

const FENCE = /^\s*(?:```|~~~)/u
const BLOCK_MARKERS = /^\s*(?:>\s?)*\s*(?:#{1,6}\s+|[-*+]\s+|\d{1,9}[.)]\s+)?/u
const IMAGE = /!\[([^[\]]*)\]\([^)]*\)?/gu
const LINK = /\[([^[\]]*)\]\([^)]*\)?/gu
const AUTOLINK = /<((?:https?|mailto):[^\s<>]+)>/gu
const CODE_TICKS = /`+/gu
const BOLD = /\*\*(?=\S)|(?<=\S)\*\*|~~(?=\S)|(?<=\S)~~|(?<!\w)__(?=\S)|(?<=\S)__(?!\w)/gu
const ITALIC =
  /(?<![\w*])\*(?=[^\s*])|(?<=[^\s*])\*(?![\w*])|(?<!\w)_(?=[^\s_])|(?<=[^\s_])_(?!\w)/gu

function stripLine(line: string): string {
  return line
    .replace(BLOCK_MARKERS, '')
    .replace(IMAGE, '$1')
    .replace(LINK, '$1')
    .replace(AUTOLINK, '$1')
    .replace(CODE_TICKS, '')
    .replace(BOLD, '')
    .replace(ITALIC, '')
    .trim()
}

export function markdownToPlainText(markdown: string): string {
  const kept: string[] = []
  let inFence = false
  for (const line of markdown.split(/\r?\n/u)) {
    if (FENCE.test(line)) {
      inFence = !inFence
      continue
    }
    const text = inFence ? line.trim() : stripLine(line)
    if (text !== '') kept.push(text)
  }
  return kept.join('\n')
}
