```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:8d4289d0ebb93ca945d25ddb62bb029684bd6e1c4bd351913e8a460002c728ab
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 11/11
scenarios: 30/30
test_command: npm run verify
test_exit_code: 0
test_output_hash: sha256:8d4289d0ebb93ca945d25ddb62bb029684bd6e1c4bd351913e8a460002c728ab
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:24f1fcf28916672257022ee475e400e2eb5f0f82b3ae663448eba705ece6db13
```

## Verification Report: slice-6-web-push, PR3 (web: worker, manifest, control, bridge, sign-out)

**Change**: slice-6-web-push
**Scope**: PR3 only (commits f0fa1aa..e592a53, branch feat/slice-6-web-push-web, HEAD e592a53, on origin/main 9d83214). PR1 and PR2 are verified in `verify-report-pr1.md` and `verify-report-pr2.md`. The envelope totals are PR3-scoped: 11 requirements (notification-permission: States, Never prompts on load, Turn off, Denied copy, Placement, Registration and updates, Styling and copy; push-actions: Service worker handling, Open-the-app fallback; push-subscriptions: Sign-out unsubscribes this browser; reminder-actions: "+1 h" from a notification) and 30 scenarios carrying a `[PR3]` tag (16 + 10 + 3 + the PR3 half of "Second tap opens the app"). Two `[manual]` scenarios (iOS home-screen install, closed-app Done) carry no PR tag and are recorded as pending HUMAN, outside the totals.
**Mode**: Strict TDD (runner `npm run test`)

### Completeness

| Metric                                | Value                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| PR3 tasks (14.1 to 19.2, 20.1)        | 15 of 15 checked, all match code state                                                     |
| PR3 tasks incomplete                  | 2: 20.2 (375 px visual check) and 20.3 (real delivery smoke), both HUMAN, see W2           |
| Outside this scope (not verified now) | PR1 smoke 9.2, PR2 smoke 13.2, HUMAN setup H1 to H6, `apps/web/.env.example` line (see W2) |

### Build and test execution

