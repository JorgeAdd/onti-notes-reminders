import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { noteResponseSchema, snoozeRequestSchema } from '../src'

const ID = '00000000-0000-4000-8000-000000000001'
const wire = {
  id: ID,
  title: 'Standup',
  tags: [{ name: 'Client A', slug: 'client-a' }],
  dueAt: '2026-10-07T15:30:00.000Z',
  originalDueAt: '2026-10-07T15:00:00.000Z',
  snoozeCount: 1,
  doneAt: null,
}

describe('noteResponseSchema', () => {
  it('decodes instants to Date and encodes them back to the same wire shape', () => {
    const note = noteResponseSchema.parse(wire)
    expect(note.dueAt).toEqual(new Date('2026-10-07T15:30:00.000Z'))
    expect(note.originalDueAt).toEqual(new Date('2026-10-07T15:00:00.000Z'))
    expect(note.doneAt).toBeNull()
    expect(z.encode(noteResponseSchema, note)).toEqual(wire)
  })

  it('accepts a plain note with no reminder (all instants null)', () => {
    const plain = { ...wire, tags: [], dueAt: null, originalDueAt: null, snoozeCount: 0 }
    const note = noteResponseSchema.parse(plain)
    expect(note.dueAt).toBeNull()
    expect(z.encode(noteResponseSchema, note)).toEqual(plain)
  })

  it.each([
    ['a non-UUID id', { id: 'N1' }],
    ['an empty title', { title: '' }],
    ['a negative snooze count', { snoozeCount: -1 }],
    ['a non-ISO instant', { dueAt: 'tomorrow' }],
  ])('rejects %s', (_label, patch) => {
    expect(noteResponseSchema.safeParse({ ...wire, ...patch }).success).toBe(false)
  })
})

describe('snoozeRequestSchema', () => {
  it.each(['hour', 'tomorrow'])('accepts the preset %s', (preset) => {
    expect(snoozeRequestSchema.parse({ preset })).toEqual({ preset })
  })

  it.each([{ preset: 'week' }, { preset: '' }, { preset: 1 }, {}, null])('rejects %j', (body) => {
    expect(snoozeRequestSchema.safeParse(body).success).toBe(false)
  })
})
