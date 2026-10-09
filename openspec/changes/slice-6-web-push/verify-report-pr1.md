```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:c9879cb4f36a6644a14229e6b27e2361de243397a86e5f049d3b60d77cd99265
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 7/7
scenarios: 18/18
test_command: npm run verify
test_exit_code: 0
test_output_hash: sha256:c9879cb4f36a6644a14229e6b27e2361de243397a86e5f049d3b60d77cd99265
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:50d18da4e089f539592ed831a4b93431a03de71974885af2820b8bf9cd8f7c7e
```

## Verification Report: slice-6-web-push, PR1 (backend core, runtime, token codec)

**Change**: slice-6-web-push
**Scope**: PR1 only (commits 00a2dea..4dc6653 on c4c8a20, branch feat/slice-6-web-push). The envelope totals are PR1-scoped so the validator can admit them: 7 push-scheduler requirements and 18 `[PR1]` scenarios, all compliant (the `[manual]` real-delivery scenario is deferred and counted outside). The whole change has 24 requirements and 75 scenarios; PR2 and PR3 scenarios are deferred, not failed.
**Mode**: Strict TDD (runner `npm run test`)

### Completeness

| Metric                      | Value                                                        |
| --------------------------- | ------------------------------------------------------------ |
| PR1 tasks (1.1 to 8.2, 9.1) | all checked, all match code state                            |
| PR1 tasks incomplete        | 1: 9.2 manual smoke (pending HUMAN, see W2)                  |
| Deferred (not verified)     | PR2 (10.1 to 13.2), PR3 (14.1 to 20.3), HUMAN tasks H1 to H6 |

### Build and test execution

