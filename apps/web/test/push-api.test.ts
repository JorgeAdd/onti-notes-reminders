import { afterEach, expect, it, vi } from 'vitest'
import { subscribePush, unsubscribePush } from '../src/features/push/push-api'

afterEach(() => vi.restoreAllMocks())

const ok = () => vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"ok":true}'))

it('POSTs only the endpoint and keys, with the session token', async () => {
  const fetch = ok()
  await subscribePush('jwt-1', {
    endpoint: 'https://push.example.com/a',
    keys: { p256dh: 'p', auth: 'a' },
    // `toJSON()` also carries `expirationTime`; the API schema must never see it.
    ...({ expirationTime: null } as object),
  })
  const [url, init] = fetch.mock.calls[0]!
  expect((url as URL).href).toBe('http://localhost:3000/push-subscriptions')
  expect(init).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer jwt-1' } })
  expect(JSON.parse(init?.body as string)).toEqual({
    endpoint: 'https://push.example.com/a',
    keys: { p256dh: 'p', auth: 'a' },
  })
})

it('DELETEs by endpoint', async () => {
  const fetch = ok()
  await unsubscribePush('jwt-1', 'https://push.example.com/a')
  const [url, init] = fetch.mock.calls[0]!
  expect((url as URL).href).toBe('http://localhost:3000/push-subscriptions')
  expect(init?.method).toBe('DELETE')
  expect(JSON.parse(init?.body as string)).toEqual({ endpoint: 'https://push.example.com/a' })
})

it('rejects on a failed answer so the caller can roll back', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 503 }))
  await expect(subscribePush('jwt-1', { endpoint: 'https://x.test/a', keys: {} })).rejects.toThrow()
})
