import { messages } from '../../messages'
import styles from './PushControl.module.css'
import type { PushState } from './push-client'

const t = messages.notifications

interface Props {
  state: PushState
  /** A click is in flight: the action is disabled until it settles. */
  busy: boolean
  /** The last enable attempt failed: one error line. */
  failed: boolean
  /** In the phone bar: the parts join the bar's row instead of stacking in the column. */
  compact?: boolean
  onEnable: () => void
  onDisable: () => void
}

/** Opt-in notifications (notification-permission spec): props only, never asks by itself. */
export function PushControl({ state, busy, failed, compact = false, onEnable, onDisable }: Props) {
  const text = { granted: t.on, denied: t.denied, unsupported: t.unsupported, default: null }[state]
  const action = { default: onEnable, granted: onDisable, denied: null, unsupported: null }[state]
  const label = state === 'granted' ? t.turnOff : t.enable
  return (
    <div className={compact ? `${styles.control} ${styles.compact}` : styles.control}>
      {text === null ? null : <p className={styles.text}>{text}</p>}
      {action === null ? null : (
        <button
          className={styles.action}
          type="button"
          disabled={busy}
          aria-busy={busy || undefined}
          onClick={action}
        >
          {label}
        </button>
      )}
      {failed ? (
        <p className={styles.text} role="alert">
          {t.failed}
        </p>
      ) : null}
    </div>
  )
}
