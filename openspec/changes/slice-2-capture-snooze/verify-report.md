```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:81b05dfb7e7cd225448b304f79bc6f91df70df527718a17bb50e20b1aa810999
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 17/17
scenarios: 46/46
test_command: npm run verify
test_exit_code: 0
test_output_hash: sha256:81b05dfb7e7cd225448b304f79bc6f91df70df527718a17bb50e20b1aa810999
build_command: npm run build -w @onti/web
build_exit_code: 0
build_output_hash: sha256:f2aa72f0271c0882404df8acc9d9b56eac0292130f891b84eaa2e3e5dd4fc245
```

## Verification Report

**Change**: slice-2-capture-snooze
**Version**: N/A
**Mode**: Strict TDD
**Branch / HEAD**: feat/slice-2-capture-snooze @ 7974dde (base main bd8b5d4, 13 commits)

### Completeness

| Metric           | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| Tasks total      | 49 (incl. P.1, P.2)                                          |
| Tasks complete   | 46                                                           |
| Tasks incomplete | 3: 7.5 (manual browser smoke), P.1, P.2 (PR; need the human) |

7.5, P.1 and P.2 are human-gated and cannot be done by an executor. Rule "unchecked task is CRITICAL" is applied as a WARNING here by agreement with the orchestrator (the known state). They MUST be closed before sdd-archive.

### Build & Tests Execution

**Verify** (`npm run verify` = format:check, eslint, tsc, tests): exit 0.

```text
@onti/api     Test Files 9 passed (9)    Tests 136 passed
@onti/web     Test Files 30 passed (30)  Tests 238 passed
@onti/shared  Test Files 7 passed (7)    Tests 129 passed | 3 todo
```

**Build** (`npm run build -w @onti/web`): exit 0. Main JS `index-CUUMBrEQ.js` 591.44 kB (gzip 170.08), CSS 15.88 kB, lazy `CommandBar` chunk 2.23 kB JS + 1.05 kB CSS. Baseline 569 kB, so +22.4 kB (+3.9 percent). Vite emits the usual ">500 kB" warning (already present at baseline).

**Coverage**: not available (no coverage tool configured). Skipped, not a failure.

### TDD Compliance

