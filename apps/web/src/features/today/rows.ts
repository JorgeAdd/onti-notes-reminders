/** What every row needs to know about focus and animation, owned by the container (Decision 13). */
export interface RowsState {
  /** The row the keys act on; it also holds DOM focus. */
  focusedId: string | null
  /** Roving tabindex: the one row in the tab order (the focused row, else the first). */
  tabStopId: string | null
  /** The row an action just changed: the only one that animates (never on first render). */
  changed: { id: string; kind: 'done' | 'snooze' } | null
  onFocusRow: (id: string) => void
  onChangeSettled: () => void
}

const noop = () => undefined

export const IDLE_ROWS: RowsState = {
  focusedId: null,
  tabStopId: null,
  changed: null,
  onFocusRow: noop,
  onChangeSettled: noop,
}
