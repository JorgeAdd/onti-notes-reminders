# Push-actions Specification

## Purpose

Done and "+1 h" from a notification, with the app closed, authenticated by a signed action token (ADR-004, the only exception to CLAUDE.md rule 18). Math: R7, R9, C3, C15. Tests use an injected `Clock` and Fastify inject. PR tags: `[PR2]` token and endpoints, `[PR3]` service worker.

## Requirements

### Requirement: Action token

The token MUST be HMAC-SHA-256 signed with `PUSH_ACTION_SECRET` and carry `noteId`, `userId`, `dueAt`, the allowed actions (`done`, `snooze`) and `exp` (signing time plus 24 h). It MUST travel only inside the encrypted push payload, never in a URL, log or error body.

#### Scenario: Round trip [PR2]

- GIVEN a token signed at Tue 17:00
- WHEN verified at Tue 17:00:30
- THEN its claims equal those signed

#### Scenario: Rejected tokens [PR2]

- GIVEN a tampered payload, a wrong secret, a malformed string, and a token verified at signing + 24 h + 1 s
- WHEN each is verified
- THEN each is invalid

### Requirement: Action endpoints

`POST /push-actions/done` and `POST /push-actions/snooze` MUST accept the token (not a JWT) and run as `token.userId`, scoped to that user (R15). Both MUST require a valid signature, `exp` not passed, the action allowed, and note `due_at` equal to `token.dueAt`. Done MUST follow R9 (idempotent); snooze MUST set `due_at := now + 1 h` (R7), `snooze_count += 1`, and leave `original_due_at` unchanged. Every other route MUST still require the JWT.

| Case                                                                  | Result                   |
| --------------------------------------------------------------------- | ------------------------ |
| Missing, malformed, forged or expired token                           | `401`                    |
| Unknown note, another user's note, or action not allowed by the token | `404` (never `403`, R15) |
| Note `due_at` differs from `token.dueAt` (replayed or stale tap)      | `409`                    |
| Snooze on a done note                                                 | `409`                    |
| Done on a done note                                                   | no-op success (R9)       |

The `401` body MUST be identical for every token failure. A `404` MUST NOT reveal whether the note exists.

#### Scenario: Done (C3) [PR2]

- GIVEN Tue 17:00 and N1 open, due 17:00, with a valid token
- WHEN `POST /push-actions/done`
- THEN `done_at` is 17:00 and `due_at` is unchanged

#### Scenario: Done is idempotent [PR2]

- GIVEN the note already done at T1
- WHEN the same request is repeated
- THEN success and `done_at` stays T1

#### Scenario: Snooze (C15) [PR2]

- GIVEN Wed 10:05, N2 due 10:05, count 1, original Tue 18:00
- WHEN `POST /push-actions/snooze` with its token
- THEN `due_at` is 11:05, count is 2, original is Tue 18:00

#### Scenario: Replay fails (C15) [PR2]

- GIVEN the snooze already applied
- WHEN the same token is used again
- THEN `409` and the note is unchanged

#### Scenario: Stale after reschedule [PR2]

- GIVEN a token for due 10:05 and the note now due 12:00
- WHEN either action is called
- THEN `409` and nothing changes

#### Scenario: Snooze on a done note [PR2]

- GIVEN N2 done at Wed 10:00 and a valid token for due 10:05
- WHEN `POST /push-actions/snooze`
- THEN `409` and the note is unchanged

#### Scenario: Wrong action [PR2]

- GIVEN a valid token whose actions list only `done`
- WHEN `POST /push-actions/snooze`
- THEN `404` (never `403`) and the note is unchanged

#### Scenario: Unknown note [PR2]

- GIVEN a valid token naming a note id that does not exist
- WHEN any action is called
- THEN `404`

#### Scenario: Scoped to the token user [PR2]

- GIVEN a token for Ana naming Jorge's note
- WHEN any action is called
- THEN `404`, the same body as an unknown note, and Jorge's note is unchanged

#### Scenario: Token failures look alike [PR2]

- GIVEN no body, a malformed token, a forged signature, and an expired token
- WHEN each calls `POST /push-actions/done`
- THEN each gets `401` with the same body

#### Scenario: JWT still required elsewhere [PR2]

- GIVEN a valid action token as a bearer on `POST /notes/:id/done`
- WHEN requested
- THEN `401`

### Requirement: Service worker handling

The service worker MUST always show a notification for a push, with `tag` equal to the note id, the payload title and body, and Done and "+1 h" actions only when `Notification.maxActions` allows them. A click on an action MUST call the matching endpoint with the token and, on success, notify open clients to refetch Today. A body click MUST focus or open the app at `/`.

#### Scenario: Show [PR3]

- GIVEN a stubbed `self` and a push event with a payload
- WHEN it fires
- THEN `showNotification` runs once with that title, body, tag and two actions

#### Scenario: Malformed payload [PR3]

- GIVEN a push event with no or invalid data
- WHEN it fires
- THEN a generic notification is still shown and nothing throws

#### Scenario: Action click [PR3]

- GIVEN a notification with a token
- WHEN the Done action is clicked
- THEN the done endpoint is called with the token, the notification closes, and clients receive a refetch message

#### Scenario: Actions unsupported [PR3]

- GIVEN `Notification.maxActions` is 0 or absent
- WHEN a push is shown
- THEN no action buttons are requested and a body click opens the app

### Requirement: Open-the-app fallback

If the action call fails for any reason (non-2xx, network, missing token), the click MUST open the app carrying the action, the note id and the notification's `dueAt`: it focuses an open window and posts `{ type: 'onti:action', action, noteId, dueAt }`, or opens `/?action=<done|snooze>&note=<id>&due=<epoch ms>`. The app MUST clear the parameters from the URL first, then run the action through the normal JWT path ONLY if Today still shows that note open with the same `due_at`; otherwise it MUST change nothing and just show Today (ADR-004 decision 5). A replayed tap therefore never acts twice (C15). An unknown action value or malformed parameters MUST be ignored.

#### Scenario: Fallback opens the app [PR3]

- GIVEN the endpoint returns `409` and no window is open
- WHEN "+1 h" is clicked
- THEN a window opens at `/?action=snooze&note=<id>&due=<dueAt>` for that notification

#### Scenario: Fallback to an open window [PR3]

- GIVEN the fetch throws and a window is open
- WHEN Done is clicked
- THEN that window is focused and receives `onti:action` with the action, note id and `dueAt`

#### Scenario: Same due_at runs the action [PR3]

- GIVEN a signed-in app loaded at `/?action=done&note=N1&due=<17:00>` and Today shows N1 open, due 17:00
- WHEN it mounts
- THEN the parameters are removed, then the done mutation runs with the JWT

#### Scenario: Changed due_at changes nothing [PR3]

- GIVEN `/?action=snooze&note=N2&due=<10:05>` and Today shows N2 due 11:05 (already snoozed)
- WHEN the app mounts
- THEN no mutation runs, the parameters are removed, and Today is shown

#### Scenario: Done note changes nothing [PR3]

- GIVEN `/?action=snooze&note=N2&due=<10:05>` and N2 is done (not open in Today)
- WHEN the app mounts
- THEN no mutation runs and Today is shown

#### Scenario: Unknown value [PR3]

- GIVEN `/?action=delete`, or a missing or non-numeric `due`
- WHEN the app mounts
- THEN no mutation runs

#### Scenario: Closed app `[manual]`

- GIVEN a delivered notification and the app closed
- WHEN Done is tapped
- THEN the item is done without opening the app (C3)
