import type { Kysely } from 'kysely'
import type { Clock } from './application/ports'
import { makeDispatchDue } from './application/dispatch-due'
import type { PushLog } from './application/push-ports'
import type { Database } from './infrastructure/db/database'
import { PostgresPushSubscriptions } from './infrastructure/db/postgres-push-subscriptions'
import { PostgresReminderClaimer } from './infrastructure/db/postgres-reminder-claimer'
import { HmacActionTokens } from './infrastructure/push/hmac-action-tokens'
import { createScheduler, systemTimer, type IntervalTimer } from './infrastructure/push/scheduler'
import { WebPushSender, type WebPushClient } from './infrastructure/push/web-push-sender'
import type { PushConfig } from './push-config'

export interface PushRuntimeDeps {
  /** `null`: push is disabled and nothing is built. */
  push: PushConfig | null
  db: Kysely<Database>
  clock: Clock
  /** The `web-push` module (default import), injected so tests never touch the network. */
  client: WebPushClient
  log: PushLog
  timer?: IntervalTimer
}

export interface PushRuntime {
  scheduler: { start(): void; stop(): Promise<void> }
}

/** Composition of the push side: sender, tokens, claimer, subscriptions, dispatch and scheduler. */
export function createPushRuntime(deps: PushRuntimeDeps): PushRuntime | null {
  const { push, db, clock, client, log, timer = systemTimer } = deps
  if (push === null) return null

  const dispatch = makeDispatchDue({
    clock,
    claimer: new PostgresReminderClaimer(db),
    subscriptions: new PostgresPushSubscriptions(db),
    sender: new WebPushSender(client, {
      subject: push.vapidSubject,
      publicKey: push.vapidPublicKey,
      privateKey: push.vapidPrivateKey,
    }),
    tokens: new HmacActionTokens(push.actionSecret),
    apiUrl: push.apiPublicUrl,
    log,
  })
  const scheduler = createScheduler({
    run: () => dispatch.tick(),
    timer,
    // Only the message: it never carries an endpoint, token or key.
    onError: (error) =>
      log.error('push tick failed', { error: error instanceof Error ? error.message : 'unknown' }),
  })
  return { scheduler }
}
