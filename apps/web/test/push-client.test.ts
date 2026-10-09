import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calls, fakeSubscription, installBrowser, KEY, removeBrowser } from './push-browser'

const api = vi.hoisted(() => ({ subscribePush: vi.fn(), unsubscribePush: vi.fn() }))
vi.mock('../src/features/push/push-api', () => api)

import {
  disablePush,
  enablePush,
  readStatus,
  unsubscribeThisBrowser,
} from '../src/features/push/push-client'

const ENDPOINT = 'https://push.example.com/send/abc'
const TOKEN = 'jwt-1'
const token = () => Promise.resolve(TOKEN)

const browser = installBrowser

beforeEach(() => {
  calls.length = 0
  api.subscribePush.mockReset().mockImplementation(() => {
    calls.push('post')
    return Promise.resolve()
  })
  api.unsubscribePush.mockReset().mockImplementation(() => {
    calls.push('delete')
    return Promise.resolve()
  })
})

afterEach(removeBrowser)

describe('readStatus', () => {
  it('is unsupported without Notification, PushManager or a service worker', async () => {
    expect((await readStatus()).state).toBe('unsupported')
    browser()
    Reflect.deleteProperty(globalThis, 'PushManager')
    expect((await readStatus()).state).toBe('unsupported')
  })

  it('reads default and denied from the permission without asking', async () => {
    const { notification } = browser({ permission: 'default' })
    expect((await readStatus()).state).toBe('default')
    browser({ permission: 'denied' })
    expect((await readStatus()).state).toBe('denied')
    expect(notification.requestPermission).not.toHaveBeenCalled()
  })

  it('is granted only with a subscription; granted without one still offers to enable', async () => {
    const existing = fakeSubscription()
    browser({ permission: 'granted', existing })
    expect(await readStatus()).toMatchObject({ state: 'granted', subscription: existing })
    browser({ permission: 'granted', existing: null })
    expect(await readStatus()).toMatchObject({ state: 'default', subscription: null })
  })
})

describe('enablePush', () => {
  it('asks permission, subscribes with the public key, then tells the API (in that order)', async () => {
    const { pushManager } = browser()
    await expect(enablePush(KEY, token)).resolves.toBe('granted')
    expect(calls).toEqual(['requestPermission', 'subscribe', 'post'])
    const options = pushManager.subscribe.mock.calls[0] as unknown as [
      { userVisibleOnly: boolean; applicationServerKey: Uint8Array },
    ]
    expect(options[0].userVisibleOnly).toBe(true)
    expect(options[0].applicationServerKey).toBeInstanceOf(Uint8Array)
    expect(options[0].applicationServerKey).toHaveLength(65)
    expect(api.subscribePush).toHaveBeenCalledWith(
      TOKEN,
      expect.objectContaining({ endpoint: ENDPOINT, keys: { p256dh: 'p256', auth: 'auth' } }),
    )
  })

  it('stops at a refused prompt: no subscribe, no API call', async () => {
    const { pushManager } = browser({ requested: 'denied' })
    await expect(enablePush(KEY, token)).resolves.toBe('denied')
    expect(pushManager.subscribe).not.toHaveBeenCalled()
    expect(api.subscribePush).not.toHaveBeenCalled()
    browser({ requested: 'default' })
    await expect(enablePush(KEY, token)).resolves.toBe('default')
  })

  it('rolls the browser subscription back when the POST fails, and reports the failure', async () => {
    const { created } = browser()
    api.subscribePush.mockRejectedValueOnce(new Error('503'))
    await expect(enablePush(KEY, token)).rejects.toThrow('503')
    expect(created.unsubscribe).toHaveBeenCalledTimes(1)
  })
})

describe('disablePush', () => {
  it('unsubscribes the browser and deletes the row for that endpoint', async () => {
    const existing = fakeSubscription()
    browser({ permission: 'granted', existing })
    await disablePush(TOKEN)
    expect(existing.unsubscribe).toHaveBeenCalledTimes(1)
    expect(api.unsubscribePush).toHaveBeenCalledWith(TOKEN, ENDPOINT)
  })

  it('still unsubscribes the browser when the delete call fails', async () => {
    const existing = fakeSubscription()
    browser({ permission: 'granted', existing })
    api.unsubscribePush.mockRejectedValueOnce(new Error('offline'))
    await expect(disablePush(TOKEN)).resolves.toBeUndefined()
    expect(existing.unsubscribe).toHaveBeenCalledTimes(1)
  })
})

describe('unsubscribeThisBrowser', () => {
  it('removes this browser and says it did', async () => {
    const existing = fakeSubscription()
    browser({ permission: 'granted', existing })
    await expect(unsubscribeThisBrowser(TOKEN)).resolves.toBe(true)
    expect(existing.unsubscribe).toHaveBeenCalledTimes(1)
    expect(api.unsubscribePush).toHaveBeenCalledWith(TOKEN, ENDPOINT)
  })

  it('makes no call when there is no subscription, and none when push is unsupported', async () => {
    browser({ permission: 'granted', existing: null })
    await expect(unsubscribeThisBrowser(TOKEN)).resolves.toBe(false)
    vi.unstubAllGlobals()
    Reflect.deleteProperty(navigator, 'serviceWorker')
    await expect(unsubscribeThisBrowser(TOKEN)).resolves.toBe(false)
    expect(api.unsubscribePush).not.toHaveBeenCalled()
  })

  it('never throws, whatever fails', async () => {
    const existing = fakeSubscription()
    existing.unsubscribe.mockRejectedValue(new Error('boom'))
    browser({ permission: 'granted', existing })
    api.unsubscribePush.mockRejectedValue(new Error('offline'))
    await expect(unsubscribeThisBrowser(TOKEN)).resolves.toBe(true)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistration: () => Promise.reject(new Error('gone')) },
    })
    await expect(unsubscribeThisBrowser(TOKEN)).resolves.toBe(false)
  })
})
