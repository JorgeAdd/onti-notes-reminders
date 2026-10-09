import { makeCaptureNote } from './application/capture-note'
import { makeGetMe } from './application/get-me'
import { makeGetNote } from './application/get-note'
import { makeGetToday } from './application/get-today'
import { makeMarkDone } from './application/mark-done'
import { makeSearchNotes } from './application/search-notes'
import { makeSetTimezone } from './application/set-timezone'
import { makeSnoozeNote } from './application/snooze-note'
import { makeUndoDone } from './application/undo-done'
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
const notes = new PostgresNoteRepository(db)
const clock = new SystemClock()

const app = buildServer({
  verifier: JwksTokenVerifier.forSupabase(config.SUPABASE_URL),
  getMe: makeGetMe(profiles),
  setTimezone: makeSetTimezone(profiles),
  getToday: makeGetToday({ clock, notes, profiles }),
  actions: {
    captureNote: makeCaptureNote({ notes }),
    snoozeNote: makeSnoozeNote({ clock, notes, profiles }),
    markDone: makeMarkDone({ clock, notes }),
    undoDone: makeUndoDone({ notes }),
  },
  corsOrigins: config.CORS_ORIGINS,
  logger: true,
  searchNotes: makeSearchNotes({ clock, notes, profiles }),
  getNote: makeGetNote({ clock, notes, profiles }),
})

async function shutdown() {
  await app.close()
  await db.destroy()
  process.exit(0)
}
process.on('SIGTERM', () => void shutdown())
process.on('SIGINT', () => void shutdown())

await app.listen({ port: config.PORT, host: '0.0.0.0' })
