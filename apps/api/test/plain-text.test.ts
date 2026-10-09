import { describe, expect, it } from 'vitest'
import { firstLines, stripMarkdown } from '../src/domain/plain-text'

describe('stripMarkdown', () => {
  it.each([
    ['bold with stars', 'move **admin** rights', ['move admin rights']],
    ['bold with underscores', 'move __admin__ rights', ['move admin rights']],
    ['italic with stars', 'keep *maintainer* role', ['keep maintainer role']],
    ['italic with underscores', 'keep _maintainer_ role', ['keep maintainer role']],
    ['underscores inside a word', 'set snake_case_name now', ['set snake_case_name now']],
    ['strikethrough', 'was ~~late~~ on time', ['was late on time']],
    ['inline code', 'in `client-a/web` repo', ['in client-a/web repo']],
    ['a link', 'see [the docs](https://example.com/x) now', ['see the docs now']],
    ['an image', 'look ![diagram](https://example.com/d.png) here', ['look diagram here']],
    ['a heading', '## Plan for Friday', ['Plan for Friday']],
    ['a dash list item', '- Repo settings', ['Repo settings']],
    ['a numbered list item', '2. Second step', ['Second step']],
    ['a quote', '> remember this', ['remember this']],
    ['a nested quote', '>> remember this', ['remember this']],
  ])('strips %s', (_label, input, expected) => {
    expect(stripMarkdown(input)).toEqual(expected)
  })

  it('drops fence marker lines and keeps the code between them', () => {
    const input = ['Before', '```ts', 'const a = 1', '```', 'After'].join('\n')
    expect(stripMarkdown(input)).toEqual(['Before', 'const a = 1', 'After'])
  })

  it('drops lines that are empty after stripping', () => {
    const input = ['first', '', '   ', '---', '**', 'second'].join('\n')
    expect(stripMarkdown(input)).toEqual(['first', 'second'])
  })

  it('returns nothing for an empty body', () => {
    expect(stripMarkdown('')).toEqual([])
  })
})

describe('firstLines', () => {
  it('keeps only the first two lines of three', () => {
    expect(firstLines('one\ntwo\nthree', 2, 120)).toBe('one\ntwo')
  })

  it('skips blank lines before counting', () => {
    expect(firstLines('\n\none\n\n\ntwo\nthree', 2, 120)).toBe('one\ntwo')
  })

  it('cuts to the limit in code points with an ellipsis', () => {
    const out = firstLines('x'.repeat(300), 2, 120)
    expect(Array.from(out)).toHaveLength(120)
    expect(out).toBe(`${'x'.repeat(119)}…`)
  })

  it('counts an emoji as one character', () => {
    const out = firstLines('😀'.repeat(130), 2, 120)
    expect(Array.from(out)).toHaveLength(120)
    expect(out.endsWith('…')).toBe(true)
  })

  it('leaves text of exactly the limit untouched', () => {
    expect(firstLines('y'.repeat(120), 2, 120)).toBe('y'.repeat(120))
  })

  it('is empty for a body with no text', () => {
    expect(firstLines('```\n```', 2, 120)).toBe('')
  })
})
