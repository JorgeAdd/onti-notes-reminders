import type { SnoozePreset } from '@onti/shared'

export type KeyState = { pending: null | 's' }
/** What the focused row allows: open items can be done or snoozed, done items undone. */
export type Target = 'open' | 'done' | null
export type KeyCommand =
  | { type: 'move'; delta: 1 | -1 }
  | { type: 'done' }
  | { type: 'undo' }
  | { type: 'snooze'; preset: SnoozePreset }
  | { type: 'capture' }
  | { type: 'edit' }
  | { type: 'day'; delta: 1 | -1 }
  | { type: 'today' }
  | { type: 'tags' }
  | { type: 'clearFilter' }
export type KeyHint =
  | 'move'
  | 'done'
  | 'undo'
  | 'snooze'
  | 'edit'
  | 'hour'
  | 'tomorrow'
  | 'cancel'
  | 'capture'
  | 'days'
  | 'today'
  | 'tags'
  | 'clear'
  | 'search'

/** What the page around the keys says: slice 3 keys depend on the viewed day. */
export interface KeyContext {
  filterActive: boolean
  offToday: boolean
  /** The account has tags: `#` has something to open. */
  hasTags?: boolean
}
const NO_CONTEXT: KeyContext = { filterActive: false, offToday: false }

export const SNOOZE_KEYS = { hour: 'h', tomorrow: 't' } as const

/**
 * Decision 12 · one pure step of the key layer. `s` arms the snooze menu; `h` or `t` fires it;
 * esc or any other key disarms, with no timeout. Keys with no valid target do nothing.
 */
export function reduceKey(
  state: KeyState,
  key: string,
  target: Target,
  context: KeyContext = NO_CONTEXT,
): { state: KeyState; command: KeyCommand | null } {
  const idle: KeyState = { pending: null }
  if (state.pending === 's') {
    const preset = (Object.keys(SNOOZE_KEYS) as SnoozePreset[]).find((p) => SNOOZE_KEYS[p] === key)
    const command: KeyCommand | null =
      preset !== undefined && target === 'open' ? { type: 'snooze', preset } : null
    return { state: idle, command }
  }
  if (key === 'j' || key === 'k') {
    return { state: idle, command: { type: 'move', delta: key === 'j' ? 1 : -1 } }
  }
  if (key === '[' || key === ']') {
    return { state: idle, command: { type: 'day', delta: key === ']' ? 1 : -1 } }
  }
  // Inside the snooze menu `t` is Tomorrow; here it goes back to today, only off today.
  if (key === 't' && context.offToday) return { state: idle, command: { type: 'today' } }
  if (key === '#' && context.hasTags) return { state: idle, command: { type: 'tags' } }
  // Esc order: the armed menu took its esc above and the tag bar closes on its own esc, so an
  // idle esc is the filter's.
  if (key === 'Escape' && context.filterActive) {
    return { state: idle, command: { type: 'clearFilter' } }
  }
  if (key === 'c') return { state: idle, command: { type: 'capture' } }
  if (key === 'e' && target !== null) return { state: idle, command: { type: 'edit' } }
  if (key === 'x' && target === 'open') return { state: idle, command: { type: 'done' } }
  if (key === 'z' && target === 'done') return { state: idle, command: { type: 'undo' } }
  if (key === 's' && target === 'open') return { state: { pending: 's' }, command: null }
  return { state: idle, command: null }
}

/** Statusline hints: only keys that work right now (slice 1 rule). */
export function availableKeys(context: {
  hasRows: boolean
  target: Target
  armed: boolean
  /** The day keys work (a page is on screen); `today` adds `t` when the view is another day. */
  days?: boolean
  offToday?: boolean
  /** `#` works (the account has tags); `filterActive` adds the esc that clears it. */
  tags?: boolean
  filterActive?: boolean
  /** `e` works: the app can open a note, so a focused row adds the edit hint. */
  edit?: boolean
}): KeyHint[] {
  if (context.armed && context.hasRows) return ['hour', 'tomorrow', 'cancel']
  const days: KeyHint[] = [
    ...(context.days ? (['days'] as const) : []),
    ...(context.days && context.offToday ? (['today'] as const) : []),
    ...(context.tags ? (['tags'] as const) : []),
    ...(context.tags && context.filterActive ? (['clear'] as const) : []),
  ]
  if (!context.hasRows) return ['capture', ...days]
  const edit: KeyHint[] = context.edit ? ['edit'] : []
  if (context.target === 'open') return ['move', 'done', 'snooze', ...edit, 'capture', ...days]
  if (context.target === 'done') return ['move', 'undo', ...edit, 'capture', ...days]
  return ['move', 'capture', ...days]
}
