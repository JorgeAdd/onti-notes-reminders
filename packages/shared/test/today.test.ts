import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { todayResponseSchema, type TodayResponse } from '../src'

const wire = {
  now: '2026-10-07T15:05:00.000Z',
  timezone: 'America/Mexico_City',
  window: { start: '2026-10-07T06:00:00.000Z', end: '2026-10-08T06:00:00.000Z' },
  openCount: 2,
  anyDoneToday: true,
  otherCount: 11,
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
