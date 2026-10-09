# Push-scheduler Specification

## Purpose

Send one Web Push per `due_at` value (R10, C2, C5, C7). Scenarios run with an injected `Clock`, a fake claimer and a fake push sender (no network), or are labeled `[pg]` (real Postgres, `ONTI_TEST_DATABASE_URL`, not in CI) or `[manual]` (real delivery). PR tags: `[PR1]` backend core. Variable names: `docs/roadmap.md` Slice 6.

## Requirements

### Requirement: Tick and claim

The scheduler MUST run one tick every 30 s with an injectable timer, MUST NOT overlap ticks, and MUST read `now` only from the Clock port (CLAUDE.md rule 16). A tick MUST claim, in one atomic step with `FOR UPDATE SKIP LOCKED`, every note with `due_at <= now`, `done_at is null` and `notified_due_at is distinct from due_at`, setting `notified_due_at := due_at` before any send (at-most-once, R10).

#### Scenario: One push per due_at (C2) [PR1]

- GIVEN Tue 6 17:00 and N1 open, due 17:00, never notified
- WHEN a tick runs, then a second tick runs
- THEN one push is sent and `notified_due_at` is 17:00; the second tick claims 0

#### Scenario: Done and future are skipped [PR1]

- GIVEN one done note due in the past and one open note due in the future
- WHEN a tick runs
- THEN nothing is claimed or sent

#### Scenario: Re-armed after snooze (C5) [PR1]

- GIVEN N2 notified for 10:05, then snoozed to 11:05
- WHEN ticks run at 11:04 and at 11:05
- THEN nothing is sent at 11:04; one push is sent at 11:05

#### Scenario: Concurrent claims are disjoint `[pg]` [PR1]

- GIVEN 20 due notes and two overlapping claims
- WHEN both run
- THEN no note is claimed twice and the union is all 20; the SQL predicate agrees with `isNotificationDue`

#### Scenario: Send failure is not retried [PR1]

- GIVEN a claimed reminder whose send throws
- WHEN the next tick runs
- THEN the reminder is not claimed again

### Requirement: Claim without subscription

The claim MUST mark reminders of users with no subscription as notified and send nothing; the item stays on Today (C7, R3).

#### Scenario: No subscription (C7) [PR1]

- GIVEN Wed 09:30, N4 due 09:30 and the user has no subscription
- WHEN a tick runs
- THEN `notified_due_at` is 09:30, no send is attempted, and N4 is still on today's page

### Requirement: Past-time capture

A reminder created already overdue (`today HH:MM`, R11) MUST be notified on the next tick, within 30 s.

#### Scenario: Past capture [PR1]

- GIVEN a note captured with `today 08:00` at 09:05
- WHEN a tick runs at or before 09:05:30
- THEN one push is sent for it

### Requirement: Backfill before start

A migration MUST set `notified_due_at := due_at` for every open reminder with `due_at <= deploy time` before the scheduler can run, and `docs/db/schema.md` MUST be updated in the same commit (rule 19).

#### Scenario: No burst on first deploy [PR1]

- GIVEN open reminders overdue at migration time
- WHEN the migration applies and the first tick runs
- THEN none is sent; a reminder due after deploy is sent normally

#### Scenario: Backfill SQL `[pg]` [PR1]

- GIVEN overdue open, overdue done and future notes
- WHEN the migration runs
- THEN only the overdue open ones are marked; `due_at` is unchanged

### Requirement: All-or-none configuration

The scheduler MUST start only when `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_ACTION_SECRET` and `API_PUBLIC_URL` are all set. Partial configuration MUST fail startup with a message naming the missing names, never their values. With none set, the API MUST run with push disabled.

#### Scenario: Config matrix [PR1]

- GIVEN none, all, or a subset of the variables
- WHEN config loads
- THEN none gives push disabled, all gives push enabled, a subset gives an error that lists only the missing names

#### Scenario: Disabled does not claim [PR1]

- GIVEN push disabled
- WHEN time advances several ticks
- THEN no timer is armed and `notified_due_at` never changes

### Requirement: Delivery and payload

Each claimed reminder MUST be sent to every subscription of its owner. The payload MUST carry: title `HH:MM · <note title>` in the profile timezone (R16); body of the first 2 non-empty lines, markdown stripped, at most 120 characters, plus the tag display name; `tag` equal to the note id so a newer push replaces it; app name "Notes + Reminders"; the signed action token (`push-actions`). It MUST NOT show internal IDs in visible text (rule 13).

#### Scenario: Payload (C2) [PR1]

- GIVEN N1 with a two-line body with markdown and tag Client A, profile `America/Mexico_City`
- WHEN it is sent
- THEN title is "17:00 · Notify Ana: move repo permissions from me to Luis", body has 2 plain lines plus "Client A", tag is the note id

#### Scenario: Body limits [PR1]

- GIVEN a body with blank lines, 3 lines and a 300-character first line
- WHEN the payload is built
- THEN blanks are skipped, only 2 lines remain, and the body is at most 120 characters

#### Scenario: Timezone [PR1]

- GIVEN a New York profile and a due instant of 21:00Z
- WHEN the title is built
- THEN it starts with the New York local time

#### Scenario: Every device [PR1]

- GIVEN a user with three subscriptions
- WHEN the reminder is sent
- THEN the sender is called three times

#### Scenario: Real delivery `[manual]`

- GIVEN a deployed API with VAPID set and a subscribed browser with the app closed
- WHEN a reminder falls due
- THEN the notification shows within 30 s with Done and "+1 h"

### Requirement: Sender outcomes

A 404 or 410 from the push service MUST delete that subscription. Any other error MUST increment its `failure_count` and MUST NOT delete it. Success MUST set `last_success_at`. One failing device MUST NOT stop the others.

#### Scenario: Gone endpoint [PR1]

- GIVEN a fake sender returning 410 for one of two subscriptions
- WHEN the reminder is sent
- THEN that row is deleted and the other receives the push

#### Scenario: Transient error [PR1]

- GIVEN a fake sender returning 500
- WHEN the reminder is sent
- THEN `failure_count` is incremented and the row remains

#### Scenario: Build `[PR1]`

- GIVEN the production build
- WHEN the bundled API imports `web-push`
- THEN the build succeeds and the module loads
