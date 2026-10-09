import { PUSH_ACTIONS } from '@onti/shared'
import type { Clock } from './ports'
import { buildPushPayload } from './push-payload'
import type {
  ActionTokens,
  ClaimedReminder,
  PushLog,
  PushSender,
  PushSubscription,
  ReminderClaimer,
  SendOutcome,
  SubscriptionStore,
} from './push-ports'

/** Reminders claimed per statement. */
export const CLAIM_BATCH = 100
/** A tick claims at most this many batches; the rest waits for the next tick. */
export const MAX_BATCHES_PER_TICK = 10
/** Consecutive failures after which a subscription is dropped. */
export const MAX_PUSH_FAILURES = 5
/** How long the Done and "+1 h" buttons of a notification keep working. */
export const ACTION_TOKEN_TTL_SECONDS = 24 * 3600

export interface DispatchDeps {
  clock: Clock
  claimer: ReminderClaimer
  subscriptions: SubscriptionStore
  sender: PushSender
  tokens: ActionTokens
  /** Public URL of this API, carried in the payload so the service worker needs no build-time URL. */
  apiUrl: string
  log: PushLog
}

/**
 * One scheduler tick (R10): claim due reminders (marked as notified BEFORE any send, so a reminder
 * is sent at most once per `due_at`), then push each to every device of its owner. A failure for
 * one reminder or one device never stops the others, and nothing is retried.
 */
export function makeDispatchDue(deps: DispatchDeps) {
  const { clock, claimer, subscriptions, sender, tokens, apiUrl, log } = deps

  async function sendOne(
    subscription: PushSubscription,
    payload: Parameters<PushSender['send']>[1],
    now: Date,
  ) {
    let outcome: SendOutcome
    try {
      outcome = await sender.send(subscription, payload)
    } catch {
      outcome = { kind: 'failed' }
    }
    if (outcome.kind === 'sent') await subscriptions.recordSuccess(subscription.id, now)
    else if (outcome.kind === 'gone') await subscriptions.remove(subscription.id)
    else await subscriptions.registerFailure(subscription.id, MAX_PUSH_FAILURES)
  }

  async function notify(reminder: ClaimedReminder, now: Date): Promise<void> {
    const devices = await subscriptions.listForUser(reminder.userId)
    if (devices.length === 0) return // C7: marked as notified, still on Today
    const token = tokens.sign({
      v: 1,
      noteId: reminder.noteId,
      userId: reminder.userId,
      dueAt: reminder.dueAt.getTime(),
      actions: [...PUSH_ACTIONS],
      exp: Math.floor(now.getTime() / 1000) + ACTION_TOKEN_TTL_SECONDS,
    })
    const payload = buildPushPayload(reminder, { token, apiUrl })
    await Promise.all(devices.map((device) => sendOne(device, payload, now)))
  }

  async function tick(): Promise<{ claimed: number }> {
    const now = clock.now()
    let claimed = 0
    for (let batch = 0; batch < MAX_BATCHES_PER_TICK; batch++) {
      const reminders = await claimer.claimDue(now, CLAIM_BATCH)
      claimed += reminders.length
      const results = await Promise.allSettled(reminders.map((r) => notify(r, now)))
      for (const result of results) {
        // The reason may echo an endpoint: log that something failed, never what it said.
        if (result.status === 'rejected') log.error('push dispatch failed for one reminder')
      }
      if (reminders.length < CLAIM_BATCH) break
    }
    return { claimed }
  }

  return { tick }
}
