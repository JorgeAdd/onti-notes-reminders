/** R13/R14 · markdownToPlainText: the excerpt text, markers removed, raw HTML kept as text. */
import { describe, expect, it } from 'vitest'
import { markdownToPlainText } from '../src'

describe('markdownToPlainText', () => {
  it('strips emphasis and keeps link text (spec example)', () => {
    expect(markdownToPlainText('**Deploy** the [runbook](https://x.y) now')).toBe(
      'Deploy the runbook now',
    )
    expect(markdownToPlainText('**bold** and [link](https://x.y)')).toBe('bold and link')
  })

  it.each([
    ['__a__ *b* _c_ ~~d~~', 'a b c d'],
    ['snake_case_name stays', 'snake_case_name stays'],
    ['2 * 3 * 4', '2 * 3 * 4'],
    ['use `npm run x` here', 'use npm run x here'],
  ])('strips inline markers: %s', (input, expected) => {
    expect(markdownToPlainText(input)).toBe(expected)
  })

  it('strips heading, quote, bullet and ordered markers, one line per source line', () => {
    const md = '# Title\n## Sub\n> quoted\n- one\n* two\n+ three\n1. first\n2) second'
    expect(markdownToPlainText(md)).toBe('Title\nSub\nquoted\none\ntwo\nthree\nfirst\nsecond')
  })

  it('drops fence lines but keeps their content, and drops blank lines', () => {
    const md = 'before\n\n```ts\nconst a = 1\n```\n\nafter\n'
    expect(markdownToPlainText(md)).toBe('before\nconst a = 1\nafter')
    expect(markdownToPlainText('~~~\nx\n~~~')).toBe('x')
  })

  it('replaces an image with its alt text and a link with its text', () => {
    expect(markdownToPlainText('![diagram](https://x.y/a.png) and [a](b)')).toBe('diagram and a')
    expect(markdownToPlainText('![](https://x.y/a.png)')).toBe('')
  })

  it('keeps the text of a link cut by the 400-character head', () => {
    expect(markdownToPlainText('see [runbook](http://x.y/very/lo')).toBe('see runbook')
    expect(markdownToPlainText('see [runbook](')).toBe('see runbook')
  })

  it('turns an autolink into its url', () => {
    expect(markdownToPlainText('go to <https://x.y/z> now')).toBe('go to https://x.y/z now')
  })

  it('passes raw HTML through as text', () => {
    expect(markdownToPlainText('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>')
  })

  it('handles empty and blank input', () => {
    expect(markdownToPlainText('')).toBe('')
    expect(markdownToPlainText('  \n\t\n')).toBe('')
  })

  it('returns quickly on a 20000-character hostile input', () => {
    const hostile = [
      '['.repeat(20000),
      '*'.repeat(20000),
      '_a'.repeat(10000),
      '![['.repeat(6666),
      '`'.repeat(20000),
      `[${'a'.repeat(19990)}](`,
      '<'.repeat(20000),
      '> '.repeat(10000),
    ]
    const started = performance.now()
    for (const input of hostile) expect(typeof markdownToPlainText(input)).toBe('string')
    expect(performance.now() - started).toBeLessThan(1000)
  })
})
