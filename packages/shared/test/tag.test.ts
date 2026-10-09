/** R12 · filterByTag accepts string tags and {slug} tag objects. */
import { describe, expect, it } from 'vitest'
import { filterByTag, parseTagList } from '../src'

describe('filterByTag', () => {
  it('keeps the string form working', () => {
    const notes = [
      { id: 'a', tags: ['client-b'] },
      { id: 'b', tags: ['client-a', 'client-b'] },
      { id: 'c', tags: [] as string[] },
    ]
    const { matching, hiddenCount } = filterByTag(notes, 'client-b')
    expect(matching.map((n) => n.id)).toEqual(['a', 'b'])
    expect(hiddenCount).toBe(1)
  })

  it('matches by slug on {slug, name} objects (NoteRecord shape)', () => {
    const notes = [
      { id: 'a', tags: [{ slug: 'client-b', name: 'Client B' }] },
      { id: 'b', tags: [{ slug: 'client-a', name: 'Client A' }] },
      { id: 'c', tags: [] as { slug: string; name: string }[] },
      {
        id: 'd',
        tags: [
          { slug: 'client-a', name: 'Client A' },
          { slug: 'client-b', name: 'Client B' },
        ],
      },
    ]
    const { matching, hiddenCount } = filterByTag(notes, 'client-b')
    expect(matching.map((n) => n.id)).toEqual(['a', 'd'])
    expect(hiddenCount).toBe(2)
  })

  it('no match hides everything', () => {
    const { matching, hiddenCount } = filterByTag([{ id: 'a', tags: ['x'] }], 'y')
    expect(matching).toEqual([])
    expect(hiddenCount).toBe(1)
  })
})

describe('parseTagList (edit form tags field, R11 grammar)', () => {
  it('reads #slug tokens with the # optional, in order', () => {
    expect(parseTagList('#client-a #client-b')).toEqual({ slugs: ['client-a', 'client-b'] })
    expect(parseTagList('client-a   ideas')).toEqual({ slugs: ['client-a', 'ideas'] })
  })

  it('lowercases like capture and collapses duplicates', () => {
    expect(parseTagList('#Client-A client-a #IDEAS')).toEqual({ slugs: ['client-a', 'ideas'] })
  })

  it('an empty or blank field is an empty list (remove every tag)', () => {
    expect(parseTagList('')).toEqual({ slugs: [] })
    expect(parseTagList('   ')).toEqual({ slugs: [] })
  })

  it.each([
    ['a lone #', '#'],
    ['an underscore', '#bad_slug'],
    ['a trailing dash', '#bad-'],
    ['a double dash', '#a--b'],
    ['punctuation', '#client,a'],
    ['a slug over 40 characters', `#${'x'.repeat(41)}`],
  ])('blocks %s as invalid, even next to good tags', (_label, token) => {
    expect(parseTagList(`#ok ${token}`)).toEqual({ error: 'invalid' })
  })

  it('accepts a slug of exactly 40 characters', () => {
    expect(parseTagList(`#${'x'.repeat(40)}`)).toEqual({ slugs: ['x'.repeat(40)] })
  })

  it('allows 10 distinct tags and blocks 11', () => {
    const tags = (n: number) => Array.from({ length: n }, (_v, i) => `#t${i}`).join(' ')
    expect(parseTagList(tags(10))).toEqual({
      slugs: Array.from({ length: 10 }, (_v, i) => `t${i}`),
    })
    expect(parseTagList(tags(11))).toEqual({ error: 'tooMany' })
  })

  it('counts distinct slugs, so 11 tokens with a repeat are fine', () => {
    const slugs = Array.from({ length: 10 }, (_v, i) => `t${i}`)
    expect(parseTagList(`${slugs.join(' ')} t0`)).toEqual({ slugs })
  })

  it('reports invalid before tooMany when both apply', () => {
    const many = Array.from({ length: 11 }, (_v, i) => `#t${i}`).join(' ')
    expect(parseTagList(`${many} #bad_slug`)).toEqual({ error: 'invalid' })
  })
})
