import type { TodayResponse } from '@onti/shared'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { UnauthorizedError } from '../../lib/api'
import { skewOf } from '../../lib/clock'
import { DayPage } from './DayPage'
import { TodayStatus } from './TodayStatus'
import { useNow } from './use-now'

interface Props {
  load: () => Promise<TodayResponse>
  /** The API answered 401: the app ends the session (Decision 12). */
  onSessionExpired: () => void
  onSignOut: () => void
}

/**
 * Owns the data flow of the page (Decision 6): the server's day page, refetched on window focus
 * and when the ticking clock passes `window.end`. DayPage only renders.
 */
export function TodayContainer({ load, onSessionExpired, onSignOut }: Props) {
  const query = useQuery({ queryKey: ['today'], queryFn: load })
  const { data, dataUpdatedAt, refetch } = query
  const now = useNow(data ? skewOf(data.now, dataUpdatedAt) : 0)
  const windowEnd = data?.window.end.getTime()
  const expired = query.error instanceof UnauthorizedError

  useEffect(() => {
    if (expired) onSessionExpired()
  }, [expired, onSessionExpired])

  useEffect(() => {
    if (windowEnd !== undefined && now.getTime() >= windowEnd) void refetch()
  }, [now, windowEnd, refetch])

  if (data) return <DayPage today={data} now={now} onSignOut={onSignOut} />
  if (expired) return null
  return <TodayStatus failed={query.isError} onRetry={() => void refetch()} />
}
