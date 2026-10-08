import { useEffect, useState } from 'react'

/** How long Today may load before the status card appears; a fast load never shows it. */
export const STATUS_DELAY_MS = 400

/** True once `active` has stayed true for `ms`. A timer, not the clock (CLAUDE.md rule 16). */
export function useAfterDelay(active: boolean, ms: number): boolean {
  const [elapsed, setElapsed] = useState(false)
  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => setElapsed(true), ms)
    return () => {
      clearTimeout(timer)
      setElapsed(false)
    }
  }, [active, ms])
  return active && elapsed
}
