import {
  pushActionRequestSchema,
  pushSubscriptionRequestSchema,
  pushUnsubscribeRequestSchema,
  type PushAction,
} from '@onti/shared'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { UnauthorizedError, ValidationError } from '../../application/errors'
import type { Clock } from '../../application/ports'
import type { PushActions } from '../../application/push-actions'
import type { ActionTokens } from '../../application/push-ports'
import type { SubscriptionActions } from '../../application/push-subscribe'
import type { Identity } from '../../domain/identity'

/** Everything the push routes need; the server registers them only when this is provided. */
export interface PushDeps {
  tokens: ActionTokens
  clock: Clock
  actions: PushActions
  subscriptions: SubscriptionActions
}

const OK = { ok: true } as const

/**
 * Subscribe and unsubscribe require the JWT (CLAUDE.md rule 18). The two action routes take the
 * signed action token instead (the one exception, ADR-004): the HMAC is checked before any
 * database access, and every token failure is the same `401`.
 */
export function registerPushRoutes(
  app: FastifyInstance,
  { tokens, clock, actions, subscriptions }: PushDeps,
  authenticate: (request: FastifyRequest) => Promise<Identity>,
) {
  app.post('/push-subscriptions', async (request) => {
    const identity = await authenticate(request)
    const body = pushSubscriptionRequestSchema.safeParse(request.body)
    if (!body.success) throw new ValidationError('Invalid push subscription')
    await subscriptions.subscribe(identity, body.data, request.headers['user-agent'])
    return OK
  })

  app.delete('/push-subscriptions', async (request) => {
    const identity = await authenticate(request)
    const body = pushUnsubscribeRequestSchema.safeParse(request.body)
    if (!body.success) throw new ValidationError('Body must be {endpoint}')
    await subscriptions.unsubscribe(identity, body.data.endpoint)
    return OK
  })

  const actionRoutes: [PushAction, PushActions['done']][] = [
    ['done', actions.done],
    ['snooze', actions.snooze],
  ]
  for (const [action, run] of actionRoutes) {
    app.post(`/push-actions/${action}`, async (request) => {
      const body = pushActionRequestSchema.safeParse(request.body)
      const claims = body.success ? tokens.verify(body.data.token, clock.now()) : null
      if (claims === null) throw new UnauthorizedError('Invalid action token')
      await run(claims)
      return OK
    })
  }
}
