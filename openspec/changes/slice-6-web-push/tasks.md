# Tasks: Slice 6 — Web Push notifications

## Review Workload Forecast

| Field                   | Value                                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Estimated changed lines | ~3,115 incl. tests and docs: PR1 ~1,370 (c1-c8), PR2 ~665 (c9-c11), PR3 ~1,080 (c12-c16); lockfile and PNGs excluded                     |
| 400-line budget risk    | High (800 review budget also exceeded by PR1 and PR3)                                                                                    |
| Chained PRs recommended | No (human chose three larger PRs, 2026-10-08, Engram #1141)                                                                              |
| Suggested split         | PR1 backend core + runtime + token codec → PR2 subscription and action endpoints → PR3 web; PR1 and PR3 `size:exception`, PR2 within 800 |
| Delivery strategy       | exception-ok                                                                                                                             |
| Chain strategy          | size-exception                                                                                                                           |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

Each PR targets `main` on its own (no chaining). PR1 and PR3 are labelled `size:exception`; PR2 stays within the 800-line budget. Merge order: slice 4 PR1 first; slice 6 PR1, then PR2; PR3 only after slice 4 is merged (rebase gate before c12). Re-forecast c3, c7 and c14 at apply time; if one passes ~450 lines, trim, do not split the PR.

Global checks for every commit:

- RED first: write the failing test and record the failure, then GREEN, then refactor (strict TDD).
- `npx prettier --write` on touched files, then `npm run verify` through the pre-commit hook (rule 22); never `--no-verify`.
- Conventional message, no `Co-Authored-By` or AI attribution (rule 5). Stage files by explicit path only. Never push without the human's approval (rule 6).
- Tests and docs in the same commit. Migration and `docs/db/schema.md` together (rule 19). CONTRACT verification status changes with the tests that prove it (rule 23).
- No `new Date()`/`Date.now()` outside the clock adapter (rule 16); `packages/shared` stays IO-free (rule 17). Web: tokens only, copy in `messages.ts`, `--size-target`, no internal IDs (rules 8-13).
- Logs never contain endpoints, tokens, keys or payloads. Save prompts in `prompts/durante/` (rule 7).

### Suggested Work Units

| Unit | Goal                                          | PR  | Focused test command                                           | Runtime harness                                         | Rollback boundary                                          |
| ---- | --------------------------------------------- | --- | -------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| c1   | Shared push schemas                           | 1   | `npm run test -w @onti/shared`                                 | N/A (pure schemas)                                      | `packages/shared/src/push.ts`, export line, test           |
| c2   | Plain-text body and payload builder           | 1   | `npm run test -w @onti/api`                                    | N/A (pure functions)                                    | `domain/plain-text.ts`, `push-ports.ts`, `push-payload.ts` |
| c3   | Dispatch use case (C2, C5, C7)                | 1   | `npm run test -w @onti/api`                                    | N/A (fakes; real path in c7/c8)                         | `dispatch-due.ts`, `push-fakes.ts`, CONTRACT rows          |
| c4   | HMAC action token codec                       | 1   | `npm run test -w @onti/api`                                    | N/A (pure crypto, fixed instants)                       | `hmac-action-tokens.ts` and test                           |
| c5   | `web-push` sender and dependency              | 1   | `npm run test -w @onti/api`                                    | `npm run build -w @onti/api` + `node` import check      | sender, `package.json`, lockfile                           |
| c6   | Push config and scheduler                     | 1   | `npm run test -w @onti/api`                                    | N/A (fake timer)                                        | `push-config.ts`, `scheduler.ts`, `config.ts` line         |
| c7   | Backfill migration, claim, subscription reads | 1   | `ONTI_TEST_DATABASE_URL=<throwaway> npm run test -w @onti/api` | Throwaway local Postgres 16 + `standins.sql`            | migration, `schema.md`, two Postgres adapters, pg test     |
| c8   | Wire the scheduler                            | 1   | `npm run test -w @onti/api`                                    | `npm run dev -w @onti/api` with and without push config | `main.ts` hunk                                             |
| c9   | Push action use cases (C3, C15)               | 2   | `npm run test -w @onti/api`                                    | N/A (fakes)                                             | `push-actions.ts` and test                                 |
| c10  | Subscribe and unsubscribe                     | 2   | `npm run test -w @onti/api` (+ pg run)                         | Throwaway Postgres for the owner-role swap              | `push-subscribe.ts`, adapter methods, fakes, pg test       |
| c11  | Routes, C15 proven                            | 2   | `npm run test -w @onti/api`                                    | `curl` against local API with push config               | `push-routes.ts`, `server.ts`/`main.ts` hunks, CONTRACT    |
| c12  | Service worker                                | 3   | `npm run test -w @onti/web`                                    | N/A in CI; manual in 20.3                               | `public/sw.js`, eslint globals, test                       |
| c13  | Manifest, icons, registration                 | 3   | `npm run test -w @onti/web`                                    | `npm run dev -w @onti/web`: worker registered at `/`    | `public/*` assets, `register-sw.ts`, `vercel.json` hunk    |
| c14  | Push client and permission control            | 3   | `npm run test -w @onti/web`                                    | Dev server at 1280x720 and 375x667                      | `features/push/{client,api,Control,Container}`, slots      |
| c15  | Guarded fallback bridge                       | 3   | `npm run test -w @onti/web`                                    | Dev server: `/?action=done&note=…&due=…`                | `PushBridge.tsx`, one `App.tsx` line                       |
| c16  | Sign-out unsubscribes this browser            | 3   | `npm run test -w @onti/web`                                    | Dev server: sign out while subscribed                   | `App.tsx` `signOut` hunk and comment                       |

## Done before apply (docs first, rule 14)

- [x] 0.1 `docs: amend ADR-001 for push subscription reassignment` (d5f4276).
- [x] 0.2 `docs: guard the ADR-004 open-the-app fallback` (9aa34e4): fallback guard and `401`/`404`/`409`.

## PR1 — backend core, runtime and token codec (~1,370 lines, `size:exception`)

### Commit c1: `feat(shared): push payload and action claims schemas` (~120)

- [x] 1.1 RED: `packages/shared/test/push.test.ts`: valid payload and claims parse; missing token, bad uuid, empty `actions`, unknown action rejected.
- [x] 1.2 GREEN: `packages/shared/src/push.ts` (`PUSH_ACTIONS`, `PUSH_COPY`, `pushPayloadSchema`, `actionClaimsSchema`); export at the end of `index.ts`.

### Commit c2: `feat(api): build the push payload from a claimed reminder` (~230)

- [x] 2.1 RED: `apps/api/test/plain-text.test.ts`: bold, italic, code, links, images, headings, lists, quotes, fences; blank lines; 3 lines give 2; 120 code points with `…`.
- [x] 2.2 GREEN: `apps/api/src/domain/plain-text.ts` (`stripMarkdown`, `firstLines`); note to swap for slice 4's helper if merged.
- [x] 2.3 RED: `apps/api/test/push-payload.test.ts`: C2 title `17:00 · …` and body with "Client A"; New York and Mexico City titles; invalid zone → UTC; `tag` = note id; token and `apiUrl` embedded; no id in title or body (rule 13).
- [x] 2.4 GREEN: `application/push-ports.ts` (decision 1) and `application/push-payload.ts`.

### Commit c3: `feat(api): dispatch due reminders once per due_at` (~300)

- [x] 3.1 RED: `apps/api/test/dispatch-due.test.ts`: C2 one push, second tick claims 0; C5 nothing at 11:04, one at 11:05 (re-armed); C7 no subscription marks and sends nothing; past capture sent next tick; done and future skipped; no retry; 3 devices 3 sends; 410 deletes, others still sent; 500 counts; drop at 5; success resets; one reminder's error does not stop others; batch cap 10.
- [x] 3.2 GREEN: `application/dispatch-due.ts` (`makeDispatchDue`, `CLAIM_BATCH`, `MAX_BATCHES_PER_TICK`, `MAX_PUSH_FAILURES`); `apps/api/test/push-fakes.ts` (claimer built on `isNotificationDue`, `MutableClock`, fakes).
- [x] 3.3 `docs/CONTRACT.md` Verification status: add a "Slice 6" table with C2, C5 (re-arm) and C7 rows citing `dispatch-due.test.ts`.

### Commit c4: `feat(api): sign and verify notification action tokens` (~140)

- [x] 4.1 RED: `apps/api/test/hmac-action-tokens.test.ts`: round trip; tampered payload or signature; wrong secret; 1 or 3 segments; non-JSON; bad claims; valid at `exp - 1 s`, invalid at `exp`; spy proves `timingSafeEqual`.
- [x] 4.2 GREEN: `infrastructure/push/hmac-action-tokens.ts` (decision 12; `verify(token, now)`).

### Commit c5: `feat(api): send pushes with web-push` (~130 + lockfile)

- [x] 5.1 Add `web-push` to `apps/api` `dependencies` and `@types/web-push` to `devDependencies`.
- [x] 5.2 RED: `apps/api/test/web-push-sender.test.ts`: `sent`; 404 and 410 `gone`; 500, 429, no-status error `failed`; options carry VAPID, `TTL` 3600, `urgency`, `timeout`.
- [x] 5.3 RED: `apps/api/test/web-push-interop.test.ts`: default import exposes `sendNotification` and `generateVAPIDKeys`; static check that `web-push` stays in `dependencies` (tsup externalizes only those).
- [x] 5.4 GREEN: `infrastructure/push/web-push-sender.ts` (decision 8).
- [x] 5.5 Build check: `npm run build -w @onti/api`; `dist/main.js` keeps `from "web-push"` external; the `node --input-type=module` import from `apps/api` prints `function`. Record in the PR.

### Commit c6: `feat(api): push config and interval scheduler` (~200)

- [x] 6.1 RED: `apps/api/test/push-config.test.ts`: none → `null`; all five → config; each missing name listed; `''` unset; short secret and bad subject named; error text never contains a value.
- [x] 6.2 GREEN: `apps/api/src/push-config.ts`; `config.ts` gains `push`.
- [x] 6.3 RED: `apps/api/test/scheduler.test.ts`: `start` ticks at once and arms once; no overlap in flight; a rejecting run is logged and the next fire runs; `stop` cancels and awaits.
- [x] 6.4 GREEN: `infrastructure/push/scheduler.ts` (`createScheduler`, `systemTimer` with `unref`).

### Commit c7: `feat(db): backfill notified_due_at and claim due reminders` (~200)

- [x] 7.1 RED `[pg]`: `apps/api/test/postgres/push.pg.test.ts`: two overlapping claims over 20 due notes are disjoint and complete; SQL predicate equals `isNotificationDue` over a matrix; backfill marks only overdue open rows, leaves `due_at`, second run no-op; failure counting and drop.
- [x] 7.2 GREEN: `supabase/migrations/20261008180000_backfill_notified_due_at.sql` (decision 25) and `docs/db/schema.md` (backfill, claim, owner-role statements incl. the ADR-001 amendment, failure policy) in this commit (rule 19).
- [x] 7.3 GREEN: `infrastructure/db/postgres-reminder-claimer.ts`, `postgres-push-subscriptions.ts` (scheduler side), `database.ts` table type.
- [x] 7.4 Run once with `ONTI_TEST_DATABASE_URL` (paste output for the PR) and once unset (skipped). Append the `[pg]` evidence to the C2 row.

### Commit c8: `feat(api): start the push scheduler when configured` (~50)

- [x] 8.1 RED: test that `config.push === null` builds no sender, scheduler or `push` dep.
- [x] 8.2 GREEN: `main.ts` wiring; scheduler starts after `listen`; shutdown stops scheduler, then app, then DB.

### PR1 close

- [x] 9.1 Final `npm run verify` and `npm run build`; PR body: forecast, `size:exception`, build check, pg output.
- [ ] 9.2 Manual smoke (local): API with push config logs ticks; without it, no scheduler. Real delivery is checked after PR2 and PR3.

## PR2 — subscription and action endpoints (~665 lines, within budget)

### Commit c9: `feat(api): done and +1 h from a notification token` (~200)

- [x] 10.1 RED: `apps/api/test/push-actions.test.ts`: C3 done stamps the clock; done twice keeps `done_at`; C15 10:05 → 11:05, count 2, original Tue 18:00; replay `due_at_changed`; rescheduled `due_at_changed`; snooze on done `not_open`; unknown and another user's note `NotFoundError`; DST D3; token route equals JWT route.
- [x] 10.2 GREEN: `application/push-actions.ts` (decisions 13, 14; check inside the row lock).

### Commit c10: `feat(api): subscribe and unsubscribe a browser` (~230)

- [x] 11.1 RED: `apps/api/test/push-subscriptions.test.ts`: new row; repeat is one row; Ana's endpoint reassigned to Jorge, Ana has none, response equals first-time; unsubscribe own; another user's is a no-op success; pruned stays gone.
- [x] 11.2 RED `[pg]`: `apps/api/test/postgres/push-subscriptions.pg.test.ts`: the one owner-role upsert swaps; Ana cannot read or delete Jorge's row as `authenticated`.
- [x] 11.3 GREEN: `push-ports.ts` `SubscriptionRepository`; `application/push-subscribe.ts`; adapter `subscribe` (single owner statement, verified `sub`) and `unsubscribe` (`asUser`); request schemas in `packages/shared/src/push.ts`; fakes.

### Commit c11: `feat(api): push subscription and action routes` (~235)

- [x] 12.1 RED: `apps/api/test/push-routes.test.ts`: subscribe 400 (no `keys.auth`, http, IP host), 401 no token; actions 401 same body for missing, malformed, forged, expired; 404 same body for disallowed action, unknown note, another user's note (never 403); 409 only `due_at_changed` and `not_open`; `push` absent gives 404; CORS preflight; action token as bearer on `/notes/:id/done` is 401.
- [x] 12.2 GREEN: `infrastructure/http/push-routes.ts`; `server.ts` optional `push?`; `main.ts` passes it.
- [x] 12.3 `docs/CONTRACT.md`: move C15 from "Still todo" to the Slice 6 table; add C3 (from the notification) row, both citing c9 and c11 tests (rule 23).

### PR2 close

- [x] 13.1 Final `npm run verify` (api 418 passed + 37 skipped, web 459, shared 290 + 3 todo; api 455 passed with a throwaway database) and `npm run build` green; PR body with forecast. Actual size is about 1,140 added lines against the 800 budget, so PR2 needs `size:exception` or a split (human decision).
- [ ] 13.2 Manual smoke: `curl` subscribe twice with two users (one row, new owner); action with a forged token 401.

## PR3 — web: worker, manifest, control, bridge, sign-out (~1,080 lines, `size:exception`)

### Gate: rebase after slice 4 merges

- [x] 14.1 Wait until slice 4 is merged (and PR2). Branch or rebase onto `main`; resolve `DayPage`, `DateColumn`, `MobileBar`, `App.tsx`, `messages.ts`; `npm run verify`.

### Commit c12: `feat(web): service worker for push and actions` (~230)

- [x] 15.1 RED: `apps/web/test/sw.test.ts` (`node:vm`, stubbed `self`): show with title, body, tag, `renotify`; invalid payload still shows; no actions when `maxActions` 0; Done success posts `onti:refetch`; non-2xx, throw, missing token → fallback: focus + `onti:action` with `noteId` and `dueAt`, else `openWindow('/?action=…&note=…&due=…')`; body tap opens `/`.
- [x] 15.2 GREEN: `apps/web/public/sw.js` (decisions 18, 19); `eslint.config.js` worker globals.

### Commit c13: `feat(web): manifest, icons and worker registration` (~130 + PNGs)

- [x] 16.1 RED: `apps/web/test/pwa-assets.test.ts`: manifest fields; PNG signatures and sizes; `theme_color`/`background_color` equal light-mode tokens (parity, narrow rule 8 exception); `vercel.json` headers and unchanged rewrite; `index.html` links.
- [x] 16.2 RED: `apps/web/test/register-sw.test.ts`: skipped without `serviceWorker` or key; scope `/`, `updateViaCache: 'none'`, `update()`; `env` treats `''` as absent.
- [x] 16.3 GREEN: `manifest.webmanifest`, icons, `index.html`, `vercel.json`, `lib/env.ts`, `features/push/register-sw.ts`, `main.tsx`.

### Commit c14: `feat(web): opt-in notification control` (~420)

- [x] 17.1 RED: `apps/web/test/push-client.test.ts`: state from permission and subscription; `enable` order; POST failure rolls back; `unsubscribeThisBrowser` never throws.
- [x] 17.2 RED: `apps/web/test/push-control.test.tsx`: no `requestPermission` on mount; each state's copy from `messages`; hidden without key; resync once; CSS uses `--size-target`, `--focus-ring`, no `--color-date`, no `--core-*`; desktop column Today only, phone bar slot, absent on All notes.
- [x] 17.3 GREEN: `features/push/{push-client,push-api}.ts`, `PushControl.tsx` + CSS, `PushContainer.tsx`; `messages.notifications` appended last; slots in `DayPage`, `DateColumn`, `MobileBar`.

### Commit c15: `feat(web): guarded open-the-app fallback` (~180)

- [x] 18.1 RED: `apps/web/test/push-bridge.test.tsx`: URL cleared first; same `due_at` and open → JWT mutation; changed `due_at`, done note, unknown action, bad `due` → nothing, Today shown; `onti:action` runs the same guard; `onti:refetch` invalidates.
- [x] 18.2 GREEN: `features/push/PushBridge.tsx`; rendered by `App` while signed in.

### Commit c16: `feat(web): unsubscribe this browser on sign-out` (~120)

- [x] 19.1 RED: `apps/web/test/sign-out-push.test.tsx`: unsubscribe and delete with the captured token, then session ends; reject still ends; no subscription → no call, no wait; 2 s cap (fake timers).
- [x] 19.2 GREEN: `App.tsx` `signOut`; note the bounded-wait exception in its comment.

### PR3 close

- [x] 20.1 Final `npm run verify` (api 491 passed + 49 skipped, web 693, shared 396 + 3 todo) and `npm run build` green; main JS 619.02 kB (178.98 kB gzip); PR body with `size:exception`.
- [ ] 20.2 Manual: four bar targets at 375 px without horizontal scroll; if not, move phones to the date column only.
- [ ] 20.3 Manual smoke after deploy (not CI): delivery within 30 s with the app closed; Done and "+1 h" from the notification; second tap opens Today and changes nothing; denied copy; sign-out removes the row; iOS installed PWA best effort.

## HUMAN-only setup (the agent never does these)

- [ ] H1 HUMAN: generate VAPID keys (`npx web-push generate-vapid-keys`).
- [ ] H2 HUMAN: apply `20261008180000_backfill_notified_due_at.sql` to Supabase BEFORE the Railway deploy that sets the VAPID config.
- [ ] H3 HUMAN: Railway: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_ACTION_SECRET` (>= 32 chars), `API_PUBLIC_URL`; `CORS_ORIGINS` includes the Vercel origin.
- [ ] H4 HUMAN: Railway runs a single, non-sleeping instance.
- [ ] H5 HUMAN: Vercel `VITE_VAPID_PUBLIC_KEY`, then redeploy before PR3 smoke.
- [ ] H6 HUMAN: approve each push and merge (rule 6).
