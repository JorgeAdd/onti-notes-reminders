import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config'
import { loadPushConfig, PUSH_ENV_NAMES } from '../src/push-config'

const SECRET = 'S3cret-value-that-is-at-least-32-chars!'
const full = {
  VAPID_PUBLIC_KEY: 'pub-key-value',
  VAPID_PRIVATE_KEY: 'priv-key-value',
  VAPID_SUBJECT: 'mailto:ops@example.com',
  PUSH_ACTION_SECRET: SECRET,
  API_PUBLIC_URL: 'https://api.example.com/',
}
const without = (name: string) => ({ ...full, [name]: undefined })

describe('loadPushConfig', () => {
  it('is null (push disabled) when none is set', () => {
    expect(loadPushConfig({})).toBeNull()
  })

  it('treats empty strings as unset', () => {
    expect(loadPushConfig(Object.fromEntries(PUSH_ENV_NAMES.map((name) => [name, ''])))).toBeNull()
  })

  it('returns the config when all five are set, trimming the trailing slash of the API url', () => {
    expect(loadPushConfig(full)).toEqual({
      vapidPublicKey: 'pub-key-value',
      vapidPrivateKey: 'priv-key-value',
      vapidSubject: 'mailto:ops@example.com',
      actionSecret: SECRET,
      apiPublicUrl: 'https://api.example.com',
    })
  })

  it.each(PUSH_ENV_NAMES)('lists %s when it is the only one missing', (name) => {
    expect(() => loadPushConfig(without(name))).toThrow(
      `Incomplete push configuration. Missing: ${name}`,
    )
  })

  it('lists every missing name and an empty value counts as missing', () => {
    expect(() => loadPushConfig({ VAPID_PUBLIC_KEY: 'x', VAPID_SUBJECT: '' })).toThrow(
      'Incomplete push configuration. Missing: VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_ACTION_SECRET, API_PUBLIC_URL',
    )
  })

  it.each([
    ['a short secret', { PUSH_ACTION_SECRET: 'too-short' }, 'PUSH_ACTION_SECRET'],
    ['a subject that is not mailto or https', { VAPID_SUBJECT: 'ftp://x' }, 'VAPID_SUBJECT'],
    ['an API url that is not a url', { API_PUBLIC_URL: 'nope' }, 'API_PUBLIC_URL'],
    [
      'a plain-http API url that is not localhost',
      { API_PUBLIC_URL: 'http://api.example.com' },
      'API_PUBLIC_URL',
    ],
  ])('names the invalid variable for %s', (_label, override, name) => {
    expect(() => loadPushConfig({ ...full, ...override })).toThrow(
      `Invalid push configuration: ${name}`,
    )
  })

  it('accepts an https subject and http://localhost for development', () => {
    const config = loadPushConfig({
      ...full,
      VAPID_SUBJECT: 'https://example.com/contact',
      API_PUBLIC_URL: 'http://localhost:3000',
    })
    expect(config?.vapidSubject).toBe('https://example.com/contact')
    expect(config?.apiPublicUrl).toBe('http://localhost:3000')
  })

  it('never puts a value in the error text', () => {
    for (const env of [
      { ...full, PUSH_ACTION_SECRET: 'short-secret-value' },
      { ...full, VAPID_SUBJECT: 'ftp://leaky.example.com' },
      without('API_PUBLIC_URL'),
    ]) {
      let message = ''
      try {
        loadPushConfig(env)
      } catch (error) {
        message = (error as Error).message
      }
      expect(message).not.toBe('')
      for (const value of Object.values(env)) {
        if (value) expect(message).not.toContain(value)
      }
    }
  })
})

describe('loadConfig with push', () => {
  const base = {
    SUPABASE_URL: 'https://x.supabase.co',
    DATABASE_URL: 'postgres://u@h/db',
    CORS_ORIGINS: 'https://app.example.com',
  }

  it('has push null when no push variable is set', () => {
    expect(loadConfig(base).push).toBeNull()
  })

  it('carries the push config when all five are set', () => {
    expect(loadConfig({ ...base, ...full }).push?.apiPublicUrl).toBe('https://api.example.com')
  })

  it('fails startup on a partial push configuration', () => {
    expect(() => loadConfig({ ...base, VAPID_PUBLIC_KEY: 'x' })).toThrow(
      /Missing: VAPID_PRIVATE_KEY/,
    )
  })
})
