```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:bfc973443dad3e2bd67b6899cb9c6449c9bb988ae2ba10dc1e2161156fef9873
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 7/7
scenarios: 25/25
test_command: npm run verify
test_exit_code: 0
test_output_hash: sha256:bfc973443dad3e2bd67b6899cb9c6449c9bb988ae2ba10dc1e2161156fef9873
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:e14c5286c64fb7d81980144b6d6829e928a57489da8e3bc6cdfe4c06dcbf94b5
```

## Verification Report: slice-6-web-push, PR2 (subscription and action endpoints)

**Change**: slice-6-web-push
**Scope**: PR2 only (commits c8d1cb4..0cae399 plus the merge 5d511c8 of origin/main 88f30ef, branch feat/slice-6-web-push-endpoints, HEAD 5d511c8). The envelope totals are PR2-scoped: 7 requirements (push-actions: Action token, Action endpoints; reminder-actions: "+1 h" from a notification; push-subscriptions: Subscribe, Endpoint owned by another user, Unsubscribe, Pruning) and 25 `[PR2]`-tagged scenarios, all compliant. PR1 is verified in `verify-report-pr1.md`; PR3 (service worker, fallback bridge, control, sign-out) is deferred, not failed. Scenario halves tagged `[PR3]` or `[manual]` are counted outside this scope.
**Mode**: Strict TDD (runner `npm run test`)

### Completeness

| Metric                         | Value                                                          |
| ------------------------------ | -------------------------------------------------------------- |
| PR2 tasks (10.1 to 12.3, 13.1) | all checked, all match code state                              |
| PR2 tasks incomplete           | 1: 13.2 manual smoke (pending HUMAN, see W2)                   |
| Deferred (not verified)        | PR3 (14.1 to 20.3), PR1 manual smoke 9.2, HUMAN tasks H1 to H6 |

### Build and test execution

