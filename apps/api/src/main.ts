import webpush from 'web-push'
import { makeCaptureNote } from './application/capture-note'
import { makeDeleteNote } from './application/delete-note'
import { makeGetMe } from './application/get-me'
import { makeGetNote } from './application/get-note'
import { makeGetToday } from './application/get-today'
import { makeMarkDone } from './application/mark-done'
import { makeSearchNotes } from './application/search-notes'
import { makeSetTimezone } from './application/set-timezone'
import { makeSnoozeNote } from './application/snooze-note'
import { makeUndoDone } from './application/undo-done'
import { makeUpdateNote } from './application/update-note'
import { loadConfig } from './config'
import { JwksTokenVerifier } from './infrastructure/auth/jwks-token-verifier'
import { SystemClock } from './infrastructure/clock/system-clock'
import { createDatabase } from './infrastructure/db/database'
import { PostgresNoteRepository } from './infrastructure/db/postgres-note-repository'
import { PostgresProfileRepository } from './infrastructure/db/postgres-profile-repository'
import { buildServer } from './infrastructure/http/server'
import { createPushRouteDeps, createPushRuntime } from './push-runtime'

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
    updateNote: makeUpdateNote({ clock, notes, profiles }),
    deleteNote: makeDeleteNote({ notes }),
  },
  corsOrigins: config.CORS_ORIGINS,
  logger: true,
  searchNotes: makeSearchNotes({ clock, notes, profiles }),
  getNote: makeGetNote({ clock, notes, profiles }),
  // Push routes exist only when push is configured.
  push: createPushRouteDeps({ push: config.push, db, clock, notes }),
})

// Push is off unless all five push variables are set (no sender, no scheduler).
const pushRuntime = createPushRuntime({
  push: config.push,
  db,
  clock,
  client: webpush,
  log: { error: (message, context) => app.log.error(context ?? {}, message) },
})

async function shutdown() {
  await pushRuntime?.scheduler.stop()
  await app.close()
  await db.destroy()
  process.exit(0)
}
process.on('SIGTERM', () => void shutdown())
process.on('SIGINT', () => void shutdown())

await app.listen({ port: config.PORT, host: '0.0.0.0' })
pushRuntime?.scheduler.start()
