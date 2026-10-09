/** Web Push configuration: all five variables or none (decision 11). Errors name variables, never values. */
export const PUSH_ENV_NAMES = [
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
  'PUSH_ACTION_SECRET',
  'API_PUBLIC_URL',
] as const

type PushEnvName = (typeof PUSH_ENV_NAMES)[number]

export interface PushConfig {
  vapidPublicKey: string
  vapidPrivateKey: string
  /** `mailto:` or `https:` contact for the push services. */
  vapidSubject: string
  /** Signs the action tokens (at least 32 characters). */
  actionSecret: string
  /** Public URL of this API without a trailing slash; the service worker posts actions to it. */
  apiPublicUrl: string
}

const MIN_SECRET_LENGTH = 32

function isHttpsOrLocalUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === 'localhost')
  } catch {
    return false
  }
}

const VALID: Record<PushEnvName, (value: string) => boolean> = {
  VAPID_PUBLIC_KEY: () => true,
  VAPID_PRIVATE_KEY: () => true,
  VAPID_SUBJECT: (value) => value.startsWith('mailto:') || value.startsWith('https:'),
  PUSH_ACTION_SECRET: (value) => value.length >= MIN_SECRET_LENGTH,
  API_PUBLIC_URL: isHttpsOrLocalUrl,
}

/** `null` when none is set (push disabled); throws on a subset or an invalid value. */
export function loadPushConfig(env: NodeJS.ProcessEnv): PushConfig | null {
  const value = (name: PushEnvName): string | undefined => env[name] || undefined
  const present = PUSH_ENV_NAMES.filter((name) => value(name) !== undefined)
  if (present.length === 0) return null

  const missing = PUSH_ENV_NAMES.filter((name) => value(name) === undefined)
  if (missing.length > 0) {
    throw new Error(`Incomplete push configuration. Missing: ${missing.join(', ')}`)
  }
  const invalid = PUSH_ENV_NAMES.filter((name) => !VALID[name](value(name)!))
  if (invalid.length > 0) {
    throw new Error(`Invalid push configuration: ${invalid.join(', ')}`)
  }
  return {
    vapidPublicKey: value('VAPID_PUBLIC_KEY')!,
    vapidPrivateKey: value('VAPID_PRIVATE_KEY')!,
    vapidSubject: value('VAPID_SUBJECT')!,
    actionSecret: value('PUSH_ACTION_SECRET')!,
    apiPublicUrl: value('API_PUBLIC_URL')!.replace(/\/+$/, ''),
  }
}
