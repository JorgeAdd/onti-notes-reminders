# ADR-004 — Signed action tokens for notification actions

- Status: Accepted
- Date: 2026-10-08

## Context

Slice 6 sends a Web Push notification when a reminder is due (CONTRACT
R10). The notification has two actions, Done and "+1 h" (SG17), and the
brief expects Done to work from the notification itself (matrix C3).

The actions run in the service worker, often while the app is closed. The
service worker has no Supabase session: `supabase-js` keeps it in the
page's storage, and the access token expires after 1 h. ADR-001 and
CLAUDE.md rule 18 require a verified Supabase JWT on every API request, so
the service worker has nothing to authenticate with.

## Decision

1. **Each push carries a signed action token.** When the scheduler sends a
   notification, the API signs a capability token with HMAC-SHA-256 and
   the server secret `PUSH_ACTION_SECRET`. Its claims are `noteId`,
   `userId`, `dueAt`, the allowed actions (`done`, `snooze`) and `exp`
   (24 h after signing). The token travels inside the encrypted Web Push
   payload, never in a URL.
2. **The service worker calls `POST /push-actions/{done|snooze}`** with
   the token. These two routes are the only ones that accept a token
   instead of a JWT (CLAUDE.md rule 18).
3. **The server verifies before acting:** a valid signature, `exp` not
   passed, the action among the allowed actions, and
   `note.due_at == token.dueAt`. A replay after a snooze or a reschedule
   fails because `due_at` has changed.
4. **The action runs as that user.** The request runs as `authenticated`
   with the claims of `token.userId`, so queries are scoped to that user
   and RLS still applies (ADR-001, decision 5). Done is idempotent (R9);
   snooze is "+1 h" (R7).
5. **Any failure falls back to the app.** If the call fails for any
   reason (expired token, changed `due_at`, network), the notification
   click opens the app with the action, the note id and the
   notification's `due_at` (`/?action=...&note=...&due=...`, or a message
   to an already open window). The app runs the action through the normal
   JWT path only if Today still shows that note open with the same
   `due_at`; otherwise it just opens Today and changes nothing. A replayed
   tap therefore never acts twice (C15).
6. **Error codes for `POST /push-actions/*`** (R15: another user's resource
   is `404`, never `403`):

   | Status | When                                                                                      |
   | ------ | ----------------------------------------------------------------------------------------- |
   | `401`  | Missing, malformed, forged or expired token                                               |
   | `404`  | Unknown note, another user's note, or an action the token does not allow                  |
   | `409`  | Only when the note's `due_at` changed (a replayed or stale tap), or snooze on a done note |

   Done on a note that is already done is a no-op success (R9).

## Consequences

- A leaked `PUSH_ACTION_SECRET` lets anyone forge actions for any user
  until the secret is rotated. It lives only in the API's environment
  (Railway), never in the web bundle.
- Rotating the secret invalidates every outstanding token; those
  notifications fall back to opening the app.
- A token is scoped to one note, one `due_at` value and two actions, and
  expires after 24 h. A stolen token can at most mark that note done or
  snooze it once.
- Rule 18 gains one explicit, narrow exception; every other route still
  requires the JWT.
- No refresh token or session data is copied into the service worker.

## Alternatives considered

- **Copy the access token into IndexedDB** for the service worker: the
  token expires after 1 h, so actions degrade exactly when the app has
  been closed for a while, which is the main case for a notification.
- **Only open the app from the notification:** simplest and keeps rule 18
  without exceptions, but Done is no longer in the notification, which
  the brief expects.
