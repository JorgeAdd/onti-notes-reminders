import { isValidTimeZone, type TodayResponse } from '@onti/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { UnauthorizedError } from '../../lib/api'
import { browserTimeZone as readBrowserTimeZone } from '../../lib/browser-timezone'
import { skewOf } from '../../lib/clock'
import { DayPage } from './DayPage'
import { useReminderActions, type ReminderApi } from './mutations/use-reminder-actions'
import { TodayStatus } from './TodayStatus'
import { useNow } from './use-now'

interface Props {
  load: () => Promise<TodayResponse>
  /** The API answered 401: the app ends the session (Decision 12). */
  onSessionExpired: () => void
  onSignOut: () => void
  /** Stores the browser zone on the profile (PATCH /me). */
  syncTimezone: (timezone: string) => Promise<unknown>
  /** Snooze, done and undo calls, bound to the session token. */
  reminders: ReminderApi
  /** Injectable for tests; defaults to the browser's zone. */
  browserTimeZone?: () => string
}

/**
 * Owns the data flow of the page (Decision 6): the server's day page, refetched on window focus
 * and when the ticking clock passes `window.end`. DayPage only renders.
 */
export function TodayContainer({
  load,
  onSessionExpired,
  onSignOut,
  syncTimezone,
  reminders,
  browserTimeZone = readBrowserTimeZone,
}: Props) {
  const queryClient = useQueryClient()
  const syncAttempted = useRef(false)
  const query = useQuery({ queryKey: ['today'], queryFn: load })
  const { data, dataUpdatedAt, refetch } = query
  const now = useNow(data ? skewOf(data.now, dataUpdatedAt) : 0)
  const { message, dismiss } = useReminderActions({
    api: reminders,
    now,
    onSessionExpired,
  })
  const windowEnd = data?.window.end.getTime()
  const expired = query.error instanceof UnauthorizedError

  useEffect(() => {
    if (expired) onSessionExpired()
  }, [expired, onSessionExpired])

  const storedTimeZone = data?.timezone
  // First login (Decision 2): a profile still on UTC gets the browser zone, once per mount.
  // A failure is silent and retried on the next page load; a 401 ends the session.
  useEffect(() => {
    if (storedTimeZone !== 'UTC' || syncAttempted.current) return
    const zone = browserTimeZone()
    if (zone === 'UTC' || !isValidTimeZone(zone)) return
    syncAttempted.current = true
    syncTimezone(zone)
      .then(() => queryClient.invalidateQueries({ queryKey: ['today'] }))
      .catch((error: unknown) => {
        if (error instanceof UnauthorizedError) onSessionExpired()
      })
  }, [storedTimeZone, browserTimeZone, syncTimezone, queryClient, onSessionExpired])

  useEffect(() => {
    if (windowEnd !== undefined && now.getTime() >= windowEnd) void refetch()
  }, [now, windowEnd, refetch])

  if (data) {
    return (
      <DayPage
        today={data}
        now={now}
        onSignOut={onSignOut}
        message={message}
        onDismissMessage={dismiss}
      />
    )
  }
  if (expired) return null
  return <TodayStatus failed={query.isError} onRetry={() => void refetch()} />
}
