import { createHmac, timingSafeEqual } from 'node:crypto'
import type * as NodeCrypto from 'node:crypto'
import type { ActionClaims } from '@onti/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HmacActionTokens } from '../src/infrastructure/push/hmac-action-tokens'
import { noteId } from './fakes'

vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof NodeCrypto>()
  return { ...actual, timingSafeEqual: vi.fn(actual.timingSafeEqual) }
})

const SECRET = 'a'.repeat(32)
const claims: ActionClaims = {
  v: 1,
  noteId: noteId(1),
  userId: '7b0c5a2e-3f4d-4c1a-9e8b-2d6f0a1b3c4d',
  dueAt: 1_791_000_000_000,
  actions: ['done', 'snooze'],
  exp: 2_000,
}
const BEFORE_EXP = new Date(2_000 * 1000 - 1000)
const AT_EXP = new Date(2_000 * 1000)

const b64 = (value: string | Buffer) => Buffer.from(value).toString('base64url')
/** A token with a VALID signature over whatever payload text the test wants. */
const signedBy = (secret: string, payload: string) => {
  const first = b64(payload)
  return `${first}.${b64(createHmac('sha256', secret).update(first).digest())}`
}

let tokens: HmacActionTokens
beforeEach(() => {
  tokens = new HmacActionTokens(SECRET)
  vi.mocked(timingSafeEqual).mockClear()
})

describe('HmacActionTokens', () => {
  it('round-trips the claims', () => {
    expect(tokens.verify(tokens.sign(claims), BEFORE_EXP)).toEqual(claims)
  })

  it('signs different claims to different tokens', () => {
    expect(tokens.sign(claims)).not.toBe(tokens.sign({ ...claims, dueAt: claims.dueAt + 1 }))
  })

  it('rejects a tampered payload that keeps the old signature', () => {
    const [, signature] = tokens.sign(claims).split('.')
    const forged = b64(JSON.stringify({ ...claims, noteId: noteId(2) }))
    expect(tokens.verify(`${forged}.${signature}`, BEFORE_EXP)).toBeNull()
  })

  it('rejects a tampered signature', () => {
    const [payload, signature] = tokens.sign(claims).split('.')
    const flipped = (signature!.startsWith('A') ? 'B' : 'A') + signature!.slice(1)
    expect(tokens.verify(`${payload}.${flipped}`, BEFORE_EXP)).toBeNull()
  })

  it('rejects a token signed with another secret', () => {
    const other = new HmacActionTokens('b'.repeat(32))
    expect(tokens.verify(other.sign(claims), BEFORE_EXP)).toBeNull()
  })

  it.each([
    ['one segment', 'abc'],
    ['three segments', 'a.b.c'],
    ['empty', ''],
    ['an empty signature', 'abc.'],
  ])('rejects %s', (_label, token) => {
    expect(tokens.verify(token, BEFORE_EXP)).toBeNull()
  })

  it('rejects a signature of the wrong length without throwing', () => {
    const [payload] = tokens.sign(claims).split('.')
    expect(tokens.verify(`${payload}.${b64('short')}`, BEFORE_EXP)).toBeNull()
  })

  it('rejects a correctly signed payload that is not JSON', () => {
    expect(tokens.verify(signedBy(SECRET, 'not json'), BEFORE_EXP)).toBeNull()
  })

  it('rejects correctly signed claims that fail the schema', () => {
    expect(
      tokens.verify(signedBy(SECRET, JSON.stringify({ ...claims, actions: [] })), BEFORE_EXP),
    ).toBeNull()
    expect(
      tokens.verify(signedBy(SECRET, JSON.stringify({ ...claims, userId: 'x' })), BEFORE_EXP),
    ).toBeNull()
  })

  it('is valid one second before exp and invalid at exp', () => {
    const token = tokens.sign(claims)
    expect(tokens.verify(token, BEFORE_EXP)).toEqual(claims)
    expect(tokens.verify(token, AT_EXP)).toBeNull()
    expect(tokens.verify(token, new Date(AT_EXP.getTime() + 1))).toBeNull()
  })

  it('compares the signature in constant time', () => {
    tokens.verify(tokens.sign(claims), BEFORE_EXP)
    expect(timingSafeEqual).toHaveBeenCalledTimes(1)
  })
})
