import { makeGetMe } from './application/get-me'
import { makeGetToday } from './application/get-today'
import { loadConfig } from './config'
import { JwksTokenVerifier } from './infrastructure/auth/jwks-token-verifier'
import { SystemClock } from './infrastructure/clock/system-clock'
import { createDatabase } from './infrastructure/db/database'
import { PostgresNoteRepository } from './infrastructure/db/postgres-note-repository'
import { PostgresProfileRepository } from './infrastructure/db/postgres-profile-repository'
import { buildServer } from './infrastructure/http/server'

const config = loadConfig()
const db = createDatabase(config.DATABASE_URL)
const profiles = new PostgresProfileRepository(db)

const app = buildServer({
  verifier: JwksTokenVerifier.forSupabase(config.SUPABASE_URL),
  getMe: makeGetMe(profiles),
  getToday: makeGetToday({
    clock: new SystemClock(),
    notes: new PostgresNoteRepository(db),
    profiles,
  }),
  corsOrigins: config.CORS_ORIGINS,
  logger: true,
})

async function shutdown() {
  await app.close()
  await db.destroy()
  process.exit(0)
}
process.on('SIGTERM', () => void shutdown())
process.on('SIGINT', () => void shutdown())

await app.listen({ port: config.PORT, host: '0.0.0.0' })
