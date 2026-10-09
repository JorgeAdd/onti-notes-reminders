import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from '../src/features/push/register-sw'

const KEY = 'BPublicKey'

const stub = (register: () => Promise<{ update: () => Promise<unknown> }>) => ({
  register: vi.fn(register),
})
const registration = () => {
  const update = vi.fn(() => Promise.resolve())
  return { update, register: () => Promise.resolve({ update }) }
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('registerServiceWorker', () => {
  it('registers /sw.js at the root scope without the HTTP cache, then asks for an update', async () => {
    const { update, register } = registration()
    const serviceWorker = stub(register)
    await registerServiceWorker({ key: KEY, serviceWorker })
    expect(serviceWorker.register).toHaveBeenCalledWith('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('does nothing without a key', async () => {
    const serviceWorker = stub(() => Promise.resolve({ update: vi.fn() }))
    await registerServiceWorker({ key: undefined, serviceWorker })
    await registerServiceWorker({ key: '', serviceWorker })
    expect(serviceWorker.register).not.toHaveBeenCalled()
  })

  it('does nothing and does not throw when the browser has no service worker', async () => {
    await expect(
      registerServiceWorker({ key: KEY, serviceWorker: undefined }),
    ).resolves.toBeUndefined()
  })

  it('swallows a failed registration or update (the app works without push)', async () => {
    await expect(
      registerServiceWorker({
        key: KEY,
        serviceWorker: stub(() => Promise.reject(new Error('blocked'))),
      }),
    ).resolves.toBeUndefined()
    await expect(
      registerServiceWorker({
        key: KEY,
        serviceWorker: stub(() =>
          Promise.resolve({ update: () => Promise.reject(new Error('offline')) }),
        ),
      }),
    ).resolves.toBeUndefined()
  })

  it('is called from main.tsx after render', () => {
    const main = readFileSync('src/main.tsx', 'utf8')
    expect(main).toMatch(/void registerServiceWorker\(\)/)
    expect(main.indexOf('.render(')).toBeLessThan(main.indexOf('registerServiceWorker()'))
  })
})

describe('env VITE_VAPID_PUBLIC_KEY', () => {
  async function loadEnv() {
    vi.resetModules()
    return (await import('../src/lib/env')).env
  }

  it('is optional, and an empty value counts as absent', async () => {
    expect((await loadEnv()).VITE_VAPID_PUBLIC_KEY).toBeUndefined()
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '')
    expect((await loadEnv()).VITE_VAPID_PUBLIC_KEY).toBeUndefined()
  })

  it('carries the key when it is set', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', KEY)
    expect((await loadEnv()).VITE_VAPID_PUBLIC_KEY).toBe(KEY)
  })
})
