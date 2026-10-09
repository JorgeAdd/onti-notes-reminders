import {
  isNotificationDue,
  markNotified,
  type ActionClaims,
  type PushPayload,
  type Reminder,
} from '@onti/shared'
import type { Clock } from '../src/application/ports'
import type {
  ActionTokens,
  ClaimedReminder,
  NewSubscription,
  PushLog,
  PushSender,
  PushSubscription,
  ReminderClaimer,
  SendOutcome,
  SubscriptionRepository,
  SubscriptionStore,
} from '../src/application/push-ports'
import type { Identity } from '../src/domain/identity'
import { noteId } from './fakes'

/** A clock the test moves by hand. */
export class MutableClock implements Clock {
  constructor(private instant: Date) {}
  now(): Date {
    return this.instant
  }
  set(instant: Date): void {
    this.instant = instant
  }
}

/** A stored note as the claimer sees it: what the notification needs plus the reminder fields. */
export interface DueNote extends ClaimedReminder {
  reminder: Reminder
}

export const USER_A = '7b0c5a2e-3f4d-4c1a-9e8b-2d6f0a1b3c4d'
export const USER_B = '1d2e3f40-5a6b-4c7d-8e9f-0a1b2c3d4e5f'

export function dueNote(n: number, dueAt: Date | null, overrides: Partial<DueNote> = {}): DueNote {
  return {
    noteId: noteId(n),
    userId: USER_A,
    title: `Note ${n}`,
    body: '',
    dueAt: dueAt ?? new Date(0),
    timezone: 'UTC',
    tagNames: [],
    reminder: {
      dueAt,
      originalDueAt: dueAt,
      snoozeCount: 0,
      doneAt: null,
      notifiedDueAt: null,
    },
    ...overrides,
  }
}

/** Claims like the SQL statement: the predicate is the CONTRACT's `isNotificationDue`, ordered by due time then id. */
export class InMemoryReminderClaimer implements ReminderClaimer {
  readonly calls: { now: Date; limit: number }[] = []

  constructor(private readonly notes: DueNote[] = []) {}

  add(note: DueNote): void {
    this.notes.push(note)
  }

  get(id: string): DueNote {
    const found = this.notes.find((n) => n.noteId === id)
    if (!found) throw new Error(`No note ${id}`)
    return found
  }

  claimDue(now: Date, limit: number): Promise<ClaimedReminder[]> {
    this.calls.push({ now, limit })
    const due = this.notes
      .filter((n) => isNotificationDue(n.reminder, now))
      .sort(
        (a, b) =>
          a.reminder.dueAt!.getTime() - b.reminder.dueAt!.getTime() ||
          (a.noteId < b.noteId ? -1 : 1),
      )
      .slice(0, limit)
    for (const note of due) {
      note.reminder = markNotified({
        ...note.reminder,
        dueAt: note.reminder.dueAt!,
        originalDueAt: note.reminder.originalDueAt!,
      })
    }
    return Promise.resolve(
      due.map(({ reminder, ...claimed }) => ({ ...claimed, dueAt: reminder.dueAt! })),
    )
  }
}

export interface StoredSubscription extends PushSubscription {
  userId: string
  failureCount: number
  lastSuccessAt: Date | null
}

export class InMemorySubscriptionStore implements SubscriptionStore {
  private readonly rows = new Map<string, StoredSubscription>()
  /** User ids whose listing throws, to prove one reminder's error stops nobody else. */
  readonly failingUsers = new Set<string>()

  add(userId: string, id: string): StoredSubscription {
    const row: StoredSubscription = {
      id,
      userId,
      endpoint: `https://push.example.com/${id}`,
      p256dh: 'p256dh',
      auth: 'auth',
      failureCount: 0,
      lastSuccessAt: null,
    }
    this.rows.set(id, row)
    return row
  }

  get(id: string): StoredSubscription | undefined {
    return this.rows.get(id)
  }

  ids(): string[] {
    return [...this.rows.keys()]
  }

  listForUser(userId: string): Promise<PushSubscription[]> {
    if (this.failingUsers.has(userId)) return Promise.reject(new Error('store down'))
    return Promise.resolve([...this.rows.values()].filter((r) => r.userId === userId))
  }

  recordSuccess(id: string, now: Date): Promise<void> {
    const row = this.rows.get(id)
    if (row) {
      row.failureCount = 0
      row.lastSuccessAt = now
    }
    return Promise.resolve()
  }

  registerFailure(id: string, maxFailures: number): Promise<void> {
    const row = this.rows.get(id)
    if (row) {
      row.failureCount += 1
      if (row.failureCount >= maxFailures) this.rows.delete(id)
    }
    return Promise.resolve()
  }

  remove(id: string): Promise<void> {
    this.rows.delete(id)
    return Promise.resolve()
  }
}

export interface UserSubscription extends NewSubscription {
  userId: string
  failureCount: number
}

/** The user side like the adapter: one row per endpoint, subscribe reassigns it, delete is owner-scoped. */
export class InMemorySubscriptions implements SubscriptionRepository {
  private readonly rows = new Map<string, UserSubscription>()

  row(endpoint: string): UserSubscription | undefined {
    return this.rows.get(endpoint)
  }

  forUser(userId: string): UserSubscription[] {
    return [...this.rows.values()].filter((r) => r.userId === userId)
  }

  all(): UserSubscription[] {
    return [...this.rows.values()]
  }

  subscribe(userId: string, input: NewSubscription): Promise<void> {
    this.rows.set(input.endpoint, { ...input, userId, failureCount: 0 })
    return Promise.resolve()
  }

  unsubscribe(identity: Identity, endpoint: string): Promise<void> {
    if (this.rows.get(endpoint)?.userId === identity.userId) this.rows.delete(endpoint)
    return Promise.resolve()
  }
}

/** Answers `sent` unless told otherwise per subscription id; an `Error` value makes the send throw. */
export class FakePushSender implements PushSender {
  readonly calls: { subscription: PushSubscription; payload: PushPayload }[] = []
  readonly outcomes = new Map<string, SendOutcome | Error>()

  send(subscription: PushSubscription, payload: PushPayload): Promise<SendOutcome> {
    this.calls.push({ subscription, payload })
    const outcome = this.outcomes.get(subscription.id) ?? { kind: 'sent' }
    return outcome instanceof Error ? Promise.reject(outcome) : Promise.resolve(outcome)
  }
}

/** Tokens that are readable in assertions: the token is its own lookup key. */
export class FakeTokens implements ActionTokens {
  readonly signed: ActionClaims[] = []

  sign(claims: ActionClaims): string {
    this.signed.push(claims)
    return `token-${this.signed.length}`
  }

  verify(token: string, now: Date): ActionClaims | null {
    const claims = this.signed[Number(token.replace('token-', '')) - 1]
    return claims && now.getTime() < claims.exp * 1000 ? claims : null
  }
}

export class RecordingLog implements PushLog {
  readonly errors: { message: string; context: Record<string, unknown> | undefined }[] = []
  error(message: string, context?: Record<string, unknown>): void {
    this.errors.push({ message, context })
  }
}
