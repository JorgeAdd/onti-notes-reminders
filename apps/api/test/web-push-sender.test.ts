import { PUSH_COPY, type PushPayload } from '@onti/shared'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { WebPushSender, type WebPushClient } from '../src/infrastructure/push/web-push-sender'
import { noteId } from './fakes'

const VAPID = {
  subject: 'mailto:ops@example.com',
  publicKey: 'public-key',
  privateKey: 'private-key',
}
const subscription = { id: 's1', endpoint: 'https://push.example.com/abc', p256dh: 'P', auth: 'A' }
const payload: PushPayload = {
  v: 1,
  title: '17:00 · Notify Ana',
  body: 'Client A',
  tag: noteId(1),
  noteId: noteId(1),
  dueAt: 1_791_000_000_000,
  apiUrl: 'https://api.example.com',
  token: 'a.b',
  appName: PUSH_COPY.appName,
  actions: [{ action: 'done', title: PUSH_COPY.done }],
}

const failure = (statusCode?: number) =>
  Object.assign(new Error('push failed'), statusCode === undefined ? {} : { statusCode })

let client: { sendNotification: Mock<WebPushClient['sendNotification']> }
let sender: WebPushSender
beforeEach(() => {
  client = {
    sendNotification: vi
      .fn<WebPushClient['sendNotification']>()
      .mockResolvedValue({ statusCode: 201 }),
  }
  sender = new WebPushSender(client, VAPID)
})

describe('WebPushSender', () => {
  it('answers sent when the push service accepts', async () => {
    expect(await sender.send(subscription, payload)).toEqual({ kind: 'sent' })
  })

  it('hands the client the subscription keys, the payload as a string and the options', async () => {
    await sender.send(subscription, payload)
    const [sub, body, options] = client.sendNotification.mock.calls[0]!
    expect(sub).toEqual({ endpoint: subscription.endpoint, keys: { p256dh: 'P', auth: 'A' } })
    expect(body).toBe(JSON.stringify(payload))
    expect(options).toEqual({ vapidDetails: VAPID, TTL: 3600, urgency: 'high', timeout: 10_000 })
  })

  it.each([404, 410])('answers gone for %i', async (status) => {
    client.sendNotification.mockRejectedValue(failure(status))
    expect(await sender.send(subscription, payload)).toEqual({ kind: 'gone' })
  })

  it.each([500, 429, 401, 400])('answers failed for %i', async (status) => {
    client.sendNotification.mockRejectedValue(failure(status))
    expect(await sender.send(subscription, payload)).toEqual({ kind: 'failed' })
  })

  it('answers failed for an error without a status (network)', async () => {
    client.sendNotification.mockRejectedValue(failure())
    expect(await sender.send(subscription, payload)).toEqual({ kind: 'failed' })
  })

  it('answers failed when something that is not an error is thrown', async () => {
    client.sendNotification.mockRejectedValue('boom')
    expect(await sender.send(subscription, payload)).toEqual({ kind: 'failed' })
  })
})
