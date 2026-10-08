import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { dayQuerySchema, todayResponseSchema, type TodayResponse } from '../src'

const wire = {
  now: '2026-10-07T15:05:00.000Z',
  timezone: 'America/Mexico_City',
  window: { start: '2026-10-07T06:00:00.000Z', end: '2026-10-08T06:00:00.000Z' },
  openCount: 2,
  anyDoneToday: true,
  otherCount: 11,
  date: '2026-10-07',
  isToday: true,
  tag: null,
  tags: [
    { slug: 'client-a', name: 'Client A' },
    { slug: 'client-c', name: 'Client C' },
  ],
  hiddenCount: 0,
  others: [],
  carried: [
    {
      day: '2026-10-06T06:00:00.000Z',
      items: [
        {
          id: '0b0e0c9e-6b2f-4d8e-9d55-1d3a8f2a7c11',
          title: 'Reply to Marta',
          tags: [{ name: 'Client A', slug: 'client-a' }],
          dueAt: '2026-10-07T00:00:00.000Z',
          originalDueAt: '2026-10-07T00:00:00.000Z',
          snoozeCount: 0,
          doneAt: null,
        },
      ],
    },
  ],
  rail: [
    {
      id: '5c1f2b7a-1d0e-4a57-8d0a-7a2f4e9b3c22',
      title: 'Standup',
      tags: [],
      dueAt: '2026-10-07T15:30:00.000Z',
      originalDueAt: '2026-10-07T15:30:00.000Z',
      snoozeCount: 1,
      doneAt: '2026-10-07T15:10:00.000Z',
    },
  ],
}

describe('todayResponseSchema (decision 1)', () => {
  it('parse decodes ISO strings to Dates (open question 3 confirmed)', () => {
    const parsed = todayResponseSchema.parse(wire)
    expect(parsed.now).toEqual(new Date('2026-10-07T15:05:00.000Z'))
    expect(parsed.window.end).toBeInstanceOf(Date)
    expect(parsed.carried[0]?.day).toEqual(new Date('2026-10-06T06:00:00.000Z'))
    expect(parsed.carried[0]?.items[0]?.dueAt).toBeInstanceOf(Date)
    expect(parsed.carried[0]?.items[0]?.doneAt).toBeNull()
    expect(parsed.rail[0]?.doneAt).toEqual(new Date('2026-10-07T15:10:00.000Z'))
  })

  it('z.encode round-trips back to the exact wire strings', () => {
    const parsed: TodayResponse = todayResponseSchema.parse(wire)
    expect(z.encode(todayResponseSchema, parsed)).toEqual(wire)
  })

  it('rejects a non-ISO instant', () => {
    expect(todayResponseSchema.safeParse({ ...wire, now: 'yesterday' }).success).toBe(false)
  })

  it('strips body and notifiedDueAt (never on the wire)', () => {
    const withBody = structuredClone(wire)
    Object.assign(withBody.rail[0] as object, { body: 'secret', notifiedDueAt: null })
    const item = todayResponseSchema.parse(withBody).rail[0]
    expect(item).not.toHaveProperty('body')
    expect(item).not.toHaveProperty('notifiedDueAt')
  })
})

const otherWire = {
  id: '9d2c5a1e-3b7f-4c60-8e14-2f6a7b8c9d33',
  title: 'API keys rotate every 90 days',
  tags: [{ name: 'Client B', slug: 'client-b' }],
  dueAt: null,
  originalDueAt: null,
  snoozeCount: 0,
  doneAt: null,
}

describe('todayResponseSchema · day and filter fields (slice 3)', () => {
  const filtered = {
    ...wire,
    tag: 'client-b',
    hiddenCount: 10,
    others: [
      otherWire,
      {
        ...otherWire,
        id: 'a1b2c3d4-3b7f-4c60-8e14-2f6a7b8c9d44',
        dueAt: '2026-10-09T15:00:00.000Z',
        originalDueAt: '2026-10-09T15:00:00.000Z',
      },
    ],
  }

  it('parses a filtered page: others may have null dates and dated ones decode to Dates', () => {
    const parsed = todayResponseSchema.parse(filtered)
    expect(parsed.tag).toBe('client-b')
    expect(parsed.hiddenCount).toBe(10)
    expect(parsed.others[0]?.dueAt).toBeNull()
    expect(parsed.others[0]?.originalDueAt).toBeNull()
    expect(parsed.others[1]?.dueAt).toEqual(new Date('2026-10-09T15:00:00.000Z'))
    expect(z.encode(todayResponseSchema, parsed)).toEqual(filtered)
  })

  it('the rail still rejects a null due time (only others are nullable)', () => {
    const bad = structuredClone(wire)
    Object.assign(bad.rail[0] as object, { dueAt: null })
    expect(todayResponseSchema.safeParse(bad).success).toBe(false)
  })

  it.each(['date', 'isToday', 'tag', 'tags', 'hiddenCount', 'others'])('requires %s', (field) => {
    const rest: Record<string, unknown> = { ...wire }
    delete rest[field]
    expect(todayResponseSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects an impossible viewed date', () => {
    expect(todayResponseSchema.safeParse({ ...wire, date: '2026-02-30' }).success).toBe(false)
  })
})

describe('dayQuerySchema', () => {
  it('accepts no params, a date, a tag, or both', () => {
    expect(dayQuerySchema.parse({})).toEqual({})
    expect(dayQuerySchema.parse({ date: '2026-10-08' })).toEqual({ date: '2026-10-08' })
    expect(dayQuerySchema.parse({ tag: 'client-b' })).toEqual({ tag: 'client-b' })
    expect(dayQuerySchema.parse({ date: '2000-01-01', tag: 'a' })).toEqual({
      date: '2000-01-01',
      tag: 'a',
    })
  })

  it('ignores unknown keys', () => {
    expect(dayQuerySchema.parse({ date: '2026-10-08', other: 'x' })).toEqual({ date: '2026-10-08' })
  })

  it.each([
    ['Feb 30', { date: '2026-02-30' }],
    ['unpadded date', { date: '2026-1-5' }],
    ['empty date', { date: '' }],
    ['date before 2000', { date: '1999-12-31' }],
    ['date after 2099', { date: '2100-01-01' }],
    ['repeated date', { date: ['2026-10-08', '2026-10-09'] }],
    ['uppercase tag', { tag: 'Client-B' }],
    ['empty tag', { tag: '' }],
    ['41-char tag', { tag: 'a'.repeat(41) }],
    ['repeated tag', { tag: ['a', 'b'] }],
  ])('rejects %s', (_label, query) => {
    expect(dayQuerySchema.safeParse(query).success).toBe(false)
  })

  it('accepts a 40-char tag slug', () => {
    expect(dayQuerySchema.safeParse({ tag: 'a'.repeat(40) }).success).toBe(true)
  })
})
