import { z } from 'zod'

/** GET /me — the signed-in user as the API sees them. */
export const meResponseSchema = z.object({
  userId: z.uuid(),
  email: z.email().nullable(),
  timezone: z.string().min(1),
})

export type MeResponse = z.infer<typeof meResponseSchema>