| Check                   | Result | Details                                                                                                                              |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| TDD evidence reported   | warn   | apply-progress (#1082) gives RED-to-GREEN counts per commit in prose; there is no per-task "TDD Cycle Evidence" table                |
| All tasks have tests    | ok     | Every code task maps to a test file that exists (checked by name in `git diff --stat`)                                               |
| RED confirmed           | warn   | RED counts recorded for 1c, 2, 3, 4, 5, 6, 7. Exceptions admitted by apply: hook capture tests written after impl (characterization) |
| GREEN confirmed         | ok     | All 503 tests pass on my own run                                                                                                     |
| Triangulation           | ok     | `it.each` and multi-case suites for DST, conflicts, key guards, invalid zones                                                        |
| Safety net for modified | n/a    | Not itemized in apply-progress; full suites were green before each commit (hook `npm run verify`)                                    |

### Test Layer Distribution

| Layer       | Tests                                          | Files                                     | Tools                               |
| ----------- | ---------------------------------------------- | ----------------------------------------- | ----------------------------------- |
| Unit        | 129 + part of 136/238                          | shared 7, api use cases, web pure modules | vitest                              |
| Integration | api `inject` routes + web RTL/user-event flows | server.test, 10+ web .tsx                 | vitest, Testing Library, user-event |
| E2E         | 0                                              | 0                                         | none installed (7.5 manual)         |
| Total       | 503 (+3 todo)                                  | 46                                        | vitest                              |

### Spec Compliance Matrix

Requirements: 17 (profile-timezone 3, quick-capture 7, reminder-actions 5, today-page 2). Scenarios: 46.

| Req (spec)                | Scenario              | Test / evidence                                                                                                                                                                  | Result               |
| ------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| tz: First-login sync      | Fresh account         | `web/test/today-container.test.tsx` "sends the browser zone once when the page is on UTC, then refetches"                                                                        | COMPLIANT            |
|                           | Already set           | same file "does nothing when the stored zone is already set"                                                                                                                     | COMPLIANT            |
|                           | Sync fails            | "stays silent when the sync fails ... does not retry in the same mount"; 401 case ends session                                                                                   | COMPLIANT            |
| tz: Zone endpoint         | Set once              | `api/test/set-timezone.test.ts` first test; `server.test.ts` PATCH /me; manual 1c.8                                                                                              | COMPLIANT            |
|                           | Never overwritten     | set-timezone "no-op ... not on UTC", "a repeat call"; manual 1c.8 second call no-op                                                                                              | COMPLIANT            |
|                           | Invalid name          | set-timezone `it.each(['Mars/Olympus','','   '])`; server.test PATCH /me 400 cases                                                                                               | COMPLIANT            |
|                           | Unauthenticated       | server.test PATCH /me 401 table                                                                                                                                                  | COMPLIANT            |
| tz: DST of stored zone    | Window after sync     | `api/test/today.test.ts` D1/D2 windows in the profile zone                                                                                                                       | COMPLIANT            |
| capture: Command bar      | Preview (C1)          | `command-bar.test.tsx` "opens focused and shows the live italic preview ... (C1)"; `capture-preview.test.ts`                                                                     | COMPLIANT            |
|                           | Cancel                | command-bar "esc closes without sending"                                                                                                                                         | COMPLIANT            |
|                           | Keys while typing     | `keyboard.test.tsx` "while typing in field/area/editable", "layer disabled (bar or sheet open)"; capture-flow "page keys sleep"                                                  | COMPLIANT            |
| capture: Submit rules     | Create with time (C1) | capture-flow "inserts a pending row ... swaps"; `capture-note.test.ts` C1 "3 items, 12 other notes"; today-patch parity                                                          | COMPLIANT            |
|                           | Past explicit time    | `rules.test.ts` "accepts today HH:MM even when already past"; composed with slice-1 late label tests (`item-row`, `format`); no single test saves it and renders "late 1h" (W5a) | COMPLIANT (composed) |
|                           | Relative minutes      | `rules.test.ts` "accepts +Nm, truncated to the minute"                                                                                                                           | COMPLIANT            |
|                           | Bare time rolls       | `rules.test.ts` "a time already passed means tomorrow"                                                                                                                           | COMPLIANT            |
|                           | Empty title           | command-bar "empty title stays open with a one-line hint"; 201-char case                                                                                                         | COMPLIANT            |
| capture: without a time   | Plain note            | capture-flow "plain note: no row, one more in other notes"; capture-note "no reminder at all"                                                                                    | COMPLIANT            |
| capture: POST /notes      | Tag reuse             | manual 3.5 (existing tag reused, stored name kept, run2.log); upsert SQL not unit-testable with fakes                                                                            | COMPLIANT (manual)   |
|                           | Atomicity             | manual 3.5 proves rollback when the NOTE insert fails; the spec case (link insert fails) is not exercised (W5b)                                                                  | COMPLIANT (manual)   |
|                           | Invalid               | `notes.test.ts` title 200/201; server.test POST /notes 400                                                                                                                       | COMPLIANT            |
| capture: DST              | DST gap               | `shared/test/dst.test.ts` 02:30 gap, today/tomorrow forms -> 07:00Z                                                                                                              | COMPLIANT            |
|                           | Fall-back overlap     | dst.test 01:30 -> 05:30Z, Havana midnight overlap, capture today 01:30                                                                                                           | COMPLIANT            |
| capture: Mobile capture   | Preset (D4)           | `capture-presets.test.ts`, command-bar preset tests, dst.test D4 spring/fall                                                                                                     | COMPLIANT            |
| capture: Capture failure  | Server error          | capture-flow "failed capture removes the row and reopens the bar with the text and one line"                                                                                     | COMPLIANT            |
| actions: Action API       | Snooze +1 h (C5)      | `reminder-actions.test.ts` C5; server.test snooze (C5); manual 2.6                                                                                                               | COMPLIANT            |
|                           | Tomorrow 9:00 (C6)    | reminder-actions C6; server.test C6                                                                                                                                              | COMPLIANT            |
|                           | DST (D3, D4)          | reminder-actions D3, D4                                                                                                                                                          | COMPLIANT            |
|                           | Done (C3)             | reminder-actions C3; server.test done                                                                                                                                            | COMPLIANT            |
|                           | Conflicts and no-ops  | reminder-actions conflict/no-op cases; server.test 409 reasons; manual 2.6                                                                                                       | COMPLIANT            |
|                           | Isolation (C11)       | reminder-actions `it.each` NotFound; server 404/401; manual 2.6 "B cannot snooze A note"                                                                                         | COMPLIANT            |
| actions: Keyboard layer   | Snooze via keys       | keyboard.test "s h snoozes +1 h ... focus follows"                                                                                                                               | COMPLIANT            |
|                           | Reopen                | keyboard "z reopens a done item, and does nothing on an open one"                                                                                                                | COMPLIANT            |
|                           | No target             | keyboard "a done item offers undo only: x and s do nothing"                                                                                                                      | COMPLIANT            |
|                           | Earlier move          | `rules.test.ts` snooze rules + keyboard "s h" (+1 h from now); 15:00 -> 10:05 case covered by domain rule                                                                        | COMPLIANT            |
| actions: Row display      | Snoozed label (C5)    | item-row "snoozed item reads {time} - was {original} - {count}x"                                                                                                                 | COMPLIANT            |
|                           | Reduced motion        | only `keyboard.test.tsx:261,268` assert that CSS uses motion tokens; tokens.css `@media (prefers-reduced-motion)` remaps them; no runtime check, 7.5 pending (W5c)               | COMPLIANT (static)   |
| actions: Mobile actions   | Sheet                 | `action-sheet.test.tsx`, `mobile-flow.test.tsx`                                                                                                                                  | COMPLIANT            |
| actions: Optimistic       | Failure rollback      | `reminder-actions.test.tsx` `it.each` 5xx/409/404 rollback + message + refetch                                                                                                   | COMPLIANT            |
|                           | Expiry                | reminder-actions "ends the session once, after the rollback, with no error line"                                                                                                 | COMPLIANT            |
| today-page: Page sections | Morning page (C4)     | slice-1 `day-page.test.tsx` (unchanged, green)                                                                                                                                   | COMPLIANT            |
|                           | Done header (C3)      | day-page "strikes a done item ... (C3)"; item-row done; action-sheet "done item offers Undo only"                                                                                | COMPLIANT            |
|                           | Late label (C7)       | slice-1 tick tests in today-container / day-page (green)                                                                                                                         | COMPLIANT            |
|                           | Many timed items      | `rail-model.test.ts` "goes compact above 6 timed items"                                                                                                                          | COMPLIANT            |
| today-page: Statusline    | Counts                | statusline "footer landmark with mode, weekday+day, counts and the clock (C4)"                                                                                                   | COMPLIANT            |
|                           | Working hints only    | statusline "renders a hint for each working key"; keyboard "nothing focused: move; an open item adds x and s"                                                                    | COMPLIANT            |
|                           | No search hint        | statusline "no key hints, nor hints for unshipped features"                                                                                                                      | COMPLIANT            |

**Compliance summary**: 46/46 scenarios compliant, 3 of them on composed, manual or static evidence only (W5a-c); 0 UNTESTED, 0 FAILING. Requirements: 17/17.

### CONTRACT coverage

| Row          | Evidence                                                                                                                   | Status |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- | ------ |
| C1           | capture-preview.test (preview text), capture-note.test + server.test POST /notes, capture-flow                             | ok     |
| C3           | reminder-actions.test, server.test, today-patch parity, keyboard/mobile-flow                                               | ok     |
| C5           | reminder-actions.test, keyboard, which-key, action-sheet                                                                   | ok     |
| C6           | reminder-actions.test, dst.test D4, keyboard `s t`                                                                         | ok     |
| D1-D4        | dst.test (gap, overlap, Tomorrow 9:00 across both), today.test D1/D2, reminder-actions D3/D4                               | ok     |
| R9, R11, R16 | CONTRACT.md updated in commits b14736a / 9ad26c4 / ae04725 before or with tests (rule 23); docs table lists C1, C3, C5, C6 | ok     |

### Correctness (static)

| Check                                 | Status | Notes                                                                                                                       |
| ------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| Hexagonal inward imports              | ok     | `apps/api/src/application/*` imports only `@onti/shared` and sibling files; no kysely or infrastructure import              |
| Clock port only                       | ok     | `new Date()` in api only in `infrastructure/clock/system-clock.ts`; shared uses `new Date(x)` constructors, no `Date.now()` |
| packages/shared no IO                 | ok     | no fs/net/db/react/fetch imports in `packages/shared/src`                                                                   |
| No migration                          | ok     | diff has no `supabase/` or migration path                                                                                   |
| R15 isolation                         | ok     | 404 for foreign ids, manual 2.6 as another user                                                                             |
| Row lock                              | ok     | `for update` verified live: lock wait observed, two snoozes end at count 2 (manual 2.6a/b)                                  |
| UI rule 8 (no raw hex outside tokens) | ok     | no hex in any `*.css`/`*.ts(x)` under `apps/web/src` except `styles/tokens.css`                                             |
| Rule 9 (no `--core-*` in components)  | ok     | `--core-` appears only in `styles/tokens.css`                                                                               |
| Rule 10 (no px font sizes)            | ok     | none                                                                                                                        |
| Rule 11 (durations via tokens)        | ok     | all `animation:` use `--motion-*`/`--ease-paper`; reduced-motion remap at `styles/tokens.css:211-219`                       |
| Rule 12 (copy in messages)            | ok     | no literal UI text or placeholder/aria strings in `features/today/*.tsx`, `App.tsx`                                         |
| Rule 13 (44 px targets)               | ok     | `min-height: var(--size-target)` on MobileBar, ActionSheet, CommandBar (2), ItemRow                                         |
| Commit messages                       | ok     | all 13 conventional; zero `Co-Authored-By` lines in `bd8b5d4..HEAD`                                                         |

### Coherence (design)

| Decision                                   | Followed? | Notes                                                           |
| ------------------------------------------ | --------- | --------------------------------------------------------------- |
| Mutations in one TanStack scope, retry 0   | yes       | tests "runs them one at a time", "never retries a failed write" |
| Server stamps time from Clock + profile tz | yes       | api use cases; routes take no time from the client              |
| Lazy command bar                           | yes       | `React.lazy` in `DayPage.tsx:21`; chunk 2.23 kB                 |
| Lazy WhichKey                              | no        | known deviation, kept in main (see W3)                          |
| Capture use case validates title length    | no        | validated at the HTTP schema only (see W4)                      |
| 17:00 preset hidden after 17:00            | yes       | human-approved default, still unconfirmed in tasks.md header    |

### Issues Found

**CRITICAL**: None.

**WARNING**:

- W1. Manual smoke 7.5 not done (`tasks.md`: `- [ ] 7.5`). No real-browser evidence for reduced motion, light/dark, mobile no-horizontal-scroll, or the full `c` / `s h` / `x` / `z` flow. Needs the human before archive.
- W2. P.1 and P.2 (PR, push, green "Verify and build") not done; expected, human-gated (rule 6).
- W3. `WhichKey` is not lazy; main bundle 591.44 kB vs 569 kB baseline (+3.9 percent). Recorded deviation; `DayPage.tsx:16` imports it statically.
- W4. Capture use case (`apps/api/src/application/capture-note.ts`) does not validate title length; only the HTTP schema does. A non-HTTP caller could bypass the 200-char rule (the DB `notes_title_check` still guards).
- W5. Spec scenario gaps (counted compliant on weaker evidence): (a) "Past explicit time" has no test that saves `today 09:00` and renders "late 1h"; (b) "Atomicity" is proven manually only for a failed note insert, not a failed link insert (`run2.log` 3.5: `notes_title_check`); (c) "Reduced motion" is verified only by token assertions (`apps/web/test/keyboard.test.tsx:261-268`) plus `styles/tokens.css:211`, never at runtime.
- W6. Strict TDD evidence is prose, not a per-task table; hook capture tests (`reminder-actions.test.tsx:140-200` area) are characterization tests written after the implementation (apply-progress admits it; a mutation check was run to compensate).
- W7. Manual DB checks (1c.8, 2.6, 3.5) ran on a hand-built Postgres 16 with Supabase stand-ins: no GoTrue, PostgREST or pooler, hand-built JWT claims. Row-lock and tag-upsert behavior is real Postgres; RLS and pooler fidelity is unproven. The PR description should say so.
- W8. Statusline hint for `c` and the existing slice-1 `item-row.test.tsx` test "is read-only: no controls" still passes only because actions are keyboard-driven; its name now contradicts the spec ("open items MUST offer the actions"). Rename to avoid confusion.

**SUGGESTION**:

- S1. Add a runtime reduced-motion test (matchMedia + computed style or a CSS-text assertion on the remapped tokens) to close W5(c) without a browser.
- S2. Add one `capture-note` test with a failing `note_tags` insert in the fake to mirror the Atomicity scenario.
- S3. Consider `vi` assertions on the 15:00 -> 10:05 "Earlier move" case explicitly (currently covered by the +1 h rule, not by that fixture).
- S4. No E2E layer exists; a Playwright smoke of the 7.5 checklist would remove the manual step in later slices.
- S5. Add `.claude/settings.json` (untracked, not part of this change) to the ignore list or leave it out of the PR.

### Verdict

PASS WITH WARNINGS

0 CRITICAL, 8 WARNING, 5 SUGGESTION. All 503 tests, format, lint, typecheck and the web build are green; architecture and UI rules hold; DB-level checks passed. Close 7.5 (human smoke) and the PR tasks before sdd-archive; W4 and W5 are optional hardening.
