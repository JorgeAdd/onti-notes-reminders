import {
  meResponseSchema,
  todayResponseSchema,
  type MeResponse,
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

async function get(path: string, accessToken: string): Promise<unknown> {
  const response = await fetch(new URL(path, env.VITE_API_URL), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (response.status === 401) throw new UnauthorizedError()
  if (!response.ok) throw new Error(`GET ${path} failed with ${response.status}`)
  return response.json()
}

export async function fetchMe(accessToken: string): Promise<MeResponse> {
  return meResponseSchema.parse(await get('/me', accessToken))
}

export async function fetchToday(accessToken: string): Promise<TodayResponse> {
  return todayResponseSchema.parse(await get('/today', accessToken))
}
