import { subscribePush, unsubscribePush } from './push-api'

/** What the control shows (notification-permission spec). */
export type PushState = 'default' | 'granted' | 'denied' | 'unsupported'

export interface PushStatus {
  state: PushState
  /** This browser's subscription, when `state` is `granted`. */
  subscription: PushSubscription | null
}

const supported = () =>
  typeof Notification !== 'undefined' &&
  typeof PushManager !== 'undefined' &&
  'serviceWorker' in navigator

/** This browser's subscription, or `null`. Never waits for a worker to appear. */
async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration()
  return (await registration?.pushManager.getSubscription()) ?? null
}

/**
 * Permission and subscription. `granted` means on: permission without a subscription (the user
 * cleared it) still offers to enable. Never prompts.
 */
export async function readStatus(): Promise<PushStatus> {
  if (!supported()) return { state: 'unsupported', subscription: null }
  if (Notification.permission === 'denied') return { state: 'denied', subscription: null }
  const subscription = Notification.permission === 'granted' ? await currentSubscription() : null
  return { state: subscription ? 'granted' : 'default', subscription }
}

/** The VAPID public key in base64url, as the bytes `subscribe` wants. */
function keyBytes(key: string) {
  const base64 = key
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(key.length / 4) * 4, '=')
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

/**
 * The only place the browser prompts, and only from a click: permission (asked first, inside the
 * click's gesture, so the token is fetched after it), then subscribe, then tell the API. If the API call fails the browser subscription is rolled back, so the control
 * never claims a state the server does not have.
 */
export async function enablePush(
  publicKey: string,
  getAccessToken: () => Promise<string>,
): Promise<PushState> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'default'
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(publicKey),
  })
  try {
    await subscribePush(await getAccessToken(), subscription.toJSON())
  } catch (error) {
    await subscription.unsubscribe().catch(() => false)
    throw error
  }
  return 'granted'
}

/** Removes this browser: the row for its endpoint and the browser subscription. */
async function remove(accessToken: string) {
  const subscription = await currentSubscription()
  if (!subscription) return false
  await Promise.allSettled([
    unsubscribePush(accessToken, subscription.endpoint),
    subscription.unsubscribe(),
  ])
  return true
}

/** The control's "turn off". Never throws. */
export async function disablePush(accessToken: string): Promise<void> {
  await remove(accessToken).catch(() => false)
}

/** Sign-out: resolves `true` when this browser was subscribed and is now removed. Never throws. */
export async function unsubscribeThisBrowser(accessToken: string): Promise<boolean> {
  if (!supported()) return false
  return remove(accessToken).catch(() => false)
}
