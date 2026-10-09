import {
  isOpen,
  markDone,
  snoozeOneHour,
  type ActionClaims,
  type PushAction,
  type Reminder,
} from '@onti/shared'
import type { Identity } from '../domain/identity'
import type { NoteRecord } from '../domain/note'
import { ConflictError, NotFoundError } from './errors'
import type { Clock, NoteRepository } from './ports'

export interface PushActionsDeps {
  clock: Clock
  notes: NoteRepository
}

/**
 * Done and "+1 h" from a verified action token (ADR-004). The HMAC proves the server minted the
 * claims, so they run as the token's user under RLS, scoped to one note and one `due_at`. The
 * `due_at` check runs inside the row lock: a replayed or stale tap is a conflict, never a second act.
 */
export function makePushActions({ clock, notes }: PushActionsDeps) {
  async function run(
    claims: ActionClaims,
    action: PushAction,
    decide: (reminder: Reminder, now: Date) => Reminder,
  ): Promise<NoteRecord> {
    // An action the token does not allow looks like an unknown note: no DB access (R15).
    if (!claims.actions.includes(action)) throw new NotFoundError('Note not found')
    const identity: Identity = {
      userId: claims.userId,
      email: null,
      claims: { sub: claims.userId, role: 'authenticated' },
    }
    const now = clock.now()
    const note = await notes.mutateReminder(identity, claims.noteId, (reminder) => {
      if (reminder.dueAt?.getTime() !== claims.dueAt) throw new ConflictError('due_at_changed')
      return decide(reminder, now)
    })
    if (note === null) throw new NotFoundError('Note not found')
    return note
  }

  return {
    /** R9 · idempotent: done on a done note with the same `due_at` is a no-op success. */
    done: (claims: ActionClaims) => run(claims, 'done', (reminder, now) => markDone(reminder, now)),
    /** R7 and C15 · now + 1 h, count + 1, original due unchanged. */
    snooze: (claims: ActionClaims) =>
      run(claims, 'snooze', (reminder, now) => {
        if (!isOpen(reminder)) throw new ConflictError('not_open')
        return snoozeOneHour(reminder, now)
      }),
  }
}

export type PushActions = ReturnType<typeof makePushActions>
