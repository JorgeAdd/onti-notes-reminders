import { QueryClient } from '@tanstack/react-query'
import { ApiError, UnauthorizedError } from './api'

const MAX_RETRIES = 2

/**
 * An expired session cannot recover by retrying, and neither can a 400 (the viewed day or tag was
 * refused) or a 404 (the note is gone); anything else gets a couple of attempts.
 */
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof UnauthorizedError) return false
  if (error instanceof ApiError && (error.status === 400 || error.status === 404)) return false
  return failureCount < MAX_RETRIES
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: shouldRetry, refetchOnWindowFocus: true } },
  })
}
