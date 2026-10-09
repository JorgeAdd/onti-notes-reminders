import type { PushSubscriptionRequest } from '@onti/shared'
import type { Identity } from '../domain/identity'
import type { SubscriptionRepository } from './push-ports'

export interface SubscriptionActionsDeps {
  subscriptions: SubscriptionRepository
}

const USER_AGENT_MAX = 200

/** Register and remove a browser's push endpoint for the caller (R15: nothing leaks across users). */
export function makeSubscriptionActions({ subscriptions }: SubscriptionActionsDeps) {
  return {
    /** The user agent comes from the request header, never the body; cut to 200 characters. */
    subscribe: (
      identity: Identity,
      input: PushSubscriptionRequest,
      userAgent: string | undefined,
    ): Promise<void> =>
      subscriptions.subscribe(identity.userId, {
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: userAgent === undefined ? null : userAgent.slice(0, USER_AGENT_MAX),
      }),
    unsubscribe: (identity: Identity, endpoint: string): Promise<void> =>
      subscriptions.unsubscribe(identity, endpoint),
  }
}

export type SubscriptionActions = ReturnType<typeof makeSubscriptionActions>
