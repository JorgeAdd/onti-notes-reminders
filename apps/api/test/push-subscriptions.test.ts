import { describe, expect, it } from 'vitest'
import { makeSubscriptionActions } from '../src/application/push-subscribe'
import { ANA, JORGE } from './fakes'
import { InMemorySubscriptions } from './push-fakes'

const E = 'https://push.example.com/send/E'
const input = { endpoint: E, keys: { p256dh: 'p256-key', auth: 'auth-key' } }

function setup() {
  const subscriptions = new InMemorySubscriptions()
  return { subscriptions, ...makeSubscriptionActions({ subscriptions }) }
}

describe('subscribe', () => {
  it('stores one row for the caller with a clean failure count and the user agent', async () => {
    const { subscriptions, subscribe } = setup()
    await subscribe(JORGE, input, 'Firefox/130')
    expect(subscriptions.forUser(JORGE.userId)).toEqual([
      {
        userId: JORGE.userId,
        endpoint: E,
        p256dh: 'p256-key',
        auth: 'auth-key',
        userAgent: 'Firefox/130',
        failureCount: 0,
      },
    ])
  })

  it('a repeat is still one row, with the failure count back to 0 and fresh keys', async () => {
    const { subscriptions, subscribe } = setup()
    await subscribe(JORGE, input, 'Firefox/130')
    subscriptions.row(E)!.failureCount = 3
    await subscribe(JORGE, { ...input, keys: { p256dh: 'new-p256', auth: 'new-auth' } }, undefined)
    const rows = subscriptions.forUser(JORGE.userId)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ p256dh: 'new-p256', auth: 'new-auth', failureCount: 0 })
  })

  it('stores the user agent cut to 200 characters, and null when the header is absent', async () => {
    const { subscriptions, subscribe } = setup()
    await subscribe(JORGE, input, 'x'.repeat(300))
    expect(subscriptions.row(E)!.userAgent).toBe('x'.repeat(200))
    await subscribe(JORGE, input, undefined)
    expect(subscriptions.row(E)!.userAgent).toBeNull()
  })

  it("moves Ana's endpoint to Jorge, leaves Ana none, and answers like a first subscribe", async () => {
    const { subscriptions, subscribe } = setup()
    const first = await subscribe(ANA, input, undefined)
    const swapped = await subscribe(JORGE, input, undefined)
    expect(subscriptions.forUser(ANA.userId)).toEqual([])
    expect(subscriptions.forUser(JORGE.userId)).toHaveLength(1)
    expect(swapped).toEqual(first)
    const fresh = setup()
    expect(await fresh.subscribe(JORGE, { ...input, endpoint: `${E}-2` }, undefined)).toEqual(first)
  })
})

describe('unsubscribe', () => {
  it('deletes the caller row and nothing else', async () => {
    const { subscriptions, subscribe, unsubscribe } = setup()
    await subscribe(JORGE, input, undefined)
    await subscribe(JORGE, { ...input, endpoint: `${E}-2` }, undefined)
    await unsubscribe(JORGE, E)
    expect(subscriptions.forUser(JORGE.userId).map((r) => r.endpoint)).toEqual([`${E}-2`])
  })

  it("is a no-op success on another user's endpoint", async () => {
    const { subscriptions, subscribe, unsubscribe } = setup()
    await subscribe(ANA, input, undefined)
    await expect(unsubscribe(JORGE, E)).resolves.toBeUndefined()
    expect(subscriptions.forUser(ANA.userId)).toHaveLength(1)
  })

  it('a pruned or unknown endpoint stays gone and creates nothing', async () => {
    const { subscriptions, subscribe, unsubscribe } = setup()
    await subscribe(JORGE, input, undefined)
    await unsubscribe(JORGE, E)
    await expect(unsubscribe(JORGE, E)).resolves.toBeUndefined()
    await expect(unsubscribe(JORGE, 'https://push.example.com/never')).resolves.toBeUndefined()
    expect(subscriptions.all()).toEqual([])
  })
})
