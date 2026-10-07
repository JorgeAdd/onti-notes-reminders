import cors from '@fastify/cors'
import { meResponseSchema } from '@onti/shared'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import { UnauthorizedError } from '../../application/errors'
import type { GetMe } from '../../application/get-me'
import type { TokenVerifier } from '../../application/ports'
import type { Identity } from '../../domain/identity'

export interface ServerDeps {
  verifier: TokenVerifier
  getMe: GetMe
  corsOrigins: string[]
  logger?: boolean
}

const BEARER = /^Bearer\s+(\S+)$/i

export function buildServer({ verifier, getMe, corsOrigins, logger = false }: ServerDeps) {
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

  app.get('/health', async () => ({ status: 'ok' }))

  app.get('/me', async (request) => {
    const identity = await authenticate(request)
    return meResponseSchema.parse(await getMe(identity))
  })

  return app
}
