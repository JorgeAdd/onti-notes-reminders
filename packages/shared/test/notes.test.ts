import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  captureRequestSchema,
  NOTE_LIMITS,
  noteDetailResponseSchema,
  noteDetailSchema,
  noteResponseSchema,
  snoozeRequestSchema,
} from '../src'

const ID = '00000000-0000-4000-8000-000000000001'
const wire = {
  id: ID,
  title: 'Standup',
  tags: [{ name: 'Client A', slug: 'client-a' }],
  dueAt: '2026-10-07T15:30:00.000Z',
  originalDueAt: '2026-10-07T15:00:00.000Z',
  snoozeCount: 1,
  doneAt: null,
  createdAt: '2026-10-01T16:00:00.000Z',
}

describe('noteResponseSchema', () => {
  it('decodes instants to Date and encodes them back to the same wire shape', () => {
    const note = noteResponseSchema.parse(wire)
    expect(note.dueAt).toEqual(new Date('2026-10-07T15:30:00.000Z'))
    expect(note.originalDueAt).toEqual(new Date('2026-10-07T15:00:00.000Z'))
    expect(note.doneAt).toBeNull()
    expect(note.createdAt).toEqual(new Date('2026-10-01T16:00:00.000Z'))
    expect(z.encode(noteResponseSchema, note)).toEqual(wire)
  })

  it('requires createdAt (a forgotten select must not pass)', () => {
    expect(noteResponseSchema.safeParse({ ...wire, createdAt: undefined }).success).toBe(false)
    expect(noteResponseSchema.safeParse({ ...wire, createdAt: 'yesterday' }).success).toBe(false)
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

describe('note detail (GET /notes/:id)', () => {
  const detail = { ...wire, body: 'Ana needs **admin** access.' }
  const envelope = {
    now: '2026-10-07T15:05:00.000Z',
    timezone: 'America/Mexico_City',
    note: detail,
  }

  it('NOTE_LIMITS.bodyMax is 20000 (R20)', () => {
    expect(NOTE_LIMITS.bodyMax).toBe(20000)
  })

  it('noteDetailSchema is the note response plus a body of at most bodyMax units', () => {
    const note = noteDetailSchema.parse(detail)
    expect(note.body).toBe(detail.body)
    expect(note.createdAt).toEqual(new Date('2026-10-01T16:00:00.000Z'))
    expect(noteDetailSchema.safeParse({ ...detail, body: '' }).success).toBe(true)
    expect(noteDetailSchema.safeParse({ ...detail, body: 'a'.repeat(20000) }).success).toBe(true)
    expect(noteDetailSchema.safeParse({ ...detail, body: 'a'.repeat(20001) }).success).toBe(false)
    expect(noteDetailSchema.safeParse(wire).success).toBe(false)
  })

  it('noteDetailResponseSchema wraps now, timezone and the note, and round-trips the wire', () => {
    const response = noteDetailResponseSchema.parse(envelope)
    expect(response.now).toEqual(new Date('2026-10-07T15:05:00.000Z'))
    expect(response.timezone).toBe('America/Mexico_City')
    expect(response.note.body).toBe(detail.body)
    expect(z.encode(noteDetailResponseSchema, response)).toEqual(envelope)
  })

  it.each([
    ['a missing now', { now: undefined }],
    ['an empty timezone', { timezone: '' }],
    ['a missing note', { note: undefined }],
  ])('rejects %s', (_label, patch) => {
    expect(noteDetailResponseSchema.safeParse({ ...envelope, ...patch }).success).toBe(false)
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

describe('captureRequestSchema (R11)', () => {
  const valid = { title: 'Call back', tags: ['client-a'], dueAt: '2026-10-06T22:00:00.000Z' }
  const parse = (patch: object) => captureRequestSchema.safeParse({ ...valid, ...patch })

  it('accepts a title, tag slugs and a due instant, decoding the instant to a Date', () => {
    const request = captureRequestSchema.parse(valid)
    expect(request.title).toBe('Call back')
    expect(request.tags).toEqual(['client-a'])
    expect(request.dueAt).toEqual(new Date('2026-10-06T22:00:00.000Z'))
  })

  it('accepts a note without a time (dueAt null) and without tags', () => {
    const request = captureRequestSchema.parse({ title: 'Buy cable', tags: [], dueAt: null })
    expect(request.dueAt).toBeNull()
    expect(request.tags).toEqual([])
  })

  it('trims the title', () => {
    expect(captureRequestSchema.parse({ ...valid, title: '  Call back  ' }).title).toBe('Call back')
  })

  it('title: 200 characters pass, 201 and blank fail', () => {
    expect(parse({ title: 'a'.repeat(200) }).success).toBe(true)
    expect(parse({ title: 'a'.repeat(201) }).success).toBe(false)
    expect(parse({ title: '' }).success).toBe(false)
    expect(parse({ title: '   ' }).success).toBe(false)
  })

  it('slug: 40 characters pass (so the derived name fits tags.name), 41 fail', () => {
    expect(parse({ tags: ['a'.repeat(40)] }).success).toBe(true)
    expect(parse({ tags: ['a'.repeat(41)] }).success).toBe(false)
  })

  it.each(['Client-A', 'client_a', '-client', 'client-', 'a--b', '', 'a b', '#client-a'])(
    'rejects the malformed slug %j',
    (slug) => {
      expect(parse({ tags: [slug] }).success).toBe(false)
    },
  )

  it('tags: 10 pass, 11 fail', () => {
    const slugs = (n: number) => Array.from({ length: n }, (_, i) => `tag-${i}`)
    expect(parse({ tags: slugs(10) }).success).toBe(true)
    expect(parse({ tags: slugs(11) }).success).toBe(false)
  })

  it('tags: duplicate slugs fail', () => {
    expect(parse({ tags: ['client-a', 'client-b', 'client-a'] }).success).toBe(false)
  })

  it('truncates seconds and milliseconds to the minute (R11)', () => {
    const request = captureRequestSchema.parse({ ...valid, dueAt: '2026-10-06T22:00:41.500Z' })
    expect(request.dueAt).toEqual(new Date('2026-10-06T22:00:00.000Z'))
  })

  it('accepts a past instant (an explicit "today 09:00" may already be late)', () => {
    expect(parse({ dueAt: '2001-01-01T00:00:00.000Z' }).success).toBe(true)
  })

  it.each(['tomorrow', '2026-10-06', 17, undefined])('rejects the unparsable dueAt %j', (dueAt) => {
    expect(parse({ dueAt }).success).toBe(false)
  })

  it('does not accept a client-supplied tag name shape', () => {
    expect(parse({ tags: [{ slug: 'client-a', name: 'Client A' }] }).success).toBe(false)
  })

  it('encodes a request for the wire (the clients z.encode before sending)', () => {
    const wire = z.encode(captureRequestSchema, {
      title: 'Call back',
      tags: ['client-a'],
      dueAt: new Date('2026-10-06T22:00:00.000Z'),
    })
    expect(wire).toEqual(valid)
  })
})
