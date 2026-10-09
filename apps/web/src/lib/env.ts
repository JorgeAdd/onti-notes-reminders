import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_API_URL: z.url(),
  /** Web Push public key. Optional: without it the notification control hides (an empty value counts as absent). */
  VITE_VAPID_PUBLIC_KEY: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
})

export const env = envSchema.parse(import.meta.env)
