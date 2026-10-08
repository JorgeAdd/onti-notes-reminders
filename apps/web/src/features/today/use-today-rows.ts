import type { TodayResponse } from '@onti/shared'
import { useMemo, useState } from 'react'
import { orderedIds, step, useFocus } from './focus'
import { availableKeys, reduceKey, type KeyState, type Target } from './keys'
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
  bar: { open: boolean; onOpen: () => void },
) {
  const ids = useMemo(() => (today ? orderedIds(today) : NO_IDS), [today])
  const { focusedId, tabStopId, setFocusedId } = useFocus(ids)
  const [keyState, setKeyState] = useState<KeyState>({ pending: null })
  const [changed, setChanged] = useState<RowsState['changed']>(null)

  const focused = [...(today?.carried.flatMap((g) => g.items) ?? []), ...(today?.rail ?? [])].find(
    (item) => item.id === focusedId,
  )
  // A pending capture has no server id yet: no done, snooze or undo until it is confirmed.
  const target: Target =
    focused && !isPendingId(focused.id) ? (focused.doneAt === null ? 'open' : 'done') : null

  const handle = (key: string): boolean => {
    const next = reduceKey(keyState, key, target)
    setKeyState(next.state)
    const { command } = next
    if (command?.type === 'capture') bar.onOpen()
    else if (command?.type === 'move') setFocusedId(step(ids, focusedId, command.delta))
    else if (command !== null && focusedId !== null) {
      if (command.type === 'done') {
        setChanged({ id: focusedId, kind: 'done' })
        actions.done(focusedId)
      } else if (command.type === 'undo') {
        setChanged(null)
        actions.undo(focusedId)
      } else {
        setChanged({ id: focusedId, kind: 'snooze' })
        actions.snooze(focusedId, command.preset)
      }
    }
    return command !== null || next.state.pending !== keyState.pending
  }
  useKeyboardLayer(today !== undefined && !bar.open, handle)

  const armed = keyState.pending === 's' && target === 'open'
  const rows: RowsState = {
    ...IDLE_ROWS,
    focusedId,
    tabStopId,
    changed,
    onFocusRow: setFocusedId,
    onChangeSettled: () => setChanged(null),
  }
  return { rows, armed, hints: availableKeys({ hasRows: ids.length > 0, target, armed }) }
}
