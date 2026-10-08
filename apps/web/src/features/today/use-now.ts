import { truncateToMinute } from '@onti/shared'
import { useEffect, useState } from 'react'
import { timeWithSkew } from '../../lib/clock'

const MINUTE = 60_000

/** Keep the same Date while the minute is unchanged, so React skips the re-render. */
const readNow = (skewMs: number) => truncateToMinute(timeWithSkew(skewMs))

const advance = (previous: Date, next: Date) =>
  previous.getTime() === next.getTime() ? previous : next

/**
 * Display time at minute precision: device time plus the server skew (Decision 6). Re-renders
 * only when the minute changes, scheduled for the next minute boundary rather than a drifting
 * interval, so "in 25 min" steps to "in 24 min" exactly on the minute (C7).
 */
export function useNow(skewMs: number): Date {
  const [state, setState] = useState(() => ({ skewMs, now: readNow(skewMs) }))
  // A new skew (after a refetch) re-reads right away: adjust state while rendering, not in an effect.
  if (state.skewMs !== skewMs) setState({ skewMs, now: readNow(skewMs) })

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(tick, MINUTE - (timeWithSkew(skewMs).getTime() % MINUTE))
    }
    const tick = () => {
      setState((prev) => ({ skewMs, now: advance(prev.now, readNow(skewMs)) }))
      schedule()
    }
    schedule()
    return () => clearTimeout(timer)
  }, [skewMs])

  return state.now
}