| Command          | Exit | Result                                                                                                                                                                                                                                                         |
| ---------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify` | 0    | prettier, eslint, tsc clean; api 491 passed + 49 skipped (32 files passed, 5 skipped files are `[pg]`), web 693 passed (65 files), shared 396 passed + 3 todo (17 files). Web grew from 611 to 693 (+82 = PR3).                                                |
| `npm run build`  | 0    | web built, main JS `index-CVUmE58V.js` 619.02 kB (178.98 kB gzip, chunk-size notice pre-existing). `apps/web/dist` contains `sw.js`, `manifest.webmanifest`, `index.html`, `assets/` and `icons/` with `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`. |

Coverage: not available (config `coverage.available: false`). The working tree was clean before and after the runs (nothing modified, nothing committed). No dev server or real browser was run (see W2).

### TDD compliance

| Check                 | Result | Details                                                                                                                                                                                                           |
| --------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TDD evidence reported | warn   | Engram #1148 lists RED reason, GREEN count, triangulation and safety net per PR3 task as bullets, not a table (same as PR1 W3 and PR2 W3, see W3)                                                                 |
| All tasks have tests  | pass   | 15.x sw.test, 16.x pwa-assets and register-sw, 17.x push-client, push-api and push-control, 18.x push-bridge, 19.x sign-out-push: all exist                                                                       |
| RED confirmed         | pass   | credible reasons (file ENOENT, module not found, `unsubscribe` never called 3 of 4 failed, bridge not rendered); characterization tests are labelled as such                                                      |
| GREEN confirmed       | pass   | all 8 PR3 test files pass in this run: 13 + 8 + 7 + 11 + 3 + 24 + 12 + 4 = 82, equal to the 611 to 693 delta                                                                                                      |
| Triangulation         | pass   | maxActions 2/1/0/absent, five unusable payload shapes, four non-2xx statuses, each control state, three bad-URL shapes, 1999 ms versus 2000 ms cap                                                                |
| Safety net            | pass   | modified files (`App.tsx`, `DateColumn`, `MobileBar`, `DayPage`, `env.ts`, `main.tsx`, `messages.ts`, `index.html`, `vercel.json`, `eslint.config.js`) had the web baseline (611) and `app.test.tsx` 6/6 recorded |
| Assertion quality     | warn   | no tautologies or ghost loops (all loops run over constant non-empty tuples); one timing weakness in negative assertions (W6)                                                                                     |

Test layers: unit 42 tests in 5 files (sw.test via `node:vm`, pwa-assets static, register-sw, push-client, push-api; vitest), integration 40 tests in 3 files (push-control, push-bridge, sign-out-push; jsdom, React Testing Library, user-event). E2E: none, not available per config. Mock weight is moderate: `push-control` mocks env, push-api and supabase and still drives real components.

### Spec compliance matrix (PR3 scenarios)

| Requirement                | Scenario                            | Evidence (file:line)                                                                                                                                                          | Result    |
| -------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| States                     | Each state                          | `push-control.test.tsx:60` default, `:67` granted, `:76` denied, `:83` unsupported; container `:152` (no Notification), `:116`/`:142` (granted)                               | COMPLIANT |
| States                     | Hidden without key                  | `push-control.test.tsx:100` (renders nothing, no browser API touched), `:234` (DayPage)                                                                                       | COMPLIANT |
| Never prompts on load      | No prompt on load                   | `push-control.test.tsx:109` (spy never called); `requestPermission` appears only in `push-client.ts:52` (see S2: no App-level sign-in test)                                   | COMPLIANT |
| Never prompts on load      | Enable                              | `push-control.test.tsx:116` (order `requestPermission`, `subscribe`, POST with `jwt-1`, state on); `push-client.test.ts:60`                                                   | COMPLIANT |
| Never prompts on load      | User declines the prompt            | `push-control.test.tsx:125`; `push-client.test.ts:76`                                                                                                                         | COMPLIANT |
| Never prompts on load      | Subscribe call fails                | `push-control.test.tsx:133` (one `alert` line, button enabled); `push-client.test.ts:85` (browser subscription rolled back)                                                   | COMPLIANT |
| Turn off                   | Turn off                            | `push-control.test.tsx:142` (`unsubscribe` once, delete with endpoint, enable offered); `push-client.test.ts:94`, `:102`                                                      | COMPLIANT |
| Denied copy                | Denied copy                         | `push-control.test.tsx:76` (text equals `t.denied`, matches `/Today/`, no button); `messages.ts` denied entry names settings and Today                                        | COMPLIANT |
| Placement                  | Desktop                             | `push-control.test.tsx:195` (slot directly after the radiogroup, before Sign out), `:205` (Today-only gate), `:216` (DayPage column)                                          | COMPLIANT |
| Placement                  | Mobile                              | `push-control.test.tsx:210` (last item of the bar), `:224` (phone DayPage: one control, in the bar, not in the column)                                                        | COMPLIANT |
| Placement                  | Sign-in card                        | `push-control.test.tsx:241` (static: no `PushContainer` or `notifications` in `AuthForm.tsx` or `NotesPage.tsx`)                                                              | COMPLIANT |
| Registration and updates   | Registration                        | `register-sw.test.ts:21` (`/sw.js`, scope `/`, `updateViaCache: 'none'`, `update()` once), `:62` (called from `main.tsx` after render)                                        | COMPLIANT |
| Registration and updates   | Unsupported browser                 | `register-sw.test.ts:39` (no throw), `push-control.test.tsx:152` (shows unsupported copy)                                                                                     | COMPLIANT |
| Registration and updates   | Static assets `[static]`            | `pwa-assets.test.ts:92` (`/sw.js` no-cache), `:43`, `:56` (icons exist, real PNG sizes), `:34` (manifest), `:75` (index.html links), `:97`                                    | COMPLIANT |
| Styling and copy           | CSS scan `[static]`                 | `push-control.test.tsx:259` (`--size-target`, `--focus-ring` on focus-visible, no `--color-date`, `--core-*`, transition, animation, raw hex or px other than the 1px border) | COMPLIANT |
| Styling and copy           | Copy from messages                  | `push-control.test.tsx:252` (no `messages.notifications` string appears in `PushControl.tsx`); each state test queries by `t.*` text and names                                | COMPLIANT |
| Service worker handling    | Show                                | `sw.test.ts:95` (title, body, tag, `renotify`, data), `:109` (two actions)                                                                                                    | COMPLIANT |
| Service worker handling    | Malformed payload                   | `sw.test.ts:132` (five unusable shapes, each shows once with "Notes + Reminders", nothing throws)                                                                             | COMPLIANT |
| Service worker handling    | Action click                        | `sw.test.ts:150` (POST to `${apiUrl}/push-actions/done`, body only `{ token }`, no `Authorization`, notification closed, `onti:refetch` to every window), `:167` (snooze)     | COMPLIANT |
| Service worker handling    | Actions unsupported                 | `sw.test.ts:119` (maxActions 1 gives 1, 0 gives 0, absent gives 0), `:216` and `:224` (body tap focuses or opens `/`, no API call)                                            | COMPLIANT |
| Open-the-app fallback      | Fallback opens the app              | `sw.test.ts:174` (401, 404, 409, 500 take the fallback), `:194` (no window: `openWindow('/?action=done&note=<id>&due=<dueAt>')`); see S1                                      | COMPLIANT |
| Open-the-app fallback      | Fallback to an open window          | `sw.test.ts:174` (focus plus `onti:action` with action, noteId, dueAt, no `openWindow`), `:194` (throw path); see S1                                                          | COMPLIANT |
| Open-the-app fallback      | Same due_at runs the action         | `push-bridge.test.tsx:67` (URL empty at the first fetch, then `markNoteDone` with the JWT), `:78` (snooze `hour`)                                                             | COMPLIANT |
| Open-the-app fallback      | Changed due_at changes nothing      | `push-bridge.test.tsx:85` (due plus 1 h: no mutation, URL cleared), `:161` (stale `onti:action`); see W6                                                                      | COMPLIANT |
| Open-the-app fallback      | Done note changes nothing           | `push-bridge.test.tsx:94` (done note, unknown note: no mutation); see W6                                                                                                      | COMPLIANT |
| Open-the-app fallback      | Unknown value                       | `push-bridge.test.tsx:117` (`delete`, `soon`, `12.5`, missing params: no API call, URL cleared)                                                                               | COMPLIANT |
| Sign-out unsubscribes      | Sign-out                            | `sign-out-push.test.tsx:72` (unsubscribe with `token-1`, session still open until it settles, then `signOut`); `push-client.test.ts:112`                                      | COMPLIANT |
| Sign-out unsubscribes      | Failure does not block              | `sign-out-push.test.tsx:85` (reject still ends); `push-client.test.ts:129` (never throws, whatever fails), `:102`                                                             | COMPLIANT |
| Sign-out unsubscribes      | No subscription                     | `push-client.test.ts:120` (no call without subscription or support); `sign-out-push.test.tsx:92` (no timer left, session ends at once)                                        | COMPLIANT |
| "+1 h" from a notification | Second tap opens the app (PR3 half) | Composed: `sw.test.ts:174` (409 opens the app) plus `push-bridge.test.tsx:85` (replayed `due_at` changes nothing, C15); real run is `[manual]` 20.3                           | COMPLIANT |

**Compliance summary**: 30/30 scenarios compliant, 11/11 requirements. Scenarios `[manual]` (iOS install, closed-app Done) and tasks 20.2 and 20.3 are pending HUMAN and are not counted.

### Correctness (static evidence)

| Check from the brief                                                    | Status | Notes                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sw.js` always shows a notification, fallback "Notes + Reminders"       | pass   | `sw.js:6`, `:38`: an unusable payload shows `APP_NAME`; the `push` handler is wrapped in `event.waitUntil`                                                                                                                              |
| Sends only the token to the payload's `apiUrl`                          | pass   | `sw.js:81` posts `{ token }` to `${apiUrl}/push-actions/${action}` with only a `Content-Type` header; test asserts no `Authorization`                                                                                                   |
| On any failure opens `/?action&note&due` or messages an open window     | pass   | `sw.js:58-92`: non-2xx, throw and missing token or `apiUrl` call `fallback`; a window is focused and gets `onti:action`, otherwise `openWindow(url)`                                                                                    |
| Action buttons feature-detected                                         | pass   | `sw.js:28-32`: `typeof Notification` check, `maxActions ?? 0`, `slice(0, max)`                                                                                                                                                          |
| Guarded fallback runs through the JWT path only when Today matches      | pass   | `PushBridge.tsx:88-110`: fresh `fetchQuery` (staleTime 0), note found in carried or rail, `doneAt === null`, `dueAt` equal; `markNoteDone`/`snoozeNote` (JWT) only then; 401 ends the session; params cleared first (`:27-39`)          |
| Permission control never prompts on load                                | pass   | `requestPermission` is called only in `push-client.ts:52` via `enablePush`, from the click handler, as the first await (inside the gesture); the token is fetched after it                                                              |
| States default/granted/denied/unsupported, denied copy cites Today (C7) | pass   | `push-client.ts:27-32`, `PushControl.tsx:21`; `messages.notifications.denied` and `unsupported` both say reminders still appear in Today                                                                                                |
| Hidden when `VITE_VAPID_PUBLIC_KEY` absent                              | pass   | `PushContainer.tsx:83`; `env.ts` treats `''` as absent; `register-sw.ts:26` also skips registration                                                                                                                                     |
| Placed under the theme control (date column) and in the mobile bar      | pass   | `DateColumn.tsx` slot right after `ThemeControl`, same `showTheme` gate; `DayPage.tsx` builds one instance for column or bar; `MobileBar.tsx` slot is the last item                                                                     |
| Mobile bar wraps at 375 px                                              | manual | `MobileBar.module.css` `flex-wrap: wrap` is pinned by a static test (`push-control.test.tsx:266`); the visual result at 375 px is `[manual]` 20.2                                                                                       |
| Copy only in `messages.ts`, `notifications` appended last               | pass   | `messages.ts` diff: `notifications` key added last; no literal strings in `PushControl.tsx` (test `:252`)                                                                                                                               |
| Tokens only, 44 px, ink focus ring, no vermilion                        | pass   | `PushControl.module.css`: `--size-target` min width and height, `outline: var(--focus-ring)` (token = ink 2 px), no `--color-date`, no `--core-*`, no animation; one `1px solid var(--color-ink)` border, same pattern as other modules |
| Manifest raw hex has a parity test against light tokens                 | pass   | `manifest.webmanifest` `#fffefa`; `pwa-assets.test.ts:63` resolves `--color-page` from `tokens.css` and compares both colors; `index.html` meta theme-color compared at `:80` (accepted rule 8 exception)                               |
| Sign-out unsubscribes, waits at most 2 s only when subscribed           | pass   | `App.tsx` `settleWithin(unsubscribeThisBrowser(token), 2000).then(clearSession)`; `unsubscribeThisBrowser` resolves `false` at once when unsupported or unsubscribed; timer cleared on settle; comment records the exception            |
| Expired session clears at once                                          | pass   | `onSessionExpired` calls `clearSession` directly (no push call, no wait); `app.test.tsx` 6/6 unchanged                                                                                                                                  |
| `vercel.json` no-cache for `/sw.js`; `registration.update()` on load    | pass   | `vercel.json` `headers` entry; rewrite unchanged; `register-sw.ts:32`; `main.tsx` calls `void registerServiceWorker()` after render                                                                                                     |
| Conventional commits, no attribution                                    | pass   | six `feat(web)`/`docs(sdd)` commits, no `Co-Authored-By` or AI lines in `9d83214..HEAD`                                                                                                                                                 |

