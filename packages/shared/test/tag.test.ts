/** R12 · filterByTag accepts string tags and {slug} tag objects. */
import { describe, expect, it } from 'vitest'
import { filterByTag } from '../src'

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
