import { at } from '@onti/shared/fixtures/jorge-week'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  CLAIM_BATCH,
  makeDispatchDue,
  MAX_BATCHES_PER_TICK,
  MAX_PUSH_FAILURES,
} from '../src/application/dispatch-due'
import { noteId } from './fakes'
import {
  dueNote,
  FakePushSender,
  FakeTokens,
  InMemoryReminderClaimer,
  InMemorySubscriptionStore,
  MutableClock,
  RecordingLog,
  USER_A,
  USER_B,
} from './push-fakes'

const API_URL = 'https://api.example.com'

let clock: MutableClock
let claimer: InMemoryReminderClaimer
let subscriptions: InMemorySubscriptionStore
let sender: FakePushSender
let tokens: FakeTokens
let log: RecordingLog
let dispatch: ReturnType<typeof makeDispatchDue>

beforeEach(() => {
  clock = new MutableClock(at('2026-10-06 17:00'))
  claimer = new InMemoryReminderClaimer()
  subscriptions = new InMemorySubscriptionStore()
  sender = new FakePushSender()
  tokens = new FakeTokens()
  log = new RecordingLog()
  dispatch = makeDispatchDue({
    clock,
    claimer,
    subscriptions,
    sender,
    tokens,
    apiUrl: API_URL,
    log,
  })
})

describe('dispatch: one push per due_at (C2, R10)', () => {
  it('sends once at 17:00 and claims nothing on the second tick', async () => {
    claimer.add(dueNote(1, at('2026-10-06 17:00')))
    subscriptions.add(USER_A, 'sub-1')

    expect(await dispatch.tick()).toEqual({ claimed: 1 })
    expect(sender.calls).toHaveLength(1)
    expect(claimer.get(noteId(1)).reminder.notifiedDueAt).toEqual(at('2026-10-06 17:00'))

    expect(await dispatch.tick()).toEqual({ claimed: 0 })
    expect(sender.calls).toHaveLength(1)
  })

  it('reads now once per tick from the clock and passes it to the claim', async () => {
    await dispatch.tick()
    expect(claimer.calls[0]).toEqual({ now: at('2026-10-06 17:00'), limit: CLAIM_BATCH })
  })

  it('embeds a token for that note and due instant that expires in 24 h', async () => {
    claimer.add(dueNote(1, at('2026-10-06 17:00')))
    subscriptions.add(USER_A, 'sub-1')
    await dispatch.tick()

    const claims = tokens.signed[0]!
    expect(claims).toEqual({
      v: 1,
      noteId: noteId(1),
      userId: USER_A,
      dueAt: at('2026-10-06 17:00').getTime(),
      actions: ['done', 'snooze'],
      exp: at('2026-10-06 17:00').getTime() / 1000 + 86_400,
    })
    expect(sender.calls[0]!.payload.token).toBe('token-1')
    expect(sender.calls[0]!.payload.apiUrl).toBe(API_URL)
  })
})

describe('dispatch: re-armed after a snooze (C5)', () => {
  it('sends nothing at 11:04 and one push at 11:05', async () => {
    const snoozed = dueNote(2, at('2026-10-07 11:05'))
    snoozed.reminder = {
      dueAt: at('2026-10-07 11:05'),
      originalDueAt: at('2026-10-06 18:00'),
      snoozeCount: 1,
      doneAt: null,
      notifiedDueAt: at('2026-10-07 10:05'),
    }
    claimer.add(snoozed)
    subscriptions.add(USER_A, 'sub-1')

    clock.set(at('2026-10-07 11:04'))
    expect(await dispatch.tick()).toEqual({ claimed: 0 })
    expect(sender.calls).toHaveLength(0)

    clock.set(at('2026-10-07 11:05'))
    expect(await dispatch.tick()).toEqual({ claimed: 1 })
    expect(sender.calls).toHaveLength(1)
  })
})

describe('dispatch: claim without subscription (C7)', () => {
  it('marks the reminder as notified and sends nothing', async () => {
    clock.set(at('2026-10-07 09:30'))
    claimer.add(dueNote(4, at('2026-10-07 09:30')))

    expect(await dispatch.tick()).toEqual({ claimed: 1 })
    expect(claimer.get(noteId(4)).reminder.notifiedDueAt).toEqual(at('2026-10-07 09:30'))
    expect(sender.calls).toHaveLength(0)
    expect(tokens.signed).toHaveLength(0)
  })
})

