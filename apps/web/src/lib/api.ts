import { meResponseSchema, type MeResponse } from '@onti/shared'
import { env } from './env'

export async function fetchMe(accessToken: string): Promise<MeResponse> {
  const response = await fetch(new URL('/me', env.VITE_API_URL), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error(`GET /me failed with ${response.status}`)
  return meResponseSchema.parse(await response.json())
}
