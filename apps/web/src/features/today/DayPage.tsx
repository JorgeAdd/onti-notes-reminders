import type { SnoozePreset, TodayItem, TodayResponse } from '@onti/shared'
import { lazy, Suspense } from 'react'
import { messages } from '../../messages'
import { ActionMessage } from './ActionMessage'
import type { CaptureSubmit } from './capture-preview'
import { ActionSheet } from './ActionSheet'
import { CarriedGroup } from './CarriedGroup'
import { DateColumn } from './DateColumn'
import type { DayNavState } from './DayNav'
import { calendarDayLabel } from './format'
import { OtherNotes } from './OtherNotes'
import { pageTitle } from './page-title'
import styles from './DayPage.module.css'
import { EmptyState } from './EmptyState'
import { HourRail } from './HourRail'
import { MobileBar } from './MobileBar'
import { PageHeader } from './PageHeader'
import type { KeyHint } from './keys'
import type { RowsState } from './rows'
import { Statusline } from './Statusline'
import { WhichKey } from './WhichKey'

const noop = () => undefined

// Decision 20: the bar and its preview code load on the first `c`, not with the page.
const CommandBar = lazy(() => import('./CommandBar').then((m) => ({ default: m.CommandBar })))
// The tag bar loads the same way, on the first `#`.
const TagBar = lazy(() => import('./TagBar').then((m) => ({ default: m.TagBar })))

/** The open command bar: what it starts with and what it reports back. */
export interface CaptureBar {
  draft: string
  notice: string | null
  onSubmit: (submit: CaptureSubmit) => void
  onClose: () => void
}

/** The open tag bar (`#`): the applied tag and what it reports back. */
export interface TagBarState {
  active: string | null
  onApply: (slug: string) => void
  onClose: () => void
  onClear?: () => void
}

/** The row-tap sheet on a phone: the item and the same actions the keys run. */
export interface SheetState {
  item: TodayItem
  onDone: () => void
  onUndo: () => void
  onSnooze: (preset: SnoozePreset) => void
  onClose: () => void
}

const tagSlugs = (today: TodayResponse) => [
  ...new Set(
    [...today.carried.flatMap((group) => group.items), ...today.rail].flatMap((item) =>
      item.tags.map((tag) => tag.slug),
    ),
  ),
]

interface Props {
  today: TodayResponse
  /** Ticking display time (use-now), never the device clock directly. */
  now: Date
  onSignOut: () => void
  /** A failed action, in one line above the statusline (Decision 11). */
  message?: string | null
  onDismissMessage?: () => void
  /** Row focus and animation (Decision 13). */
  rows?: RowsState | undefined
  /** `s` was pressed on an open item: show the which-key menu. */
  snoozeMenu?: boolean
  hints?: KeyHint[] | undefined
  /** The command bar, when open (`c`). */
  capture?: CaptureBar | null
  /** Phone width: bottom "+ Capture" bar, presets in the command bar, and the row-tap sheet. */
  mobile?: boolean
  onOpenCapture?: () => void
  sheet?: SheetState | null
  /** D5 · set while the viewed day loads: the day to show instead of the previous page's. */
  loading?: { date: string; isToday: boolean; tag: string | null } | null
  /** Day navigation: `[` `]` `t` handlers and the viewed day's state. */
  nav?: DayNavState | undefined
  /** The tag bar, when open (`#`). */
  tagBar?: TagBarState | null
  /** Phone width: the bottom bar's Tags button; omitted when the account has no tags. */
  onOpenTags?: (() => void) | undefined
}

/** The page frame: date column, header and the area the day's items fill. */
export function DayPage({
  today,
  now,
  onSignOut,
  message = null,
  onDismissMessage,
  rows,
  snoozeMenu = false,
  hints,
  capture = null,
  mobile = false,
  onOpenCapture = noop,
  sheet = null,
  loading = null,
  nav,
  tagBar = null,
  onOpenTags,
}: Props) {
  const date = loading?.date ?? today.date
  const isToday = loading?.isToday ?? today.isToday
  const dayText = calendarDayLabel(date, today.timezone)
  const tag = loading ? loading.tag : today.tag
  // R5, or R12's side note when filtered (it names the tag where the page is narrow).
  const note = loading
    ? null
    : today.tag === null
      ? messages.today.otherNotes(today.otherCount)
      : mobile
        ? messages.filter.hiddenNamed(today.hiddenCount, today.tag)
        : messages.filter.hidden(today.hiddenCount)
  const carriedCount = today.carried.reduce((sum, group) => sum + group.items.length, 0)
  // Decision 13: total notes derive from the page itself, no extra wire field.
  const totalCount = carriedCount + today.rail.length + today.otherCount
  const empty = carriedCount === 0 && today.rail.length === 0
  return (
    <div className={styles.desk}>
      <div className={styles.page}>
        <DateColumn
          date={date}
          isToday={isToday}
          timezone={today.timezone}
          note={note}
          onSignOut={onSignOut}
          nav={nav ? { ...nav, mobile } : undefined}
        />
        <PageHeader title={loading ? messages.day.loading(dayText) : pageTitle(today)} />
        <main className={styles.main} aria-busy={loading ? 'true' : undefined}>
          {empty ? (
            <EmptyState hasNotes={totalCount > 0} day={today.isToday ? undefined : dayText} />
          ) : (
            <>
              {today.carried.map((group) => (
                <CarriedGroup
                  key={group.day.getTime()}
                  group={group}
                  now={now}
                  timezone={today.timezone}
                  rows={rows}
                />
              ))}
              <HourRail
                items={today.rail}
                now={now}
                timezone={today.timezone}
                rows={rows}
                isToday={today.isToday}
              />
            </>
          )}
          {today.tag !== null && today.others.length > 0 ? (
            <OtherNotes items={today.others} tag={today.tag} timezone={today.timezone} />
          ) : null}
        </main>
      </div>
      <div className={styles.dock} data-testid="dock">
        {snoozeMenu ? <WhichKey now={now} timezone={today.timezone} /> : null}
        {message === null ? null : (
          <ActionMessage message={message} onDismiss={onDismissMessage ?? noop} />
        )}
        {capture === null ? null : (
          <Suspense fallback={null}>
            <CommandBar
              now={now}
              timezone={today.timezone}
              mobile={mobile}
              tags={tagSlugs(today)}
              {...capture}
            />
          </Suspense>
        )}
        {tagBar === null ? null : (
          <Suspense fallback={null}>
            <TagBar tags={today.tags} mobile={mobile} {...tagBar} />
          </Suspense>
        )}
        {sheet === null ? null : <ActionSheet now={now} timezone={today.timezone} {...sheet} />}
        {mobile && capture === null && sheet === null && tagBar === null ? (
          <MobileBar onCapture={onOpenCapture} onTags={onOpenTags} />
        ) : null}
        <Statusline
          now={now}
          timezone={today.timezone}
          todayCount={today.openCount}
          carriedCount={carriedCount}
          totalCount={totalCount}
          hints={hints}
          date={date}
          isToday={isToday}
          loading={loading !== null}
          mode={tag === null ? undefined : messages.statusline.filterMode(tag)}
        />
      </div>
    </div>
  )
}