### Coherence (design)

| Decision                                 | Followed? | Notes                                                                                                                                                                                         |
| ---------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 18 Service worker (plain `sw.js`)        | Yes       | classic script, no imports, `skipWaiting`, `clients.claim`; design text also lists `icon: '/icons/icon-192.png'`, which `sw.js` omits (W5)                                                    |
| 19 Fallback and the guard                | Yes       | matches ADR-004 decision 5 and the guard                                                                                                                                                      |
| 20 App-side bridge                       | Yes       | `PushBridge` rendered by `App` only while signed in (after the `AuthContainer` branch); URL cleared first with `history.replaceState`; no router                                              |
| 21 Permission control                    | Yes       | container-presentational; one instance in `DayPage`; token read at click time; phone placement differs in detail from the design text (W5)                                                    |
| 22 Registration                          | Yes       | scope `/`, `updateViaCache: 'none'`, `update()`, gated on key and `serviceWorker`                                                                                                             |
| 23 Re-sync on load                       | Yes       | `PushContainer` posts once per `user:endpoint` per page load, retried after a failure                                                                                                         |
| 24 Sign-out                              | Yes       | `Promise.race` with a 2 s timer, errors swallowed; deviation 4 (expired session skips the call) is consistent with the design note                                                            |
| Manifest, icons, headers                 | Partial   | manifest, three PNGs, `index.html` links and the `/sw.js` header exist; design also lists a `/manifest.webmanifest` `Content-Type` header and `background_color` equal to `--color-desk` (W5) |
| ADR-004 (guarded fallback), CLAUDE.md 18 | Yes       | the SW sends only the signed token, never a JWT; the JWT path is used only in the app; rule 18 exception stays limited to `/push-actions/*` (PR2)                                             |