| Command                                                                | Exit | Result                                                                                                                                                                                                  |
| ---------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`                                                       | 0    | prettier, eslint, tsc clean; api 379 passed + 33 skipped, web 459, shared 277 passed + 3 todo                                                                                                           |
| `npm run build -w @onti/api`                                           | 0    | `dist/main.js` 56.77 KB; keeps `from "web-push"` external (1 match); `node --input-type=module -e "import w from 'web-push'; console.log(typeof w.sendNotification)"` from `apps/api` prints `function` |
| `npm run build`                                                        | 0    | web built (chunk-size notice only, pre-existing)                                                                                                                                                        |
| `[pg]` push.pg.test.ts, fresh throwaway Postgres 16 (re-run by verify) | 0    | 12 passed alone; full api suite with the database and `--no-file-parallelism`: 412 passed. Database dropped afterwards.                                                                                 |

Coverage: not available (config: `coverage.available: false`).

### TDD compliance

| Check                 | Result | Details                                                                                                          |
| --------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| TDD evidence reported | warn   | Engram #1148 lists RED reason and GREEN count per task in prose; there is no TDD Cycle Evidence table (W3)       |
| All tasks have tests  | pass   | every code task maps to an existing test file                                                                    |
| RED confirmed         | pass   | each RED reason is credible (module not found; 5.3 and 7.1 have documented characterization and mutation checks) |
| GREEN confirmed       | pass   | all listed files pass on this run                                                                                |
| Triangulation         | pass   | status mapping, config matrix, token tamper cases and timezone use several distinct expected values              |
| Assertion quality     | pass   | no tautologies, ghost loops or smoke-only tests found; one implementation-coupled spy (S3)                       |

Test layers: unit (pure builders, codec, config, scheduler, sender, dispatch with fakes), integration (push-runtime with Kysely DummyDriver), real database (`[pg]`, 12). No e2e (not available per config).

### Spec compliance matrix (PR1 scenarios, push-scheduler)

| Scenario                            | Evidence (file:line)                                                                                                                                                                                        | Result                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| One push per due_at (C2)            | `apps/api/test/dispatch-due.test.ts:51`                                                                                                                                                                     | COMPLIANT                           |
| Done and future are skipped         | `dispatch-due.test.ts:132`                                                                                                                                                                                  | COMPLIANT                           |
| Re-armed after snooze (C5)          | `dispatch-due.test.ts:88`; `postgres/push.pg.test.ts:196` [pg]                                                                                                                                              | COMPLIANT                           |
| Concurrent claims are disjoint [pg] | `push.pg.test.ts:104` and `:126` (SQL equals `isNotificationDue`)                                                                                                                                           | COMPLIANT (real DB, run by verify)  |
| Send failure is not retried         | `dispatch-due.test.ts:143`                                                                                                                                                                                  | COMPLIANT                           |
| No subscription (C7)                | `dispatch-due.test.ts:111` (marked, nothing sent). "Still on Today" is the slice 1 proof                                                                                                                    | COMPLIANT                           |
| Past capture                        | `dispatch-due.test.ts:123`                                                                                                                                                                                  | COMPLIANT                           |
| No burst on first deploy            | `push.pg.test.ts:210` [pg] (overdue open marked; a due-after-deploy reminder is sent by the C2 test). The first tick after the migration is not one test; orchestrator ran the built API against a database | COMPLIANT [pg], see S4              |
| Backfill SQL [pg]                   | `push.pg.test.ts:210`: overdue open, overdue done, future, plain; `due_at` unchanged; second run no-op                                                                                                      | COMPLIANT (see W1)                  |
| Config matrix                       | `apps/api/test/push-config.test.ts:16,34,40,46,71,106`                                                                                                                                                      | COMPLIANT                           |
| Disabled does not claim             | `apps/api/test/push-runtime.test.ts:69` (no scheduler, no timer, no query)                                                                                                                                  | COMPLIANT                           |
| Payload (C2)                        | `apps/api/test/push-payload.test.ts:31`                                                                                                                                                                     | COMPLIANT                           |
| Body limits                         | `push-payload.test.ts:89`; `apps/api/test/plain-text.test.ts` (blank lines, 3 lines gives 2, 120 code points with the ellipsis)                                                                             | COMPLIANT                           |
| Timezone                            | `push-payload.test.ts:61` (New York), `:71` (invalid zone gives UTC)                                                                                                                                        | COMPLIANT                           |
| Every device                        | `dispatch-due.test.ts:159`                                                                                                                                                                                  | COMPLIANT                           |
| Gone endpoint                       | `dispatch-due.test.ts:172`; `apps/api/test/web-push-sender.test.ts:52` (404 and 410)                                                                                                                        | COMPLIANT                           |
| Transient error                     | `dispatch-due.test.ts:183,199,211`; `web-push-sender.test.ts:57,62`                                                                                                                                         | COMPLIANT                           |
| Build                               | `apps/api/test/web-push-interop.test.ts:6,17`; build run above                                                                                                                                              | COMPLIANT                           |
| Real delivery [manual]              | none                                                                                                                                                                                                        | DEFERRED (HUMAN, after PR2 and PR3) |

**PR1 compliance**: 18/18 scenarios compliant. Out of scope and deferred: all `[PR2]` and `[PR3]` scenarios (push-subscriptions, push-actions, reminder-actions, notification-permission) and the `[manual]` real delivery. The token codec has no scenario of its own in PR1; it is covered by the design and ADR-004 checks below (`hmac-action-tokens.test.ts`, 14 tests).

### Correctness (static evidence against the requested checks)

| Check                            | Status      | Notes                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R10 claim semantics              | Implemented | `postgres-reminder-claimer.ts`: one statement, `due_at <= $now`, `done_at is null`, `notified_due_at is distinct from due_at` (distinct from `due_at`), `FOR UPDATE SKIP LOCKED`, marks in the same statement before any send (at-most-once). Users with no subscription are claimed too (`dispatch-due.ts` returns after the claim).           |
| Time only through the Clock port | Implemented | `grep` for `new Date(`/`Date.now(` in `apps/api/src` finds none outside the clock adapter. `now` is a SQL parameter in the claim. The migration's `now()` is the accepted exception.                                                                                                                                                            |
| Owner role scope (ADR-001)       | Implemented | The claim and the scheduler-side subscription reads and outcome writes use the owner pool; no user-facing route changed. The subscribe reassignment (the one extra owner statement) is PR2. `schema.md` states this.                                                                                                                            |
| HMAC token codec                 | Implemented | `base64url(JSON).base64url(HMAC-SHA-256)`, signature over the first segment text, `timingSafeEqual` on equal-length buffers (length checked first), `exp` checked with the injected `now` (invalid at `exp`), claims parsed with `actionClaimsSchema` (noteId, userId, dueAt, actions, exp), every failure is `null`. TTL 24 h matches ADR-004. |
| Payload rules                    | Implemented | Title `HH:MM · title` in the profile zone (invalid gives UTC); body is the first 2 non-empty stripped lines cut to 120 code points plus tag names; ids only in `tag` and `noteId`, none in visible text (SG17, rule 13).                                                                                                                        |
| web-push error mapping           | Implemented | 404 and 410 delete; other errors and throws add 1 to `failure_count` (transaction: update then delete at `>= 5`); success resets and stamps `last_success_at`; TTL 3600, urgency high, timeout 10 s.                                                                                                                                            |
| Config all-or-none               | Implemented | Errors list names only (`push-config.test.ts:71` checks values never appear); scheduler built only when config is complete.                                                                                                                                                                                                                     |
| No real network in tests         | Verified    | The sender takes an injected client; tests use fakes. The only real `web-push` use is key generation and a function-type check.                                                                                                                                                                                                                 |
| Backfill migration               | Implemented | Idempotent by predicate (second run reports 0 rows in the pg test); `docs/db/schema.md` updated in the same commit 587b469 (rule 19).                                                                                                                                                                                                           |
| Conventional commits             | Verified    | 9 commits, all conventional, no AI attribution lines.                                                                                                                                                                                                                                                                                           |

### Coherence (design)

| Decision                                          | Followed?         | Notes                                                                                                                          |
| ------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Markdown stripper local to the API (decision 7)   | Yes               | `domain/plain-text.ts`, with the swap note.                                                                                    |
| Token codec in PR1 (resolved 3)                   | Yes               |                                                                                                                                |
| Interval scheduler, no overlap, `unref` timer     | Yes               | `scheduler.ts`; `scheduler.test.ts`.                                                                                           |
| `main.ts` wiring is tested                        | Deviation (small) | Wiring moved to `push-runtime.ts` because `main.ts` runs at import; behavior unchanged, `push-runtime.test.ts` covers it (S2). |
| Forecast ~1,370 lines                             | Deviation         | Actual 2,368 insertions and deletions excluding lockfile and `.engram` (W4).                                                   |
| PR1 `size:exception`, `exception-ok`, no chaining | Followed          |                                                                                                                                |

### Issues found

**CRITICAL**: None.

**WARNING**:

- W1. `push.pg.test.ts:210` is order-dependent. The migration runs over the whole table, so `expect(await run()).toBe(1)` reports 6 when `search.pg.test.ts` runs in parallel against the same database (its fixtures are already overdue). Reproduced twice with `npm run test -w @onti/api` and the database set (1 failed, 411 passed). It passes alone and with `--no-file-parallelism` (412 passed). The `[pg]` tests are not in CI, so merging is not blocked, but the documented run command in the test header can fail. Fix: scope the assertion to the test's own rows, or run pg files serially.
- W2. Task 9.2 (manual smoke) is unchecked, and the manual delivery smoke and applying the migration to Supabase (H2) are not done. All are HUMAN items by agreement. They must be closed before push is enabled in production.
- W3. Apply evidence in Engram #1148 is prose, not the TDD Cycle Evidence table the strict module expects. Content is sufficient and cross-checked; format only.
- W4. PR1 is about 2,368 changed lines against a 1,370 forecast (tests, fakes and docs dominate). It is within the accepted `size:exception`, but `tasks.md` still shows the old forecast and the "re-forecast at c3 and c7" note was not applied to the file.

**SUGGESTION**:

- S1. Body limit: the 120-character cap applies to the text lines, then the tag line is appended, so the whole body can exceed 120. The test at `push-payload.test.ts:89` encodes this. Clarify the spec wording ("at most 120 characters" plus "the tag display name") when PR2 touches the specs.
- S2. `main.ts` (listen, then start the scheduler; shutdown order scheduler, app, DB) has no automated test; it was checked by the orchestrator's run of the built API. Acceptable given the composition module.
- S3. `hmac-action-tokens.test.ts:98` asserts a `timingSafeEqual` call count through a module mock. It matches the spec ("constant-time compare") but couples to the implementation.
- S4. A single test that applies the migration and then runs a tick (no burst) would cover the "No burst on first deploy" scenario end to end instead of by two parts.
- S5. `apps/api/test/postgres/standins.sql` hardcodes `onti_s5_check` in `alter database`, so a fresh database with another name fails the stand-in setup (pre-existing, found during this run; worked around with a temp copy outside the repo).
- S6. By design (at-most-once), a reminder whose subscription lookup throws after the claim is logged and not retried. Documented behavior; keep it visible in the PR body.

### Verdict

**PASS WITH WARNINGS**. All 18 PR1 scenarios are backed by passing tests (12 on a real Postgres re-run by verify), `npm run verify`, the API build and the full build are green, and the requested semantics hold. Archive of the whole change must wait for PR2 and PR3; the four warnings do not block PR1.
