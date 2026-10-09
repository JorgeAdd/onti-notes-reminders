import {
  noteDetailResponseSchema,
  noteResponseSchema,
  type CaptureRequest,
  type NoteDetailResponse,
  timezoneResponseSchema,
  todayResponseSchema,
  type NoteResponse,
  notesListResponseSchema,
  type NotesListResponse,
  type SnoozePreset,
  type TodayResponse,
} from '@onti/shared'
import { env } from './env'

/** The API rejected the token: the session is over (Decision 12). Other failures stay generic. */
export class UnauthorizedError extends Error {
  constructor() {
    super('Session expired or invalid')
    this.name = 'UnauthorizedError'
  }
}

/** Any other non-2xx answer; the status tells the caller what to say (409, 404, 5xx). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    description: string,
  ) {
    super(`${description} failed with ${status}`)
    this.name = 'ApiError'
  }
}

/**
 * One authenticated call. `Content-Type` is sent only with a body: Fastify answers 400 to an
 * empty body declared as JSON, and the done/undo actions send none (Decision 10).
 */
export async function request(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  accessToken: string,
  body?: unknown,
): Promise<unknown> {
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(new URL(path, env.VITE_API_URL), {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  if (response.status === 401) throw new UnauthorizedError()
  if (!response.ok) throw new ApiError(response.status, `${method} ${path}`)
  return response.json()
}

export const post = (path: string, accessToken: string, body?: unknown) =>
  request('POST', path, accessToken, body)

/** GET /today for a viewed day and tag (`null` or absent: today, unfiltered). */
export async function fetchToday(
  accessToken: string,
  view: { date: string | null; tag: string | null } = { date: null, tag: null },
): Promise<TodayResponse> {
  const query = new URLSearchParams()
  if (view.date !== null) query.set('date', view.date)
  if (view.tag !== null) query.set('tag', view.tag)
  const search = query.size === 0 ? '' : `?${query}`
  return todayResponseSchema.parse(await request('GET', `/today${search}`, accessToken))
}

/** Sends the browser zone once; resolves to the zone the server stored. */
export async function patchTimezone(accessToken: string, timezone: string): Promise<string> {
  const stored = await request('PATCH', '/me', accessToken, { timezone })
  return timezoneResponseSchema.parse(stored).timezone
}

/** R7 · the server stamps the time; the client sends only the preset. */
export async function snoozeNote(
  accessToken: string,
  id: string,
  preset: SnoozePreset,
): Promise<NoteResponse> {
  return noteResponseSchema.parse(await post(`/notes/${id}/snooze`, accessToken, { preset }))
}

export async function markNoteDone(accessToken: string, id: string): Promise<NoteResponse> {
  return noteResponseSchema.parse(await post(`/notes/${id}/done`, accessToken))
}

export async function undoNoteDone(accessToken: string, id: string): Promise<NoteResponse> {
  return noteResponseSchema.parse(await post(`/notes/${id}/undo`, accessToken))
}

/** R11 · the structured result of the preview: title, tag slugs and a minute-aligned due instant. */
export async function captureNote(
  accessToken: string,
  capture: CaptureRequest,
): Promise<NoteResponse> {
  return noteResponseSchema.parse(await post('/notes', accessToken, capture))
}

/** R13 and R12 · the caller's notes, newest first; a term and a tag narrow them server-side. */
export async function searchNotes(
  accessToken: string,
  term: string,
  tag: string | null = null,
): Promise<NotesListResponse> {
  const params = new URLSearchParams()
  if (term !== '') params.set('q', term)
  if (tag !== null) params.set('tag', tag)
  const query = params.size === 0 ? '' : `?${params}`
  return notesListResponseSchema.parse(await request('GET', `/notes${query}`, accessToken))
}

/** C11 · one of the caller's notes with its body; another user's note and an unknown id are 404. */
export async function fetchNote(accessToken: string, id: string): Promise<NoteDetailResponse> {
  return noteDetailResponseSchema.parse(await request('GET', `/notes/${id}`, accessToken))
}
