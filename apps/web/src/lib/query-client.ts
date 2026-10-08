import { QueryClient } from '@tanstack/react-query'
import { UnauthorizedError } from './api'

const MAX_RETRIES = 2

/** An expired session cannot recover by retrying; anything else gets a couple of attempts. */
export function shouldRetry(failureCount: number, error: Error): boolean {
  return !(error instanceof UnauthorizedError) && failureCount < MAX_RETRIES
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: shouldRetry, refetchOnWindowFocus: true } },
  })
}
