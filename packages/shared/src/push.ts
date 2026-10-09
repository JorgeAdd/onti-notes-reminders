import { z } from 'zod'

/** The two actions a notification can carry (ADR-004). */
export const PUSH_ACTIONS = ['done', 'snooze'] as const

/**
 * Copy the server builds into the notification. It lives here, not in the web messages module,
 * because the service worker cannot import it.
 */
export const PUSH_COPY = { appName: 'Notes + Reminders', done: 'Done', snooze: '+1 h' } as const

/** What the push service delivers to the service worker (encrypted in transit). */
export const pushPayloadSchema = z.object({
  v: z.literal(1),
  title: z.string(),
  body: z.string(),
  tag: z.string(),
  noteId: z.uuid(),
  dueAt: z.number().int(),
  apiUrl: z.url(),
  token: z.string(),
  appName: z.string(),
  actions: z.array(z.object({ action: z.enum(PUSH_ACTIONS), title: z.string() })),
})

/** The signed claims of an action token: one note, one `due_at`, a few actions, an expiry. */
export const actionClaimsSchema = z.object({
  v: z.literal(1),
  noteId: z.uuid(),
  userId: z.uuid(),
  dueAt: z.number().int(),
  actions: z.array(z.enum(PUSH_ACTIONS)).min(1),
  /** Epoch seconds. */
  exp: z.number().int(),
})

const IPV4_HOST = /^\d{1,3}(\.\d{1,3}){3}$/
const BASE64URL = /^[A-Za-z0-9_-]+$/

/**
 * A push endpoint is a capability URL the API will POST to: https only, no userinfo, never a
 * literal IP or `localhost`. No push-service allowlist (new browsers use new hosts).
 */
const pushEndpointSchema = z
  .string()
  .max(2048)
  .refine((value) => {
    const url = URL.parse(value)
    if (url === null || url.protocol !== 'https:') return false
    if (url.username !== '' || url.password !== '') return false
    const host = url.hostname
    return !(
      host.startsWith('[') ||
      IPV4_HOST.test(host) ||
      host === 'localhost' ||
      host.endsWith('.localhost')
    )
  })

/** `PushSubscription.toJSON()` from the browser; extra fields (`expirationTime`) are ignored. */
export const pushSubscriptionRequestSchema = z.object({
  endpoint: pushEndpointSchema,
  keys: z.object({ p256dh: z.string().regex(BASE64URL), auth: z.string().regex(BASE64URL) }),
})

export const pushUnsubscribeRequestSchema = z.object({ endpoint: pushEndpointSchema })

/** The body of `POST /push-actions/*`: the signed token, instead of a JWT (ADR-004). */
export const pushActionRequestSchema = z.object({ token: z.string().min(1) })

export type PushAction = (typeof PUSH_ACTIONS)[number]
export type PushPayload = z.infer<typeof pushPayloadSchema>
export type ActionClaims = z.infer<typeof actionClaimsSchema>
export type PushSubscriptionRequest = z.infer<typeof pushSubscriptionRequestSchema>
