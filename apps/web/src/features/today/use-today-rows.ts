import type { TodayResponse } from '@onti/shared'
import { useMemo, useState } from 'react'
import { orderedIds, step, useFocus } from './focus'
import type { SheetState } from './DayPage'
import { availableKeys, reduceKey, type KeyCommand, type KeyState, type Target } from './keys'
import { isPendingId, type useReminderActions } from './mutations/use-reminder-actions'
import { IDLE_ROWS, type RowsState } from './rows'
import { useKeyboardLayer } from './use-keyboard-layer'

const NO_IDS: string[] = []

type Actions = Pick<ReturnType<typeof useReminderActions>, 'snooze' | 'done' | 'undo'>

/**
 * Container logic for the rows: focus by id, the key layer and the one row that animates after an
 * action. DayPage and ItemRow only render what this returns.
 */
export function useTodayRows(
  today: TodayResponse | undefined,
  actions: Actions,
  bar: { open: boolean; onOpen: () => void; mobile: boolean; blocked: boolean },
  days: { offToday: boolean; onStep: (delta: 1 | -1) => void; onToday: () => void },
) {
  const ids = useMemo(() => (today ? orderedIds(today) : NO_IDS), [today])
  const { focusedId, tabStopId, setFocusedId } = useFocus(ids, today?.date)
  const [keyState, setKeyState] = useState<KeyState>({ pending: null })
  const [changed, setChanged] = useState<RowsState['changed']>(null)

  const items = useMemo(
    () => [...(today?.carried.flatMap((g) => g.items) ?? []), ...(today?.rail ?? [])],
    [today],
  )
  const focused = items.find((item) => item.id === focusedId)
  // A pending capture has no server id yet: no done, snooze or undo until it is confirmed. While
  // the viewed page loads, the rows on screen are the previous page's: no actions either.
  const target: Target =
    focused && !isPendingId(focused.id) && !bar.blocked
      ? focused.doneAt === null
        ? 'open'
        : 'done'
      : null

  const [sheetId, setSheetId] = useState<string | null>(null)
  const sheetItem = items.find((item) => item.id === sheetId)

  /** One path for keys and sheet buttons: same callbacks, same row animation. */
  const run = (
    command: Exclude<KeyCommand, { type: 'move' | 'capture' | 'day' | 'today' }>,
    id: string,
  ) => {
    if (command.type === 'done') {
      setChanged({ id, kind: 'done' })
      actions.done(id)
    } else if (command.type === 'undo') {
      setChanged(null)
      actions.undo(id)
    } else {
      setChanged({ id, kind: 'snooze' })
      actions.snooze(id, command.preset)
    }
  }

  const handle = (key: string): boolean => {
    const next = reduceKey(keyState, key, target, { filterActive: false, offToday: days.offToday })
    setKeyState(next.state)
    const { command } = next
    if (command?.type === 'capture') bar.onOpen()
    else if (command?.type === 'move') setFocusedId(step(ids, focusedId, command.delta))
    else if (command?.type === 'day') days.onStep(command.delta)
    else if (command?.type === 'today') days.onToday()
    else if (command !== null && focusedId !== null) run(command, focusedId)
    return command !== null || next.state.pending !== keyState.pending
  }
  useKeyboardLayer(today !== undefined && !bar.open && sheetItem === undefined, handle)

  const armed = keyState.pending === 's' && target === 'open'
  const rows: RowsState = {
    ...IDLE_ROWS,
    focusedId,
    tabStopId,
    changed,
    onFocusRow: (id: string) => {
      setFocusedId(id)
      // A tap on a phone opens the sheet; a pending capture has no actions yet.
      if (bar.mobile && !bar.blocked && !isPendingId(id)) setSheetId(id)
    },
    onChangeSettled: () => setChanged(null),
  }
  const sheet: SheetState | null =
    sheetItem === undefined
      ? null
      : {
          item: sheetItem,
          onDone: () => closeAfter({ type: 'done' }),
          onUndo: () => closeAfter({ type: 'undo' }),
          onSnooze: (preset) => closeAfter({ type: 'snooze', preset }),
          onClose: () => setSheetId(null),
        }
  function closeAfter(command: Parameters<typeof run>[0]) {
    if (sheetId !== null) run(command, sheetId)
    setSheetId(null)
  }
  return {
    rows,
    armed,
    sheet,
    hints: availableKeys({
      hasRows: ids.length > 0,
      target,
      armed,
      days: today !== undefined,
      offToday: days.offToday,
    }),
  }
}
