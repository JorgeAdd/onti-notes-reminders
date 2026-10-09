import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  type Driver,
} from 'kysely'
import { describe, expect, it, vi } from 'vitest'
import type { PushConfig } from '../src/push-config'
import { createPushRouteDeps, createPushRuntime } from '../src/push-runtime'
import type { Database } from '../src/infrastructure/db/database'
import type { IntervalTimer } from '../src/infrastructure/push/scheduler'
import { HmacActionTokens } from '../src/infrastructure/push/hmac-action-tokens'
import { InMemoryNotes } from './fakes'
import { MutableClock, RecordingLog } from './push-fakes'

const config: PushConfig = {
  vapidPublicKey: 'pub',
  vapidPrivateKey: 'priv',
  vapidSubject: 'mailto:ops@example.com',
  actionSecret: 'a'.repeat(32),
  apiPublicUrl: 'https://api.example.com',
}

/** A Kysely that records the SQL it is asked to run and answers with no rows (or throws). */
function recordingDb(driver: Driver = new DummyDriver()) {
  const queries: string[] = []
  const db = new Kysely<Database>({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => driver,
      createIntrospector: (k) => new PostgresIntrospector(k),
      createQueryCompiler: () => new PostgresQueryCompiler(),
    },
    log: (event) => {
      if (event.level === 'query') queries.push(event.query.sql)
    },
  })
  return { db, queries }
}

class FakeTimer implements IntervalTimer {
  armed: { ms: number; fn: () => void }[] = []
  cancelled = 0
  every(ms: number, fn: () => void): () => void {
    this.armed.push({ ms, fn })
    return () => {
      this.cancelled += 1
    }
  }
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve))
const client = { sendNotification: vi.fn() }

function build(push: PushConfig | null, db: Kysely<Database>, log = new RecordingLog()) {
  const timer = new FakeTimer()
  const runtime = createPushRuntime({
    push,
    db,
    clock: new MutableClock(new Date('2026-10-06T17:00:00Z')),
    client,
    log,
    timer,
  })
  return { runtime, timer, log }
}

describe('createPushRuntime', () => {
  it('builds nothing when push is not configured: no scheduler, no timer, no query', async () => {
    const { db, queries } = recordingDb()
    const { runtime, timer } = build(null, db)

    expect(runtime).toBeNull()
    await flush()
    expect(timer.armed).toHaveLength(0)
    expect(queries).toEqual([])
    expect(client.sendNotification).not.toHaveBeenCalled()
  })

  it('arms the timer once on start and ticks at once through the claim statement', async () => {
    const { db, queries } = recordingDb()
    const { runtime, timer } = build(config, db)

    expect(runtime).not.toBeNull()
    expect(timer.armed).toHaveLength(0)

    runtime!.scheduler.start()
    await flush()

    expect(timer.armed.map((t) => t.ms)).toEqual([30_000])
    expect(queries).toHaveLength(1)
    expect(queries[0]).toContain('for update skip locked')
  })

  it('stop cancels the timer', async () => {
    const { db } = recordingDb()
    const { runtime, timer } = build(config, db)
    runtime!.scheduler.start()
    await runtime!.scheduler.stop()
    expect(timer.cancelled).toBe(1)
  })

  it('logs a failing tick without values and keeps the schedule', async () => {
    class FailingDriver extends DummyDriver {
      override acquireConnection(): never {
        throw new Error('db down')
      }
    }
    const { db } = recordingDb(new FailingDriver())
    const { runtime, timer, log } = build(config, db)

    runtime!.scheduler.start()
    await flush()
    timer.armed[0]!.fn()
    await flush()

    expect(log.errors.length).toBeGreaterThanOrEqual(2)
    expect(log.errors[0]!.message).toBe('push tick failed')
    expect(JSON.stringify(log.errors)).not.toContain(config.actionSecret)
  })
})

describe('createPushRouteDeps', () => {
  const now = new Date('2026-10-06T17:00:00Z')
  const build = (push: PushConfig | null) => {
    const { db, queries } = recordingDb()
    const deps = createPushRouteDeps({
      push,
      db,
      clock: new MutableClock(now),
      notes: new InMemoryNotes(),
    })
    return { deps, queries }
  }

  it('is absent when push is not configured, so the server registers no push route', () => {
    const { deps, queries } = build(null)
    expect(deps).toBeUndefined()
    expect(queries).toEqual([])
  })

  it('verifies tokens minted with the configured secret and rejects another secret', () => {
    const { deps } = build(config)
    const claims = {
      v: 1 as const,
      noteId: '00000000-0000-4000-8000-000000000001',
      userId: '7b0c5a2e-3f4d-4c1a-9e8b-2d6f0a1b3c4d',
      dueAt: now.getTime(),
      actions: ['done' as const],
      exp: now.getTime() / 1000 + 60,
    }
    expect(
      deps!.tokens.verify(new HmacActionTokens(config.actionSecret).sign(claims), now),
    ).toEqual(claims)
    expect(deps!.tokens.verify(new HmacActionTokens('z'.repeat(32)).sign(claims), now)).toBeNull()
    expect(deps!.clock.now()).toEqual(now)
  })
})
