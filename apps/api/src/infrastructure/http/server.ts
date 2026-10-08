import cors from '@fastify/cors'
import { meResponseSchema, todayResponseSchema } from '@onti/shared'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import { z } from 'zod'
import { UnauthorizedError } from '../../application/errors'
import type { GetMe } from '../../application/get-me'
import type { GetToday } from '../../application/get-today'
import type { TokenVerifier } from '../../application/ports'
import type { Identity } from '../../domain/identity'

export interface ServerDeps {
  verifier: TokenVerifier
  getMe: GetMe
  getToday: GetToday
  corsOrigins: string[]
  logger?: boolean
}

const BEARER = /^Bearer\s+(\S+)$/i

export function buildServer({
  verifier,
  getMe,
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
    request.log.error(error)
    return reply.code(500).send({ error: 'internal_error' })
  })

  app.get('/health', () => ({ status: 'ok' }))

  app.get('/me', async (request) => {
    const identity = await authenticate(request)
    return meResponseSchema.parse(await getMe(identity))
  })

  app.get('/today', async (request) => {
    const identity = await authenticate(request)
    return z.encode(todayResponseSchema, await getToday(identity))
  })

  return app
}