| Command                                                           | Exit | Result                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run verify`                                                  | 0    | prettier, eslint, tsc clean; api 443 passed + 40 skipped (33 files, 4 skipped files are the `[pg]` suites), web 536 passed, shared 344 passed + 3 todo. Counts include slice 4 PR1 merged from main.                                                               |
| `npm run build -w @onti/api`                                      | 0    | `dist/main.js` 67.06 KB; keeps `from "web-push"` external (1 match); `node --input-type=module -e "import w from 'web-push'; console.log(typeof w.sendNotification)"` from `apps/api` prints `function`                                                            |
| `npm run build`                                                   | 0    | web built (chunk-size notice only, pre-existing)                                                                                                                                                                                                                   |
| `[pg]` full api suite on a fresh throwaway Postgres 16 (this run) | 0    | 33 files, 483 passed, 0 skipped, `--no-file-parallelism`; includes `push-subscriptions.pg.test.ts` (4) and `push.pg.test.ts` (12). Own cluster in a temp directory on its own socket and port, then stopped and deleted; the shared local cluster was not touched. |

Coverage: not available (config: `coverage.available: false`). The working tree is clean after the runs (no source modified, nothing committed).

### TDD compliance

| Check                 | Result | Details                                                                                                                                                                                                                 |
| --------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TDD evidence reported | warn   | Engram #1148 gives RED reason, GREEN count, triangulation and safety net per PR2 task as a bulleted list, not a table (same as PR1 W3, see W3)                                                                          |
| All tasks have tests  | pass   | 10.1, 11.1 (api and shared), 11.2 (pg), 12.1 and 12.2 (routes, runtime wiring) all map to existing test files                                                                                                           |
| RED confirmed         | pass   | each RED reason is credible (module not found, schemas undefined, routes 404, `subscribe is not a function` on a real DB); the pg test also records a mutation check (drop `user_id` from the update set failed 2 of 4) |
| GREEN confirmed       | pass   | every listed file passes on this run, including the pg suite on a real database                                                                                                                                         |
| Triangulation         | pass   | 401 over five token failures, 404 over three causes, 409 for two reasons, snooze at 10:05 and at a DST gap, swap versus first-time response                                                                             |
| Safety net            | pass   | modified files (`errors.ts`, `push-runtime.ts`, `server.ts`, `main.ts`, `push.ts`) had a baseline run recorded (api 379 + 33, shared 16/16, push-runtime 4/4)                                                           |
| Assertion quality     | pass   | no tautologies, ghost loops or smoke-only tests; `expect(mutate).not.toHaveBeenCalled()` is a deliberate "no DB access" proof (S3)                                                                                      |

Test layers: unit (use cases with fakes: `push-actions.test.ts`, `push-subscriptions.test.ts`, shared schema tests), integration (Fastify inject over the real server and real HMAC codec: `push-routes.test.ts`; wiring in `push-runtime.test.ts`), real database (`[pg]`, 4 new). No e2e (not available per config).

### Spec compliance matrix (PR2 scenarios)

| Requirement                    | Scenario                            | Evidence (file:line)                                                                                                                                                                                                                                   | Result    |
| ------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| Action token                   | Round trip                          | `apps/api/test/hmac-action-tokens.test.ts:39` (PR1 c4 codec, exercised end to end by `push-routes.test.ts:206`)                                                                                                                                        | COMPLIANT |
| Action token                   | Rejected tokens                     | `hmac-action-tokens.test.ts:47`, `:53`, `:59`, `:64`, `:91` (tamper, wrong signature, wrong secret, malformed, exp boundary)                                                                                                                           | COMPLIANT |
| Action endpoints               | Done (C3)                           | `push-actions.test.ts:32`; `push-routes.test.ts:206`                                                                                                                                                                                                   | COMPLIANT |
| Action endpoints               | Done is idempotent                  | `push-actions.test.ts:41`; `push-routes.test.ts:230`                                                                                                                                                                                                   | COMPLIANT |
| Action endpoints               | Snooze (C15)                        | `push-actions.test.ts:51`; `push-routes.test.ts:215`                                                                                                                                                                                                   | COMPLIANT |
| Action endpoints               | Replay fails (C15)                  | `push-actions.test.ts:65`; `push-routes.test.ts:215` (409, `due_at_changed`, note identical)                                                                                                                                                           | COMPLIANT |
| Action endpoints               | Stale after reschedule              | `push-actions.test.ts:76`; `push-routes.test.ts:286`                                                                                                                                                                                                   | COMPLIANT |
| Action endpoints               | Snooze on a done note               | `push-actions.test.ts:91`; `push-routes.test.ts:239`                                                                                                                                                                                                   | COMPLIANT |
| Action endpoints               | Wrong action                        | `push-actions.test.ts:100`; `push-routes.test.ts:273` (404 body equal to unknown note, mutate not called)                                                                                                                                              | COMPLIANT |
| Action endpoints               | Unknown note                        | `push-actions.test.ts:112`; `push-routes.test.ts:273`                                                                                                                                                                                                  | COMPLIANT |
| Action endpoints               | Scoped to the token user            | `push-actions.test.ts:112`; `push-routes.test.ts:273` (same body as unknown note)                                                                                                                                                                      | COMPLIANT |
| Action endpoints               | Token failures look alike           | `push-routes.test.ts:248` (missing body, `{}`, malformed, forged, JWT-only, expired: six 401s, one body, DB not touched)                                                                                                                               | COMPLIANT |
| Action endpoints               | JWT still required elsewhere        | `push-routes.test.ts:309`                                                                                                                                                                                                                              | COMPLIANT |
| "+1 h" from a notification     | C15 end to end                      | `push-actions.test.ts:51` (11:05, count 2, original Tue 18:00, `notified_due_at` untouched in the fixture) composed with the re-arm proof `dispatch-due.test.ts` C5 row (nothing at 11:04, one at 11:05); see S1                                       | COMPLIANT |
| "+1 h" from a notification     | Same result as in-app snooze        | `push-actions.test.ts:130`                                                                                                                                                                                                                             | COMPLIANT |
| "+1 h" from a notification     | Second tap opens the app (PR2 half) | `push-routes.test.ts:215` (the `409` half; the service worker and app halves are `[PR3]`)                                                                                                                                                              | COMPLIANT |
| "+1 h" from a notification     | DST (D3)                            | `push-actions.test.ts:124`                                                                                                                                                                                                                             | COMPLIANT |
| Subscribe                      | Subscribe                           | `push-routes.test.ts:99`; `push-subscriptions.test.ts:15`                                                                                                                                                                                              | COMPLIANT |
| Subscribe                      | Repeat                              | `push-subscriptions.test.ts:30`; `push-subscriptions.pg.test.ts:73`                                                                                                                                                                                    | COMPLIANT |
| Subscribe                      | Validation and auth                 | `push-routes.test.ts:116` (400 no `keys.auth`, 400 http, 400 IP literal), `:133` (401 no token and forged token, even for an invalid body); schema cases in `packages/shared/test/push.test.ts` (localhost, userinfo, IPv6, 2049 chars, non-base64url) | COMPLIANT |
| Endpoint owned by another user | Browser changes account             | `push-subscriptions.test.ts:48`; `push-routes.test.ts:146` (identical status and body)                                                                                                                                                                 | COMPLIANT |
| Endpoint owned by another user | RLS holds `[pg]`                    | `push-subscriptions.pg.test.ts:73`, `:93`, `:101` (passed on a real database in this run)                                                                                                                                                              | COMPLIANT |
| Unsubscribe                    | Unsubscribe                         | `push-subscriptions.test.ts:61`; `push-routes.test.ts:173`; `push-subscriptions.pg.test.ts:113`                                                                                                                                                        | COMPLIANT |
| Unsubscribe                    | Not yours                           | `push-subscriptions.test.ts:69`; `push-routes.test.ts:173` (same body); `push-subscriptions.pg.test.ts:101`                                                                                                                                            | COMPLIANT |
| Pruning                        | Pruned stays gone                   | `push-subscriptions.test.ts:76` (a deleted endpoint stays gone and creates nothing) with the PR1 `dispatch-due.test.ts:172` (gone endpoint deleted, others still sent)                                                                                 | COMPLIANT |

**Compliance summary**: 25/25 scenarios compliant, 7/7 requirements.

### Correctness (static evidence)

| Check requested                                                                       | Status      | Notes                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HMAC verified before any DB access                                                    | Implemented | `push-routes.ts:58` verifies the token with `clock.now()` before `run(claims)`; the only DB path is `notes.mutateReminder` inside `push-actions.ts:38`. Test spies `mutateReminder` and sees zero calls for every 401 (`push-routes.test.ts:270`)  |
| 401 for missing, forged, expired; one body                                            | Implemented | One `UnauthorizedError` (`push-routes.ts:59`) and one handler body `{"error":"unauthorized"}` (`server.ts:107`); the codec returns `null` for every failure and uses `timingSafeEqual`                                                             |
| 404 for unknown, other user's note, action not allowed; never 403                     | Implemented | `push-actions.ts:31` (disallowed, before any DB read) and `:42` (`mutateReminder` returns `null` under RLS and `user_id` filter) both throw the same `NotFoundError`; no 403 anywhere in the new code                                              |
| 409 only for changed `due_at` or snooze on a done note                                | Implemented | `due_at_changed` at `push-actions.ts:39` (also for a note with no reminder), `not_open` at `:52`; unknown note stays 404 (`push-routes.test.ts:286`)                                                                                               |
| Done on a done note is a no-op success                                                | Implemented | `markDone` is idempotent; `push-actions.test.ts:91` shows no write and `done_at` unchanged                                                                                                                                                         |
| Runs as the token user under RLS (`asUser`)                                           | Implemented | identity built from `claims.userId` with role `authenticated`; `mutateReminder` runs through `asUser` with `for update` and a `user_id` filter (`postgres-note-repository.ts:166-182`)                                                             |
| +1 h is now + 1 h via the Clock port; `due_at` equals the token's                     | Implemented | `clock.now()` at `push-actions.ts:37`, `snoozeOneHour(reminder, now)`; the `due_at` comparison runs inside the row lock; no `new Date()` or `Date.now()` in the new files                                                                          |
| Subscribe and unsubscribe require the JWT                                             | Implemented | `authenticate(request)` is the first statement of both routes (`push-routes.ts:36`, `:44`), before body validation (401 wins over 400, `push-routes.test.ts:133`)                                                                                  |
| ADR-001 owner-role reassignment is exactly one statement, identical response          | Implemented | `postgres-push-subscriptions.ts:67-81`: one `insert ... on conflict (endpoint) do update` with the verified `userId` and `failure_count` 0; route returns `{ok:true}` in both cases (`push-routes.test.ts:146`); documented in `docs/db/schema.md` |
| Unsubscribe deletes only the caller's row                                             | Implemented | `asUser` plus `where user_id = identity.userId and endpoint = ?`; pg test shows RLS blocks a direct delete as another user too                                                                                                                     |
| Routes exist only with the optional push dependency                                   | Implemented | `server.ts:129` `if (push) registerPushRoutes(...)`; `createPushRouteDeps` returns `undefined` when config is `null` (`push-runtime.test.ts:138`); 404 on all four routes without it (`push-routes.test.ts:321`)                                   |
| No secrets in logs                                                                    | Implemented | none of the new files logs; the only generic path is the existing 500 handler `request.log.error(error)`; the token travels in the POST body, never in a URL; the agent's runtime run found no key or token in the log                             |
| C3 (from the notification) and C15 proven in the same commit as their tests (rule 23) | Implemented | commit ebb9c63 changes `docs/CONTRACT.md` (rows added, C15 removed from "Still todo") together with `push-routes.test.ts`; the rows cite `push-actions.test.ts` (c8d1cb4, earlier commit of the same PR) and `push-routes.test.ts`                 |
| Merge of main kept `getNote` and push routes                                          | Implemented | `ServerDeps` has `getNote` (`server.ts:50`) and optional `push`; `main.ts:40-42` passes both; the push route test harness passes `getNote` (`push-routes.test.ts:68`); `verify` is green                                                           |
| Conventional commits                                                                  | Implemented | `feat(api): ...` x3, `docs(sdd): ...`, one merge commit; no `Co-Authored-By` or AI attribution in `c8d1cb4~1..HEAD`                                                                                                                                |

### Coherence (design)

| Decision                                                                            | Followed? | Notes                                                                                                           |
| ----------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------- |
| 13, 14 (token user identity, `due_at` check inside the row lock)                    | Yes       | `makePushActions` with `mutateReminder`                                                                         |
| ADR-004 error codes (401, 404, 409; fallback guard)                                 | Yes       | the table in ADR-004 matches the implementation case by case                                                    |
| ADR-001 amendment (single owner-role upsert after JWT)                              | Yes       | see Correctness                                                                                                 |
| CLAUDE.md rule 18 exception                                                         | Yes       | only `POST /push-actions/*` skips the JWT; every other route keeps `authenticate`                               |
| Hexagonal layering, time via Clock                                                  | Yes       | `application` has no infrastructure import; `PushDeps` lives in the http layer and is built in the push runtime |
| Deviation 1: `createPushRouteDeps` in `push-runtime.ts`                             | Accepted  | tested (`push-runtime.test.ts:138`, `:144`); keeps `main.ts` thin                                               |
| Deviation 2: `ConflictReason` gains `due_at_changed`                                | Accepted  | the existing handler yields `409 {error: conflict, reason}`                                                     |
| Deviation 3: schema validation rejects IP-literal, localhost and userinfo endpoints | Accepted  | stricter than the spec's "non-https endpoint" example, consistent with the SSRF intent                          |

### Issues found

**CRITICAL**: None.

**WARNING**:

- W1. Size: PR2 adds 1,148 lines (1,150 insertions and 28 deletions across 23 files, `.engram` chunks included) against the 800-line budget that `tasks.md` promised ("PR2 within 800", forecast 665). It needs the `size:exception` label or a split; this is a human decision already flagged by apply (deviation 4). Roughly 800 lines are tests.
- W2. Manual smoke 13.2 (two users subscribing, one row with the new owner; forged action token 401) is pending HUMAN. The agent's curl run covered the forged token (401), subscribe without JWT (401), valid snooze (200) and replay (409), but not the two-user subscribe because it needs a real Supabase JWT. The two-user swap is proven by the `[pg]` test and the route test with fakes. PR1 smoke 9.2 is also still open.
- W3. Strict TDD evidence in apply-progress is a bulleted list, not the "TDD Cycle Evidence" table. All the required facts are present and were cross-checked against real runs, so this is formatting only (same finding as PR1 W3).
- W4. Rule 7: no prompt for the PR2 apply or verify work is saved under `prompts/durante/` in `c8d1cb4~1..HEAD` (the last file, 18, is titled PR1 apply and verify). Add one before the PR is opened.
- W5. A request to `POST /push-actions/*` with an unparseable JSON body or a non-JSON content type is rejected by Fastify and mapped to `400 validation_error` (`server.ts:119-122`), not `401`. A missing body, `{}`, a malformed or forged token string are `401`, which is what the spec lists, and no information leaks, but "every token failure has the same body" is only strictly true for well-formed JSON bodies. Found by inspection of the error handler; no test covers it.

**SUGGESTION**:

- S1. Assert the C15 re-arm on the action path: after `actions.snooze`, check that `notifiedDueAt` is unchanged and that `isNotificationDue` is false at 11:04 and true at 11:05 for the returned record, so the scenario "claimable at 11:05 and not before" is proven in PR2 and not only through the PR1 C5 test.
- S2. Add a route test for an invalid JSON body and a wrong content type on `/push-actions/done` to pin the status chosen for W5 (either 401 or a documented 400).
- S3. `expect(mutate).not.toHaveBeenCalled()` couples to the `mutateReminder` method name; acceptable as the "HMAC before DB" proof, but a fake `NoteRepository` that throws on every method would be sturdier.
- S4. The `.engram/` chunks are included in the PR diff and inflate its count; confirm they are intended before the size decision.

### Verdict

PASS WITH WARNINGS. Zero CRITICAL issues: `npm run verify`, `npm run build -w @onti/api` and `npm run build` exit 0, all 25 PR2 scenarios have a passing covering test (the `[pg]` one re-run on a real database), and every security and error-code check in the review brief holds in code and tests. The warnings are the size exception, the pending manual smoke, TDD evidence formatting, the missing PR2 prompt, and one untested 400-versus-401 edge. PR3 stays deferred.
