import cors from '@fastify/cors'
import {
  captureRequestSchema,
  dayQuerySchema,
  meResponseSchema,
  noteDetailResponseSchema,
  noteUpdateRequestSchema,
  noteResponseSchema,
  notesListResponseSchema,
  notesQuerySchema,
  snoozeRequestSchema,
  timezoneRequestSchema,
  todayResponseSchema,
} from '@onti/shared'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../application/errors'
import type { CaptureNote } from '../../application/capture-note'
import type { DeleteNote } from '../../application/delete-note'
import type { GetMe } from '../../application/get-me'
import type { GetNote } from '../../application/get-note'
import type { GetToday } from '../../application/get-today'
import type { MarkDone } from '../../application/mark-done'
import type { TokenVerifier } from '../../application/ports'
import type { SearchNotes } from '../../application/search-notes'
import type { SetTimezone } from '../../application/set-timezone'
import type { SnoozeNote } from '../../application/snooze-note'
import type { UndoDone } from '../../application/undo-done'
import type { UpdateNote } from '../../application/update-note'
import type { Identity } from '../../domain/identity'
import type { NoteRecord } from '../../domain/note'
import { registerPushRoutes, type PushDeps } from './push-routes'

export interface ServerDeps {
  verifier: TokenVerifier
  getMe: GetMe
  setTimezone: SetTimezone
  getToday: GetToday
  actions: {
    captureNote: CaptureNote
    snoozeNote: SnoozeNote
    markDone: MarkDone
    undoDone: UndoDone
    updateNote: UpdateNote
    deleteNote: DeleteNote
  }
  corsOrigins: string[]
  logger?: boolean
  searchNotes: SearchNotes
  getNote: GetNote
  /** Push routes exist only when provided (push configured). */
  push?: PushDeps | undefined
}

const BEARER = /^Bearer\s+(\S+)$/i

function isFastifyClientError(error: unknown): boolean {
  const status = (error as { statusCode?: unknown }).statusCode
  return typeof status === 'number' && status >= 400 && status < 500
}

/** `{note}` on the wire: the reminder state and creation time, without the notification bookkeeping. */
function noteBody(note: NoteRecord) {
  const { id, title, tags, dueAt, originalDueAt, snoozeCount, doneAt, createdAt } = note
  return z.encode(noteResponseSchema, {
    id,
    title,
    tags,
    dueAt,
    originalDueAt,
    snoozeCount,
    doneAt,
    createdAt,
  })
}

/** A non-UUID id cannot exist, so it is the same 404 as an unknown one (R15). */
function noteIdOf(params: unknown): string {
  const parsed = z.object({ id: z.uuid() }).safeParse(params)
  if (!parsed.success) throw new NotFoundError('Note not found')
  return parsed.data.id
}

export function buildServer({
  verifier,
  getMe,
  setTimezone,
  getToday,
  actions,
  corsOrigins,
  logger = false,
  searchNotes,
  getNote,
  push,
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

  if (push) registerPushRoutes(app, push, authenticate)

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

  app.post('/notes', async (request, reply) => {
    const identity = await authenticate(request)
    const body = captureRequestSchema.safeParse(request.body)
    if (!body.success) throw new ValidationError('Invalid capture request')
    return reply.code(201).send(noteBody(await actions.captureNote(identity, body.data)))
  })

  app.post('/notes/:id/snooze', async (request) => {
    const identity = await authenticate(request)
    const id = noteIdOf(request.params)
    const body = snoozeRequestSchema.safeParse(request.body)
    if (!body.success) throw new ValidationError('Body must be {preset: "hour" | "tomorrow"}')
    return noteBody(await actions.snoozeNote(identity, id, body.data.preset))
  })

  app.post('/notes/:id/done', async (request) => {
    const identity = await authenticate(request)
    return noteBody(await actions.markDone(identity, noteIdOf(request.params)))
  })

  app.post('/notes/:id/undo', async (request) => {
    const identity = await authenticate(request)
    return noteBody(await actions.undoDone(identity, noteIdOf(request.params)))
  })

  app.get('/notes', async (request) => {
    const identity = await authenticate(request)
    const query = notesQuerySchema.safeParse(request.query)
    if (!query.success)
      throw new ValidationError('q and tag must be single strings: q up to 200 chars, tag a slug')
    return z.encode(
      notesListResponseSchema,
      await searchNotes(identity, query.data.q, query.data.tag),
    )
  })

  app.get('/notes/:id', async (request) => {
    const identity = await authenticate(request)
    const id = noteIdOf(request.params)
    return z.encode(noteDetailResponseSchema, await getNote(identity, id))
  })

  app.patch('/notes/:id', async (request) => {
    const identity = await authenticate(request)
    const id = noteIdOf(request.params)
    const body = noteUpdateRequestSchema.safeParse(request.body)
    if (!body.success) throw new ValidationError('Invalid note update')
    return z.encode(noteDetailResponseSchema, await actions.updateNote(identity, id, body.data))
  })

  app.delete('/notes/:id', async (request, reply) => {
    const identity = await authenticate(request)
    await actions.deleteNote(identity, noteIdOf(request.params))
    return reply.code(204).send()
  })

  app.get('/today', async (request) => {
    const identity = await authenticate(request)
    const query = dayQuerySchema.safeParse(request.query)
    if (!query.success) throw new ValidationError('Invalid date or tag')
    return z.encode(todayResponseSchema, await getToday(identity, query.data))
  })

  return app
}
