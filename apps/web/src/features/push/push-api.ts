import { request } from '../../lib/api'

/** The two fields of `PushSubscription.toJSON()` the API stores (extra fields are dropped). */
export interface SubscriptionJson {
  endpoint?: string | undefined
  keys?: Record<string, string> | undefined
}

/** POST /push-subscriptions · an idempotent upsert: a repeat is the same row (decision 16). */
export async function subscribePush(accessToken: string, subscription: SubscriptionJson) {
  const { endpoint, keys } = subscription
  await request('POST', '/push-subscriptions', accessToken, { endpoint, keys })
}

/** DELETE /push-subscriptions · another user's endpoint is a no-op success. */
export async function unsubscribePush(accessToken: string, endpoint: string) {
  await request('DELETE', '/push-subscriptions', accessToken, { endpoint })
}