describe('dispatch: which reminders are picked', () => {
  it('sends a past capture on the next tick', async () => {
    clock.set(at('2026-10-07 09:05'))
    claimer.add(dueNote(5, at('2026-10-07 08:00')))
    subscriptions.add(USER_A, 'sub-1')

    expect(await dispatch.tick()).toEqual({ claimed: 1 })
    expect(sender.calls).toHaveLength(1)
  })

  it('skips a done note and a future note', async () => {
    const done = dueNote(6, at('2026-10-06 16:00'))
    done.reminder = { ...done.reminder, doneAt: at('2026-10-06 16:30') }
    claimer.add(done)
    claimer.add(dueNote(7, at('2026-10-06 17:01')))
    subscriptions.add(USER_A, 'sub-1')

    expect(await dispatch.tick()).toEqual({ claimed: 0 })
    expect(sender.calls).toHaveLength(0)
  })

  it('does not retry a reminder whose send threw', async () => {
    claimer.add(dueNote(1, at('2026-10-06 17:00')))
    subscriptions.add(USER_A, 'sub-1')
    sender.outcomes.set('sub-1', new Error('boom'))

    await dispatch.tick()
    expect(await dispatch.tick()).toEqual({ claimed: 0 })
    expect(sender.calls).toHaveLength(1)
  })
})

describe('dispatch: every device and sender outcomes', () => {
  beforeEach(() => {
    claimer.add(dueNote(1, at('2026-10-06 17:00')))
  })

  it('sends to each of three subscriptions', async () => {
    for (const id of ['a', 'b', 'c']) subscriptions.add(USER_A, id)
    await dispatch.tick()
    expect(sender.calls.map((c) => c.subscription.id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('does not send to another user subscriptions', async () => {
    subscriptions.add(USER_A, 'mine')
    subscriptions.add(USER_B, 'theirs')
    await dispatch.tick()
    expect(sender.calls.map((c) => c.subscription.id)).toEqual(['mine'])
  })

  it('deletes a gone endpoint and still sends to the other device', async () => {
    subscriptions.add(USER_A, 'gone')
    subscriptions.add(USER_A, 'alive')
    sender.outcomes.set('gone', { kind: 'gone' })

    await dispatch.tick()
    expect(sender.calls).toHaveLength(2)
    expect(subscriptions.ids()).toEqual(['alive'])
    expect(subscriptions.get('alive')!.lastSuccessAt).toEqual(at('2026-10-06 17:00'))
  })

  it('counts a failure and keeps the row', async () => {
    subscriptions.add(USER_A, 'flaky')
    sender.outcomes.set('flaky', { kind: 'failed' })

    await dispatch.tick()
    expect(subscriptions.get('flaky')!.failureCount).toBe(1)
  })

  it('counts a send that throws as a failure', async () => {
    subscriptions.add(USER_A, 'flaky')
    sender.outcomes.set('flaky', new Error('network'))

    await dispatch.tick()
    expect(subscriptions.get('flaky')!.failureCount).toBe(1)
  })

  it(`drops the subscription at ${MAX_PUSH_FAILURES} consecutive failures`, async () => {
    subscriptions.add(USER_A, 'dead')
    sender.outcomes.set('dead', { kind: 'failed' })

    for (let n = 1; n <= MAX_PUSH_FAILURES; n++) {
      expect(subscriptions.get('dead')).toBeDefined()
      if (n > 1) claimer.add(dueNote(100 + n, at('2026-10-06 17:00')))
      await dispatch.tick()
    }
    expect(subscriptions.get('dead')).toBeUndefined()
  })

  it('resets the failure count after a success', async () => {
    const row = subscriptions.add(USER_A, 'recovering')
    row.failureCount = 3

    await dispatch.tick()
    expect(subscriptions.get('recovering')!.failureCount).toBe(0)
  })
})

describe('dispatch: isolation and bounds', () => {
  it("one reminder's error does not stop the others", async () => {
    claimer.add(dueNote(1, at('2026-10-06 17:00'), { userId: USER_B }))
    claimer.add(dueNote(2, at('2026-10-06 17:00'), { userId: USER_A }))
    subscriptions.add(USER_A, 'sub-a')
    subscriptions.failingUsers.add(USER_B)

    expect(await dispatch.tick()).toEqual({ claimed: 2 })
    expect(sender.calls.map((c) => c.subscription.id)).toEqual(['sub-a'])
    expect(log.errors).toHaveLength(1)
    expect(JSON.stringify(log.errors)).not.toContain('push.example.com')
  })

  it('claims again while a batch comes back full', async () => {
    for (let n = 1; n <= CLAIM_BATCH + 5; n++) claimer.add(dueNote(n, at('2026-10-06 16:00')))
    expect(await dispatch.tick()).toEqual({ claimed: CLAIM_BATCH + 5 })
    expect(claimer.calls).toHaveLength(2)
  })

  it(`stops after ${MAX_BATCHES_PER_TICK} batches and leaves the rest for the next tick`, async () => {
    const total = CLAIM_BATCH * MAX_BATCHES_PER_TICK + 7
    for (let n = 1; n <= total; n++) claimer.add(dueNote(n, at('2026-10-06 16:00')))

    expect(await dispatch.tick()).toEqual({ claimed: CLAIM_BATCH * MAX_BATCHES_PER_TICK })
    expect(claimer.calls).toHaveLength(MAX_BATCHES_PER_TICK)
    expect(await dispatch.tick()).toEqual({ claimed: 7 })
  })
})
