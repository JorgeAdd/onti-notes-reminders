import { expect, it } from 'vitest'
import { UnauthorizedError } from '../src/lib/api'
import { createQueryClient, shouldRetry } from '../src/lib/query-client'

it('never retries an expired session (Decision 12)', () => {
  expect(shouldRetry(0, new UnauthorizedError())).toBe(false)
})

it('retries other failures a couple of times, then gives up', () => {
  expect(shouldRetry(0, new Error('boom'))).toBe(true)
  expect(shouldRetry(1, new Error('boom'))).toBe(true)
  expect(shouldRetry(2, new Error('boom'))).toBe(false)
})

it('refetches on window focus (Decision 6)', () => {
  const defaults = createQueryClient().getDefaultOptions().queries
  expect(defaults?.refetchOnWindowFocus).toBe(true)
  expect(defaults?.retry).toBe(shouldRetry)
})
