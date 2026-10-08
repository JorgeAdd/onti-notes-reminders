import { describe, expect, it } from 'vitest'
import { tsqueryOf } from '../src/infrastructure/db/postgres-note-repository'

describe('tsqueryOf', () => {
  it('quotes each term as a prefix and joins them with AND', () => {
    expect(tsqueryOf(['staging'])).toBe(`'staging':*`)
    expect(tsqueryOf(['client', 'año', '2026'])).toBe(`'client':* & 'año':* & '2026':*`)
  })

  it('gives null for no terms, meaning no filter', () => {
    expect(tsqueryOf([])).toBeNull()
  })

  it.each([`a'b`, 'a b', 'a&b', 'a|b', 'a!b', 'a:b', 'a(b', 'a\\b', 'a<->b', 'a-b', '', '*'])(
    'rejects the hostile term %j instead of passing it on',
    (term) => {
      expect(() => tsqueryOf(['ok', term])).toThrow(/term/i)
    },
  )
})