### Issues found

**CRITICAL**: None.

**WARNING**:

- W1. Size: PR3 adds about 1,900 lines and deletes 46 (excluding PNGs and the `.engram` chunk; about 1,232 are tests) against the ~1,080 forecast in `tasks.md` and the 400 default budget. The forecast was exceeded by about 75%. The `size:exception` label was chosen for PR3 but on the lower number; the human should confirm it for the real size (delivery strategy `exception-ok`, no chaining).
- W2. Pending HUMAN, not verified by any run: task 20.2 (four bar targets at 375 px without horizontal scroll, otherwise move phones to the date column only), task 20.3 (real delivery within 30 s, Done and "+1 h" from the notification, second tap, denied copy, sign-out removes the row, iOS best effort), and HUMAN setup H5 (`VITE_VAPID_PUBLIC_KEY` on Vercel). No dev server or real browser ran, so service worker registration, real `PushManager` behavior and the wrapped phone bar are proven only in jsdom and `node:vm`. Follow-up for the human: `apps/web/.env.example` could not be updated (deny rule); add `VITE_VAPID_PUBLIC_KEY=` by hand.
- W3. Strict TDD evidence in apply-progress is a bulleted list, not the "TDD Cycle Evidence" table. All required facts are present and were cross-checked against real runs, so this is formatting only (same as PR1 W3 and PR2 W3).
- W4. Rule 7: no prompt for the PR3 apply or verify work is saved under `prompts/durante/` in `9d83214..HEAD` (the latest file, 19, is slices 4 and 6 PR2). Add one before the PR is opened.
- W5. Design deviations not listed in apply-progress: (a) `sw.js` shows the notification without the `icon` the design specifies (`/icons/icon-192.png`); (b) `vercel.json` has the `/sw.js` header the spec requires but not the `/manifest.webmanifest` `Content-Type` header the design lists (Vercel normally infers the type; the test checks one header, not "the two headers" the design table names); (c) the phone control is the last item of the bar, while the design says between Tags and Capture, and long text sits in the bar's row instead of "above the bar" (deviation 3 covers the wrap only); (d) the failure line is `role="alert"`, the design says `role="status"`; (e) `background_color` equals `--color-page`, the design says `--color-desk` (the spec only says light-mode tokens and the parity test pins page for both); (f) SG14 still defines three bar buttons and the fourth slot has no style-guide note (design "Accepted 5" depends on the 20.2 check). None breaks a spec scenario.
- W6. Weak negative assertions in `push-bridge.test.tsx`: lines 89, 113 and 165 assert "no mutation" after a single `await Promise.resolve()` once `fetchToday` has been called. The guarded mutation would run a few microtasks later (after `fetchQuery` resolves), so these can pass vacuously. Apply's mutation check (removing the `due_at` equality) failed 2 tests, but the done-note and unknown-note guards are not shown to bite. Prefer awaiting the query to settle (for example `waitFor` on a flushed promise or `vi.waitFor` with a short window) before asserting.

