import { z } from 'zod'
import { loadPushConfig, type PushConfig } from './push-config'

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  SUPABASE_URL: z.url(),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
})

export type Config = z.infer<typeof envSchema> & {
  /** `null` when no push variable is set: push is disabled. */
  push: PushConfig | null
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return { ...envSchema.parse(env), push: loadPushConfig(env) }
}
