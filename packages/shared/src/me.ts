import { z } from 'zod'

/** GET /me — the signed-in user as the API sees them. */
export const meResponseSchema = z.object({
  userId: z.uuid(),
  email: z.email().nullable(),
  timezone: z.string().min(1),
})

export type MeResponse = z.infer<typeof meResponseSchema>

/** PATCH /me request: the browser's IANA zone, validated by the API (R16). */
export const timezoneRequestSchema = z.object({ timezone: z.string() })

/** PATCH /me response: the stored zone, which is not the requested one once it was already set. */
export const timezoneResponseSchema = z.object({ timezone: z.string().min(1) })

export type TimezoneResponse = z.infer<typeof timezoneResponseSchema>
