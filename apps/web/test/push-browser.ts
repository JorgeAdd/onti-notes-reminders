import { vi } from 'vitest'

export const KEY =
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'

/** The calls the browser stubs record, in order. */
export const calls: string[] = []

export function fakeSubscription(endpoint = 'https://push.example.com/send/abc') {
  return {
    endpoint,
    toJSON: () => ({ endpoint, expirationTime: null, keys: { p256dh: 'p256', auth: 'auth' } }),
    unsubscribe: vi.fn(() => {
      calls.push('unsubscribe')
      return Promise.resolve(true)
    }),
  }
}

/** A browser with push: permission, one registration, and (optionally) an existing subscription. */
export function installBrowser(
  options: {
    permission?: NotificationPermission
    requested?: NotificationPermission
    existing?: ReturnType<typeof fakeSubscription> | null
  } = {},
) {
  const created = fakeSubscription()
  const pushManager = {
    getSubscription: vi.fn(() => Promise.resolve(options.existing ?? null)),
    subscribe: vi.fn(() => {
      calls.push('subscribe')
      return Promise.resolve(created)
    }),
  }
  const registration = { pushManager }
  const notification = {
    permission: options.permission ?? 'default',
    requestPermission: vi.fn(() => {
      calls.push('requestPermission')
      return Promise.resolve(options.requested ?? 'granted')
    }),
  }
  vi.stubGlobal('Notification', notification)
  vi.stubGlobal('PushManager', class {})
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      ready: Promise.resolve(registration),
      getRegistration: vi.fn(() => Promise.resolve(registration)),
    },
  })
  return { pushManager, notification, created }
}

/** Undo `installBrowser` (call from `afterEach`). */
export function removeBrowser() {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'serviceWorker')
}
