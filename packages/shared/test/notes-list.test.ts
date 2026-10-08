import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  noteListItemSchema,
  notesListResponseSchema,
  notesQuerySchema,
  SEARCH_LIMITS,
} from '../src'

const ID = '00000000-0000-4000-8000-000000000001'
const item = {
  id: ID,
  title: 'Staging URL and test accounts',
  tags: [{ name: 'Client B', slug: 'client-b' }],
  dueAt: null,
  doneAt: '2026-10-06T23:00:00.000Z',
  excerpt: 'Staging: https://staging.client-b.example',
}
const wire = {
  now: '2026-10-07T15:05:00.000Z',
  timezone: 'America/Mexico_City',
  total: 15,
  notes: [item],
}

describe('notesListResponseSchema', () => {
  it('states the limits the API and the web share', () => {
    expect(SEARCH_LIMITS).toEqual({ qMax: 200, resultsMax: 50, excerptMax: 120 })
  })

  it('decodes instants to Date and encodes them back to the same wire shape', () => {
    const parsed = notesListResponseSchema.parse(wire)
    expect(parsed.now).toEqual(new Date('2026-10-07T15:05:00.000Z'))
    expect(parsed.notes[0]!.doneAt).toEqual(new Date('2026-10-06T23:00:00.000Z'))
    expect(parsed.notes[0]!.dueAt).toBeNull()
    expect(z.encode(notesListResponseSchema, parsed)).toEqual(wire)
  })

  it('accepts exactly 50 notes and rejects 51', () => {
    const many = (n: number) => ({ ...wire, notes: Array.from({ length: n }, () => item) })
    expect(notesListResponseSchema.safeParse(many(50)).success).toBe(true)
    expect(notesListResponseSchema.safeParse(many(51)).success).toBe(false)
  })

  it('accepts an excerpt of 120 units and rejects 121', () => {
    const withExcerpt = (excerpt: string) => noteListItemSchema.safeParse({ ...item, excerpt })
    expect(withExcerpt('a'.repeat(120)).success).toBe(true)
    expect(withExcerpt('a'.repeat(121)).success).toBe(false)
    expect(withExcerpt('').success).toBe(true)
  })

  it('rejects a negative total and a note without a title', () => {
    expect(notesListResponseSchema.safeParse({ ...wire, total: -1 }).success).toBe(false)
    expect(noteListItemSchema.safeParse({ ...item, title: '' }).success).toBe(false)
  })
})

describe('notesQuerySchema', () => {
  it('allows no q, an empty q and a q of 200 characters', () => {
    expect(notesQuerySchema.safeParse({}).success).toBe(true)
    expect(notesQuerySchema.safeParse({ q: '' }).success).toBe(true)
    expect(notesQuerySchema.safeParse({ q: 'a'.repeat(200) }).success).toBe(true)
  })

  it('rejects a q of 201 characters and a non-string q', () => {
    expect(notesQuerySchema.safeParse({ q: 'a'.repeat(201) }).success).toBe(false)
    expect(notesQuerySchema.safeParse({ q: ['a', 'b'] }).success).toBe(false)
  })
})

describe('notesQuerySchema tag', () => {
  it('accepts a tag slug, alone or with q, and no tag at all', () => {
    expect(notesQuerySchema.safeParse({ tag: 'client-b' }).success).toBe(true)
    expect(notesQuerySchema.safeParse({ q: 'staging', tag: 'client-b' }).success).toBe(true)
    expect(notesQuerySchema.parse({}).tag).toBeUndefined()
  })

  it('rejects anything that is not a tag slug, a slug over 40 characters and a repeated tag', () => {
    for (const tag of ['', 'Client B', 'client_b', '-a', 'a--b', 'a'.repeat(41), '#client-b']) {
      expect(notesQuerySchema.safeParse({ tag }).success).toBe(false)
    }
    expect(notesQuerySchema.safeParse({ tag: ['a', 'b'] }).success).toBe(false)
  })
})
