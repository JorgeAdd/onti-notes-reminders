import cors from '@fastify/cors'
import { meResponseSchema, timezoneRequestSchema, todayResponseSchema } from '@onti/shared'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../application/errors'
import type { GetMe } from '../../application/get-me'
import type { GetToday } from '../../application/get-today'
import type { TokenVerifier } from '../../application/ports'
import type { SetTimezone } from '../../application/set-timezone'
import type { Identity } from '../../domain/identity'

export interface ServerDeps {
  verifier: TokenVerifier
  getMe: GetMe
  setTimezone: SetTimezone
  getToday: GetToday
  corsOrigins: string[]
  logger?: boolean
}

const BEARER = /^Bearer\s+(\S+)$/i

function isFastifyClientError(error: unknown): boolean {
  const status = (error as { statusCode?: unknown }).statusCode
  return typeof status === 'number' && status >= 400 && status < 500
}

export function buildServer({
  verifier,
  getMe,
  setTimezone,
  getToday,
  corsOrigins,
  logger = false,
}: ServerDeps) {
  const app = Fastify({ logger })

  app.register(cors, { origin: corsOrigins, methods: ['GET', 'POST', 'PATCH', 'DELETE'] })

  async function authenticate(request: FastifyRequest): Promise<Identity> {
    const match = BEARER.exec(request.headers.authorization ?? '')
    if (!match?.[1]) throw new UnauthorizedError('Missing bearer token')
    return verifier.verify(match[1])
  }

  app.setErrorHandler((error, request, reply: FastifyReply) => {
    if (error instanceof UnauthorizedError) {
      return reply.code(401).send({ error: 'unauthorized' })
    }
    if (error instanceof ValidationError) {
      return reply.code(400).send({ error: 'validation_error' })
    }
    if (error instanceof NotFoundError) {
      return reply.code(404).send({ error: 'not_found' })
    }
    if (error instanceof ConflictError) {
      return reply.code(409).send({ error: 'conflict', reason: error.reason })
    }
    // Fastify's own 4xx (malformed JSON, wrong content type) are the client's fault, not ours.
    if (isFastifyClientError(error)) {
      return reply.code(400).send({ error: 'validation_error' })
    }
    request.log.error(error)
    return reply.code(500).send({ error: 'internal_error' })
  })

  app.get('/health', () => ({ status: 'ok' }))

  app.get('/me', async (request) => {
    const identity = await authenticate(request)
    return meResponseSchema.parse(await getMe(identity))
  })

  app.patch('/me', async (request) => {
    const identity = await authenticate(request)
    const body = timezoneRequestSchema.safeParse(request.body)
    if (!body.success) throw new ValidationError('Body must be {timezone: string}')
    return { timezone: await setTimezone(identity, body.data.timezone) }
  })

  app.get('/today', async (request) => {
    const identity = await authenticate(request)
    return z.encode(todayResponseSchema, await getToday(identity))
  })

  return app
}