**SUGGESTION**:

- S1. Fallback scenarios are covered by sibling tests instead of their literal GIVEN: add one `sw.test.ts` case for "409 and no window" and one for "fetch throws and a window is open" so each branch pairs with both failure kinds.
- S2. Add an App-level test for "mount and sign-in never call `Notification.requestPermission`"; today the guarantee rests on the container test plus the fact that only `enablePush` calls it.
- S3. `PushContainer.disable` reuses the `failed` state, so a failed turn-off (for example "No session") would show "Could not turn on notifications." Add a separate message or a turn-off failure line.
- S4. `PushContainer.enable` awaits `readStatus()` inside its `catch`; if that rejects, the click handler (`void enable()`) leaves an unhandled rejection. Wrap it or fall back to `'default'`.
- S5. The `.engram` chunk and manifest (`352b8c3a.jsonl.gz`, `manifest.json`) ride in the c12 commit `f0fa1aa`. This is expected under CLAUDE.md rule 21 (the pre-commit hook exports them), so it is not an issue; they only add to the PR's file count, and PR2 S4 raised the same point.
- S6. Once 20.2 is done, record the result in SG14 (or add an SG note as slice 4 did with SG20) so the fourth bar slot is documented.

### Verdict

PASS WITH WARNINGS. Zero CRITICAL issues: `npm run verify` and `npm run build` exit 0 (web 693 passed, dist carries `sw.js`, `manifest.webmanifest` and the three icons), all 30 PR3-tagged scenarios have a passing covering test, and every behavior in the review brief holds in code and tests. The warnings are the size against the forecast, the pending HUMAN checks (375 px layout, real delivery, `.env.example`, Vercel key), TDD evidence formatting, the missing PR3 prompt, minor undeclared design deviations, and a timing weakness in some negative bridge assertions. PR1, PR2 and PR3 are all verified; archive can follow the HUMAN smoke tasks (20.2, 20.3) and merge.
