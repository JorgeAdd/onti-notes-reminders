import { isValidTimeZone, localCalendarDate, todayWindow, type TodayResponse } from '@onti/shared'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, UnauthorizedError } from '../../lib/api'
import { browserTimeZone as readBrowserTimeZone } from '../../lib/browser-timezone'
import { skewOf } from '../../lib/clock'
import { messages } from '../../messages'
import type { CaptureSubmit } from './capture-preview'
import { DAY_KEYS, dayKey, stepView, type DayView } from './day-view'
import { calendarDayLabel } from './format'
import { pageTitle } from './page-title'
import styles from './TodayContainer.module.css'
import { DayPage, type CaptureBar } from './DayPage'
import { useReminderActions, type ReminderApi } from './mutations/use-reminder-actions'
import { useTodayRows } from './use-today-rows'
import { TodayStatus } from './TodayStatus'
import { useDayView } from './use-day-view'
import { useNarrow } from './use-narrow'
import { useNow } from './use-now'

interface Props {
  load: (view: DayView) => Promise<TodayResponse>
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
 * Owns the data flow of the page (Decisions 6-8): the server's page for the viewed day and tag
 * (kept in the URL), refetched on window focus and when the ticking clock passes the end of
 * today. DayPage only renders.
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
  const { view, setView } = useDayView()
  const query = useQuery({
    queryKey: dayKey(view),
    queryFn: () => load(view),
    placeholderData: keepPreviousData,
  })
  const { data, dataUpdatedAt, refetch, isPlaceholderData } = query
  // A placeholder is the previous page: its `dataUpdatedAt` is not when it arrived, so the skew
  // of the last real answer stays.
  const [skew, setSkew] = useState(0)
  const answerSkew = data && !isPlaceholderData ? skewOf(data.now, dataUpdatedAt) : skew
  if (answerSkew !== skew) setSkew(answerSkew)
  const now = useNow(skew)
  const [viewMessage, setViewMessage] = useState<string | null>(null)
  const [bar, setBar] = useState<Pick<CaptureBar, 'draft' | 'notice'> | null>(null)
  const actions = useReminderActions({
    api: reminders,
    now,
    view,
    onSessionExpired,
    // A failed capture gives the typed text back, with the one-line reason.
    onCaptureFailed: (text, message) => setBar({ draft: text, notice: message }),
  })
  const openBar = useCallback(() => setBar({ draft: '', notice: null }), [])
  const mobile = useNarrow()
  // D5 · `[` and `]` step from the requested date (so fast presses do not skip while a page
  // loads); a date equal to today's becomes the no-date view, which follows midnight.
  const todayDate = data ? localCalendarDate(now, data.timezone) : null
  const days = {
    offToday: view.date !== null,
    onStep: (delta: 1 | -1) => {
      const next = todayDate === null ? null : stepView(view, delta, todayDate)
      if (next) setView({ date: next.date })
    },
    onToday: () => setView({ date: null }),
  }
  const { rows, armed, hints, sheet } = useTodayRows(
    data,
    actions,
    {
      open: bar !== null,
      onOpen: openBar,
      mobile,
      // The page on screen is not the page of the key yet: no row action until it lands.
      blocked: isPlaceholderData,
    },
    days,
  )
  const captureBar: CaptureBar | null =
    bar === null
      ? null
      : {
          ...bar,
          onSubmit: (submit: CaptureSubmit) => {
            setBar(null)
            actions.capture(submit)
          },
          onClose: () => setBar(null),
        }
  // Decision 7 · midnight comes from today's window, not from the viewed day's.
  const midnight = data ? todayWindow(data.now, data.timezone).end.getTime() : undefined
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
      .then(() => queryClient.invalidateQueries({ queryKey: DAY_KEYS }))
      .catch((error: unknown) => {
        if (error instanceof UnauthorizedError) onSessionExpired()
      })
  }, [storedTimeZone, browserTimeZone, syncTimezone, queryClient, onSessionExpired])

  useEffect(() => {
    if (midnight !== undefined && now.getTime() >= midnight) {
      void queryClient.invalidateQueries({ queryKey: DAY_KEYS })
    }
  }, [now, midnight, queryClient])

  // Decision 8 · a view the URL carries but the server refuses (unknown tag) is dropped from the
  // URL, with one line saying so. Syntax errors never get here: `readView` drops them.
  const refused =
    query.error instanceof ApiError &&
    query.error.status === 400 &&
    (view.tag !== null || view.date !== null)
  if (refused && viewMessage === null) setViewMessage(messages.errors.viewUnavailable)
  useEffect(() => {
    if (refused) setView(view.tag === null ? { date: null } : { tag: null }, 'replace')
  }, [refused, view, setView])

  // `?d=` holds the date of today: the view is today, which keeps following midnight.
  const dateIsToday = data !== undefined && !isPlaceholderData && data.isToday && view.date !== null
  useEffect(() => {
    if (dateIsToday) setView({ date: null }, 'replace')
  }, [dateIsToday, setView])

  if (data) {
    // While the viewed page loads, the screen names the requested day, never the previous one.
    const shownDate = isPlaceholderData ? (view.date ?? todayDate) : data.date
    const loading =
      isPlaceholderData && shownDate !== null
        ? { date: shownDate, isToday: shownDate === todayDate }
        : null
    const day = calendarDayLabel(shownDate ?? data.date, data.timezone)
    return (
      <>
        <DayPage
          today={data}
          now={now}
          onSignOut={onSignOut}
          message={viewMessage ?? actions.message}
          onDismissMessage={() => {
            setViewMessage(null)
            actions.dismiss()
          }}
          rows={rows}
          snoozeMenu={armed}
          hints={hints}
          capture={captureBar}
          mobile={mobile}
          onOpenCapture={openBar}
          sheet={sheet}
          loading={loading}
          nav={days}
        />
        {/* The one live region of the page: the viewed day and its count, on every change. */}
        <p className={styles.live} aria-live="polite">
          {loading ? messages.day.loading(day) : messages.day.announce(day, pageTitle(data))}
        </p>
      </>
    )
  }
  if (expired) return null
  return <TodayStatus failed={query.isError} onRetry={() => void refetch()} />
}
