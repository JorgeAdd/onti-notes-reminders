import { describe, expect, it } from 'vitest'
import { actionClaimsSchema, PUSH_ACTIONS, PUSH_COPY, pushPayloadSchema } from '../src'

const NOTE = '00000000-0000-4000-8000-000000000001'
const USER = '7b0c5a2e-3f4d-4c1a-9e8b-2d6f0a1b3c4d'

const payload = {
  v: 1,
  title: '17:00 · Notify Ana',
  body: 'Client A',
  tag: NOTE,
  noteId: NOTE,
  dueAt: 1_791_000_000_000,
  apiUrl: 'https://api.example.com',
  token: 'abc.def',
  appName: PUSH_COPY.appName,
  actions: [
    { action: 'done', title: PUSH_COPY.done },
    { action: 'snooze', title: PUSH_COPY.snooze },
  ],
}

const claims = {
  v: 1,
  noteId: NOTE,
  userId: USER,
  dueAt: 1_791_000_000_000,
  actions: ['done', 'snooze'],
  exp: 1_791_086_400,
}

describe('push constants', () => {
  it('lists the two actions and the server-built copy', () => {
    expect(PUSH_ACTIONS).toEqual(['done', 'snooze'])
    expect(PUSH_COPY).toEqual({ appName: 'Notes + Reminders', done: 'Done', snooze: '+1 h' })
  })
})

describe('pushPayloadSchema', () => {
  it('accepts a valid payload', () => {
    expect(pushPayloadSchema.parse(payload)).toEqual(payload)
  })

  it('accepts a payload with no actions', () => {
    expect(pushPayloadSchema.safeParse({ ...payload, actions: [] }).success).toBe(true)
  })

  it.each([
    ['a missing token', { ...payload, token: undefined }],
    ['a bad note id', { ...payload, noteId: 'not-a-uuid' }],
    ['a non-integer dueAt', { ...payload, dueAt: 1.5 }],
    ['a bad apiUrl', { ...payload, apiUrl: 'nope' }],
    ['an unknown action', { ...payload, actions: [{ action: 'delete', title: 'x' }] }],
    ['another version', { ...payload, v: 2 }],
  ])('rejects %s', (_label, value) => {
    expect(pushPayloadSchema.safeParse(value).success).toBe(false)
  })
})

describe('actionClaimsSchema', () => {
  it('accepts valid claims', () => {
    expect(actionClaimsSchema.parse(claims)).toEqual(claims)
  })

  it.each([
    ['a bad user id', { ...claims, userId: 'x' }],
    ['a bad note id', { ...claims, noteId: 'x' }],
    ['empty actions', { ...claims, actions: [] }],
    ['an unknown action', { ...claims, actions: ['done', 'delete'] }],
    ['a missing exp', { ...claims, exp: undefined }],
    ['another version', { ...claims, v: 2 }],
  ])('rejects %s', (_label, value) => {
    expect(actionClaimsSchema.safeParse(value).success).toBe(false)
  })
})
