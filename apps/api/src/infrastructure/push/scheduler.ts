/** The timer port: calls `fn` every `ms` until the returned function is called. */
export interface IntervalTimer {
  every(ms: number, fn: () => void): () => void
}

/** `setInterval` that never keeps the process alive. */
export const systemTimer: IntervalTimer = {
  every(ms, fn) {
    const handle = setInterval(fn, ms)
    handle.unref()
    return () => clearInterval(handle)
  },
}

export const TICK_INTERVAL_MS = 30_000

export interface SchedulerOptions {
  run: () => Promise<unknown>
  timer: IntervalTimer
  intervalMs?: number
  onError: (error: unknown) => void
}

/**
 * Runs `run` once at `start()` and then every interval. A fire is skipped while the previous run
 * is in flight, a failing run is reported and does not stop the schedule, and `stop()` cancels
 * the timer and waits for the run in flight.
 */
export function createScheduler(options: SchedulerOptions) {
  const { run, timer, intervalMs = TICK_INTERVAL_MS, onError } = options
  let cancel: (() => void) | null = null
  let inFlight: Promise<void> | null = null

  function fire(): void {
    if (inFlight) return
    inFlight = run()
      .then(
        () => undefined,
        (error: unknown) => onError(error),
      )
      .finally(() => {
        inFlight = null
      })
  }

  return {
    start(): void {
      if (cancel) return
      cancel = timer.every(intervalMs, fire)
      fire()
    },
    async stop(): Promise<void> {
      cancel?.()
      cancel = null
      await inFlight
    },
  }
}
