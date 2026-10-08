import { timezoneResponseSchema, todayResponseSchema, type TodayResponse } from '@onti/shared'
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

export async function fetchToday(accessToken: string): Promise<TodayResponse> {
  return todayResponseSchema.parse(await request('GET', '/today', accessToken))
}

/** Sends the browser zone once; resolves to the zone the server stored. */
export async function patchTimezone(accessToken: string, timezone: string): Promise<string> {
  const stored = await request('PATCH', '/me', accessToken, { timezone })
  return timezoneResponseSchema.parse(stored).timezone
}
