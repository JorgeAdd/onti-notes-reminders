import { expect, it } from 'vitest'
import { ApiError, UnauthorizedError } from '../src/lib/api'
import { createQueryClient, shouldRetry } from '../src/lib/query-client'

it('never retries an expired session (Decision 12)', () => {
  expect(shouldRetry(0, new UnauthorizedError())).toBe(false)
})

it('never retries a 400: the viewed day or tag was refused, retrying cannot fix it', () => {
  expect(shouldRetry(0, new ApiError(400, 'GET /today'))).toBe(false)
  expect(shouldRetry(0, new ApiError(503, 'GET /today'))).toBe(true)
})

it('never retries a 404: the note is gone or not the caller, retrying only delays the answer', () => {
  expect(shouldRetry(0, new ApiError(404, 'GET /notes/x'))).toBe(false)
  expect(shouldRetry(0, new ApiError(500, 'GET /notes/x'))).toBe(true)
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
