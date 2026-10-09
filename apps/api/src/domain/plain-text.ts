/**
 * Minimal markdown to plain text, enough for a notification body. Not a markdown parser: it strips
 * the markers people actually type. When slice 4's shared helper is merged, swap the import in
 * `application/push-payload.ts` and delete this file and its test.
 */

const FENCE = /^\s*(```|~~~)/

function stripLine(line: string): string {
  return line
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/, '')
    .replace(/^(\s*>)+\s?/, '')
    .replace(/^\s*([-*+]|\d+[.)])\s+/, '')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(?<![\w*])\*(?!\s)(.+?)\*(?![\w*])/g, '$1')
    .replace(/(?<!\w)_(?!\s)(.+?)_(?!\w)/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^[-*_]{3,}$/, '')
    .replace(/^[*_]+$/, '')
    .trim()
}

/** The plain lines of a markdown text: fence markers and lines empty after stripping are dropped. */
export function stripMarkdown(markdown: string): string[] {
  return markdown
    .split('\n')
    .filter((line) => !FENCE.test(line))
    .map(stripLine)
    .filter((line) => line !== '')
}

/** The first `count` plain lines joined by `\n`, cut to `maxCodePoints` (the last one is `…`). */
export function firstLines(markdown: string, count: number, maxCodePoints: number): string {
  const text = stripMarkdown(markdown).slice(0, count).join('\n')
  const points = Array.from(text)
  return points.length <= maxCodePoints ? text : `${points.slice(0, maxCodePoints - 1).join('')}…`
}
