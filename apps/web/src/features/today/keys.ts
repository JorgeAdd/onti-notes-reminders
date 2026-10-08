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
export type KeyHint =
  'move' | 'done' | 'undo' | 'snooze' | 'hour' | 'tomorrow' | 'cancel' | 'capture'

export const SNOOZE_KEYS = { hour: 'h', tomorrow: 't' } as const

/**
 * Decision 12 · one pure step of the key layer. `s` arms the snooze menu; `h` or `t` fires it;
 * esc or any other key disarms, with no timeout. Keys with no valid target do nothing.
 */
export function reduceKey(
  state: KeyState,
  key: string,
  target: Target,
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
  if (key === 'c') return { state: idle, command: { type: 'capture' } }
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
}): KeyHint[] {
  if (!context.hasRows) return ['capture']
  if (context.armed) return ['hour', 'tomorrow', 'cancel']
  if (context.target === 'open') return ['move', 'done', 'snooze', 'capture']
  if (context.target === 'done') return ['move', 'undo', 'capture']
  return ['move', 'capture']
}
