import type { PushPayload } from '@onti/shared'
import type { PushSender, PushSubscription, SendOutcome } from '../../application/push-ports'

export interface VapidDetails {
  subject: string
  publicKey: string
  privateKey: string
}

export interface WebPushOptions {
  vapidDetails: VapidDetails
  TTL: number
  urgency: 'high'
  timeout: number
}

/** The slice of the `web-push` module this adapter uses; `main.ts` passes the real default import. */
export interface WebPushClient {
  sendNotification(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options: WebPushOptions,
  ): Promise<unknown>
}

/** A push that is not delivered within an hour is useless: the reminder is already on Today. */
const TTL_SECONDS = 3600
const TIMEOUT_MS = 10_000
/** The push service says this endpoint no longer exists. */
const GONE_STATUS_CODES = [404, 410]

/**
 * Web Push delivery. The VAPID details travel with every call (no global state). A failure is an
 * outcome, never a throw, and nothing here logs: an endpoint is a capability URL.
 */
export class WebPushSender implements PushSender {
  constructor(
    private readonly client: WebPushClient,
    private readonly vapid: VapidDetails,
  ) {}

  async send(subscription: PushSubscription, payload: PushPayload): Promise<SendOutcome> {
    try {
      await this.client.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(payload),
        { vapidDetails: this.vapid, TTL: TTL_SECONDS, urgency: 'high', timeout: TIMEOUT_MS },
      )
      return { kind: 'sent' }
    } catch (error) {
      const status = (error as { statusCode?: unknown } | null)?.statusCode
      return typeof status === 'number' && GONE_STATUS_CODES.includes(status)
        ? { kind: 'gone' }
        : { kind: 'failed' }
    }
  }
}
