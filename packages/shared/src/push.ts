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

export type PushAction = (typeof PUSH_ACTIONS)[number]
export type PushPayload = z.infer<typeof pushPayloadSchema>
export type ActionClaims = z.infer<typeof actionClaimsSchema>
