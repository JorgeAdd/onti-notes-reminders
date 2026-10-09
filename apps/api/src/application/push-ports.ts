import type { ActionClaims, PushPayload } from '@onti/shared'

/** A reminder the scheduler claimed, with what the notification needs (no other table is read). */
export interface ClaimedReminder {
  noteId: string
  userId: string
  title: string
  /** The head of the body only; the claim cuts it. */
  body: string
  dueAt: Date
  /** The owner's IANA zone, `UTC` when the profile has none. */
  timezone: string
  tagNames: string[]
}

/** Atomically picks and marks due reminders as notified (R10): at-most-once per `due_at`. */
export interface ReminderClaimer {
  claimDue(now: Date, limit: number): Promise<ClaimedReminder[]>
}

/** One browser's push endpoint. The endpoint is a capability URL: never log it. */
export interface PushSubscription {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

/** The scheduler's view of subscriptions (owner role). */
export interface SubscriptionStore {
  listForUser(userId: string): Promise<PushSubscription[]>
  recordSuccess(id: string, now: Date): Promise<void>
  /** Counts one more consecutive failure and deletes the row once it reaches `maxFailures`. */
  registerFailure(id: string, maxFailures: number): Promise<void>
  remove(id: string): Promise<void>
}

export type SendOutcome = { kind: 'sent' } | { kind: 'gone' } | { kind: 'failed' }

/** Delivers one payload to one subscription. Never throws: failures are outcomes. */
export interface PushSender {
  send(subscription: PushSubscription, payload: PushPayload): Promise<SendOutcome>
}

/** Signs and verifies the action tokens carried by notifications (ADR-004). */
export interface ActionTokens {
  sign(claims: ActionClaims): string
  /** `null` for anything that is not a valid, unexpired token at `now`. */
  verify(token: string, now: Date): ActionClaims | null
}

/** Logging without endpoints, tokens, keys or payloads. */
export interface PushLog {
  error(message: string, context?: Record<string, unknown>): void
}
