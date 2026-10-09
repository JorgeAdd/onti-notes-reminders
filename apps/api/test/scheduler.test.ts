import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createScheduler,
  systemTimer,
  type IntervalTimer,
} from '../src/infrastructure/push/scheduler'

/** A timer the test fires by hand. */
class FakeTimer implements IntervalTimer {
  armed: { ms: number; fn: () => void }[] = []
  cancelled = 0

  every(ms: number, fn: () => void): () => void {
    this.armed.push({ ms, fn })
    return () => {
      this.cancelled += 1
    }
  }

  fire(): void {
    for (const { fn } of this.armed) fn()
  }
}

function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve))

describe('createScheduler', () => {
  it('ticks at once on start and arms the timer once, every 30 s', async () => {
    const timer = new FakeTimer()
    const run = vi.fn(() => Promise.resolve())
    const scheduler = createScheduler({ run, timer, onError: vi.fn() })

    scheduler.start()
    scheduler.start()
    await flush()

    expect(run).toHaveBeenCalledTimes(1)
    expect(timer.armed).toHaveLength(1)
    expect(timer.armed[0]!.ms).toBe(30_000)
  })

  it('runs again on every fire', async () => {
    const timer = new FakeTimer()
    const run = vi.fn(() => Promise.resolve())
    createScheduler({ run, timer, onError: vi.fn() }).start()
    await flush()

    timer.fire()
    await flush()
    timer.fire()
    await flush()

    expect(run).toHaveBeenCalledTimes(3)
  })

  it('skips a fire while the previous tick is still in flight', async () => {
    const timer = new FakeTimer()
    const pending = deferred()
    const run = vi.fn(() => pending.promise)
    createScheduler({ run, timer, onError: vi.fn() }).start()

    timer.fire()
    timer.fire()
    expect(run).toHaveBeenCalledTimes(1)

    pending.resolve()
    await flush()
    timer.fire()
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('logs a rejecting run and runs again on the next fire', async () => {
    const timer = new FakeTimer()
    const onError = vi.fn()
    const run = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValue(undefined)
    createScheduler({ run, timer, onError }).start()
    await flush()

    expect(onError).toHaveBeenCalledWith(new Error('db down'))
    timer.fire()
    await flush()
    expect(run).toHaveBeenCalledTimes(2)
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('stop cancels the timer and waits for the tick in flight', async () => {
    const timer = new FakeTimer()
    const pending = deferred()
    const scheduler = createScheduler({ run: () => pending.promise, timer, onError: vi.fn() })
    scheduler.start()

    let stopped = false
    const stopping = scheduler.stop().then(() => {
      stopped = true
    })
    await flush()
    expect(timer.cancelled).toBe(1)
    expect(stopped).toBe(false)

    pending.resolve()
    await stopping
    expect(stopped).toBe(true)
  })

  it('stop before start is a no-op', async () => {
    const timer = new FakeTimer()
    await createScheduler({ run: () => Promise.resolve(), timer, onError: vi.fn() }).stop()
    expect(timer.cancelled).toBe(0)
  })
})

describe('systemTimer', () => {
  afterEach(() => vi.useRealTimers())

  it('calls back every interval until cancelled', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const cancel = systemTimer.every(1_000, fn)

    vi.advanceTimersByTime(3_000)
    expect(fn).toHaveBeenCalledTimes(3)

    cancel()
    vi.advanceTimersByTime(3_000)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('does not keep the process alive', () => {
    vi.useFakeTimers()
    const spy = vi.spyOn(globalThis, 'setInterval')
    systemTimer.every(1_000, () => undefined)
    const handle = spy.mock.results[0]!.value as NodeJS.Timeout
    expect(handle.hasRef()).toBe(false)
  })
})
