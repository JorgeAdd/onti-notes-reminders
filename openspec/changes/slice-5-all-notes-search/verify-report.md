```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:2304c6756b394b0a29ff137ec07f27edd66c2085ad42ca4fdff3106788a6d8eb
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 12/12
scenarios: 28/28
test_command: npm run verify
test_exit_code: 0
test_output_hash: sha256:2304c6756b394b0a29ff137ec07f27edd66c2085ad42ca4fdff3106788a6d8eb
build_command: npm run build -w @onti/web
build_exit_code: 0
build_output_hash: sha256:897be1da5ba250cb12ec47526c66320570581e11bd06c0dd661661353cf96def
```

## Verification Report

**Change**: slice-5-all-notes-search
**Version**: N/A
**Mode**: Strict TDD
**Branch / HEAD**: feat/slice-5-all-notes-search @ 4682eed (base main 73f177e, 10 commits)
**Scope**: commits 1-8 plus fix 4682eed. Commit 9 (All-notes tag filter) is not implemented by design; it waits for slice 3 (PR #13). Its scenario is reported as pending, not failing.

### Completeness

| Metric            | Value                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Tasks in scope    | 0.1, 1.x-8.4, 8.6                                                                                     |
| In-scope done     | all ticked, except 8.5                                                                                |
| Task 8.5          | unticked in `tasks.md:111`; smoke was done by the orchestrator on 2026-10-08 (see below). Tick it.    |
| Pending by design | 9.0-9.6 (rebase onto slice 3, tag filter), 10.1-10.4 (PR work, human-gated). Not counted as failures. |

### Build & Tests Execution

**Verify** (`npm run verify` = format:check, eslint, tsc, tests): exit 0.

```text
@onti/api     Test Files 14 passed | 1 skipped (15)   Tests 208 passed | 18 skipped (226)
@onti/web     Test Files 35 passed (35)               Tests 285 passed (285)
@onti/shared  Test Files 8 passed (8)                 Tests 136 passed | 3 todo (139)
```

The 18 skipped tests are `apps/api/test/postgres/search.pg.test.ts` (skipped without `ONTI_TEST_DATABASE_URL`, by design). I did not run it against any database.

**Build** (`npm run build -w @onti/web`): exit 0. Main JS `index-DrpLvJh4.js` 593.49 kB (gzip 170.67), CSS 16.32 kB; lazy `NotesContainer` chunk 5.66 kB JS + 5.52 kB CSS (gzip 2.24 + 1.41); `CommandBar` chunk 2.62 kB. Baseline 591.44 kB, so +2.05 kB (+0.35 percent). The usual ">500 kB" warning is present at baseline too.

**Coverage**: not available (`@vitest/coverage-v8` is not installed). Skipped, not a failure.

### TDD Compliance

| Check                   | Result | Details                                                                                                                                                                                  |
| ----------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TDD evidence reported   | warn   | apply-progress (#1105) is prose: no per-task "TDD Cycle Evidence" table. Commit bodies and tasks.md ("RED test, then GREEN") carry the order, but no RED run output is preserved here.   |
| All tasks have tests    | ok     | Every code task maps to an existing test file (search-terms, excerpt, notes-list, search-notes, search.pg, search-route, seed-plan, demo-scenario, notes-format, notes-row, api, ...).   |
| RED confirmed           | warn   | Test files exist and ship in the same commit as the code. RED-before-GREEN for 4682eed is documented (spy on add/removeEventListener); the flushSync test passes before the fix (guard). |
| GREEN confirmed         | ok     | All suites pass on my own run (629 passed, 18 skipped by design, 3 todo).                                                                                                                |
| Triangulation           | ok     | `it.each` and multi-case suites: operators, tokenizing table, stale-term race, 50 of 70 versus 2 of 15, hint states.                                                                     |
| Safety net for modified | warn   | Not itemized in apply-progress; the husky hook ran `npm run verify` before each commit (tasks.md global checks).                                                                         |

### Test Layer Distribution

| Layer       | Tests | Files | Tools                                                                          |
| ----------- | ----- | ----- | ------------------------------------------------------------------------------ |
| Unit        | many  | 8     | vitest (search-terms, excerpt, tsquery-of, notes-list, notes-format, debounce) |
| Integration | many  | 12    | vitest + Fastify `inject`; RTL + user-event; real Postgres (opt-in, 18 tests)  |
| E2E         | 0     | 0     | none installed (manual Playwright smoke by the orchestrator, task 8.5)         |

### Assertion Quality

Scanned the 18 new or changed test files. No tautology, no ghost loop, no smoke-only test. Every `toEqual([])` has a companion non-empty case with the same setup (`search-notes.test.ts:88,94,207`; `search-terms.test.ts:19-22,40`; `search.pg.test.ts:158,239,257`; `notes-row.test.tsx:71`). Two tests couple to CSS text (`notes-row.test.tsx:86`, `mobile-bar.test.tsx:33`: tokens only, 44 px); that mirrors the existing slice-2 pattern and is acceptable for rules 8-13.

**Assertion quality**: 0 CRITICAL, 0 WARNING.

### Spec Compliance Matrix

Requirements in scope: 12 of 13 specified (notes-search 8 of 9, demo-seed 2, today-page 2); the tag filter requirement (1 requirement, 1 scenario) is out of scope by agreement with the orchestrator and reported as pending. Scenarios in scope: 28 of 29.

| Req (spec)                 | Scenario                        | Test / evidence                                                                                                                                                                                                                        | Result                      |
| -------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| search: GET /notes list    | All notes (C9 data)             | `search-notes.test.ts` "returns every note newest first when q is missing..."; `search-route.test.ts` "returns the caller`s notes ... newest first"; `search.pg.test.ts` "lists every note by created_at desc"                         | COMPLIANT                   |
|                            | Cap                             | `search-notes.test.ts` "caps the list at 50 and keeps the total at 60"; `search.pg.test.ts` "gives 50 of 60 and a total of 60"; shared schema rejects 51                                                                               | COMPLIANT                   |
| search: Search matching    | Title and body (C9)             | `search-notes.test.ts` "finds staging ... N2 and N8"; `demo-scenario.test.ts` "C9 over the seeded scenario"; `search.pg.test.ts` C9; route "narrows by q and keeps the total"                                                          | COMPLIANT                   |
|                            | Body-only, prefix, case         | `search-notes.test.ts` "is case-insensitive and matches by word prefix" and "a word only in the body of N1"; `search.pg.test.ts` same plus `collab:*`/`COLLAB:*`                                                                       | COMPLIANT                   |
|                            | No match                        | `search-notes.test.ts` "does not narrow the total ... no match of 15"; `search.pg.test.ts:158`; tokenizer-ignored terms (`²`, `Ⅻ`) give 200 and an empty list (`search.pg.test.ts:265`)                                                | COMPLIANT                   |
| search: Sanitization       | Hostile input                   | `search-route.test.ts` "answers 200 for hostile input"; `search-notes.test.ts` "never throws on operator-heavy input"; `search-terms.test.ts` operator table; `tsquery-of.test.ts`; `search.pg.test.ts` "rejects a hostile term array" | COMPLIANT                   |
|                            | Blank q                         | `search-route.test.ts` "treats an empty or blank q as no filter"; `search-notes.test.ts:100`                                                                                                                                           | COMPLIANT                   |
|                            | Invalid parameter               | `search-route.test.ts` "returns 400 for a q over 200 characters and for a repeated q"; shared `notes-list.test.ts` q 201 rejected                                                                                                      | COMPLIANT                   |
| search: Auth, isolation    | Isolation                       | `search-notes.test.ts:194,205`; route "lists 0 of Jorge`s notes for Ana (C11, R15)"; `search.pg.test.ts` "isolates users" with Ana's decoy                                                                                             | COMPLIANT                   |
|                            | No token                        | `search-route.test.ts` "checks the token before the query (401 wins over 400)" and the 401 cases; `server.test.ts`                                                                                                                     | COMPLIANT                   |
| search: All notes view     | Row content                     | `notes-row.test.tsx` "shows title, tags, due label and the excerpt as text", "strikes a done title"; `notes-format.test.ts`; `excerpt.test.ts` (120 units, `…`); smoke: N1 excerpt 117 units                                           | COMPLIANT                   |
|                            | Body as text                    | `notes-row.test.tsx` "renders an excerpt full of markup literally: no element, no handler"; smoke: plain-text excerpts, no child elements                                                                                              | COMPLIANT                   |
|                            | Plain notes visible             | `notes-row.test.tsx` "has no due label, no tags and no excerpt line when the note has none"; `search-notes.test.ts` "gives an empty excerpt for a note without a body"                                                                 | COMPLIANT                   |
|                            | Read-only                       | `notes-row.test.tsx` "is read-only: not focusable, no handlers"; `notes-view.test.tsx` "x, s and z do nothing ... and send no request"; smoke: 0 POSTs                                                                                 | COMPLIANT                   |
| search: Search interaction | Open and return                 | `notes-view.test.tsx` "opens on / ... esc returns to today", "one esc leaves even with text typed"; `keyboard.test.tsx` listener-stability pair; smoke: real `/` key press after 4682eed                                               | COMPLIANT                   |
|                            | Typing                          | `notes-container.test.tsx` "reads SEARCH · all notes · 15 of 15 ... and SEARCH · term · n of 15"; smoke: `staging` gives 2 of 15, N2 and N8                                                                                            | COMPLIANT                   |
|                            | Capped count                    | `notes-container.test.tsx` "counts shown of the whole note count: 60 matches of 70 notes read 50 of 70"                                                                                                                                | COMPLIANT                   |
|                            | Mobile                          | `notes-view.test.tsx` "opens from the mobile Search button"; `mobile-bar.test.tsx` 44 px; `NotesPage.module.css:31` back button `--size-target`; smoke: mobile tap, no horizontal scroll                                               | COMPLIANT                   |
| search: States             | States                          | `notes-container.test.tsx`: "No notes yet", no-match copy with the term as text, error with Retry (first load and later), "ends the session once on a 401", loading status; smoke: `zzz` message                                       | COMPLIANT                   |
| search: Accessibility      | Screen reader                   | `notes-container.test.tsx` "announces the count politely" (`aria-live="polite"`); one h1, input name from `messages.notes.searchLabel` ("shows a loading status, then the page with one h1 ...")                                       | COMPLIANT                   |
| search: Tag filter         | Filter combined with search     | Not implemented: task 9.x waits for slice 3 (PR #13)                                                                                                                                                                                   | PENDING: depends on slice 3 |
| seed: Note bodies          | Body search on seeded data (C9) | `demo-scenario.test.ts` "gives N1 and N8 the dataset bodies verbatim", "invents no body for the other 13 notes", "C9 over the seeded scenario". Through the fake repo, not through `seed-demo.ts` (see W3)                             | COMPLIANT                   |
| seed: Idempotency          | Re-run                          | `seed-plan.test.ts` "same-day repeat creates 0 and leaves all 15 unchanged"; "first run creates 15 notes and 4 tags"                                                                                                                   | COMPLIANT                   |
|                            | Body restored                   | `seed-plan.test.ts:60` "a user seeded before bodies existed is updated once (N1, N8), then unchanged" (blank body is detected as a difference at `seed-plan.ts:47`)                                                                    | COMPLIANT                   |
| today: Statusline          | Counts                          | slice-2 `statusline.test.tsx` (unchanged, green)                                                                                                                                                                                       | COMPLIANT                   |
|                            | Working hints only              | `keyboard.test.tsx` "nothing focused: move; an open item adds x and s"; `statusline.test.tsx` "renders a hint for each working key"                                                                                                    | COMPLIANT                   |
|                            | Search hint, no unshipped hints | `notes-view.test.tsx` "hints / search on Today exactly when the key works, also with no rows"; "does not hint / search while s has armed the snooze menu"; smoke: `/ search` hint                                                      | COMPLIANT                   |
| today: Layout and theme    | Themes and mobile               | Slice-2 evidence plus smoke: no horizontal scroll, dark mode OK, reduced motion OK (new CSS adds no animation, so no new fallback is needed)                                                                                           | COMPLIANT                   |
|                            | Mobile Search button            | `mobile-bar.test.tsx` "renders each button only when its handler exists: Search first", "styles the button at the 44 px target with tokens only"; `notes-view.test.tsx:163`; smoke                                                     | COMPLIANT                   |

**Compliance summary**: 28/28 in-scope scenarios compliant, 0 UNTESTED, 0 FAILING. Requirements 12/12 in scope. Out of scope and pending: tag filter (1 requirement, 1 scenario; slice 3). The envelope totals exclude it; with it the full-spec totals are 12/13 and 28/29.

### CONTRACT coverage (rule 23)

| Row | Evidence                                                                                                                                                                                                                                  | Status            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| R13 | CONTRACT wording changed first in `0888012` (word prefix, punctuation ignored) with `search-terms.test.ts`; "max 50, newest first, no pagination, total never narrowed" in `ba2e982` with `notes-list.test.ts` and `search-notes.test.ts` | ok                |
| R15 | `search-notes.test.ts:194,205`, `search-route.test.ts`, `search.pg.test.ts` (explicit `user_id` plus RLS)                                                                                                                                 | ok                |
| C9  | Recorded in `docs/CONTRACT.md` (commit `e8dba75`) with the proving files; the `it.todo` markers stay in `packages/shared/test/contract.test.ts` by documented choice                                                                      | ok                |
| C11 | Listing and `401` half recorded with `search-route.test.ts`; the `404` half stays `todo` until slice 4 (documented in CONTRACT)                                                                                                           | partial by design |

### Correctness (static)

| Check                           | Status | Notes                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Query building security         | ok     | `searchTerms` (`apps/api/src/domain/search-terms.ts`) splits on everything that is not a letter or digit; `tsqueryOf` (`postgres-note-repository.ts:258-263`) re-checks every term against the word pattern and throws; the tsquery is a bound parameter in `search @@ to_tsquery('simple', ${tsquery})` (line 202); only `left(body, 400)` uses `sql.lit` (a constant). |
| R15 ownership in the adapter    | ok     | `.where('user_id', '=', identity.userId)` on the list (line 199), the count (line 214) and the tag links (line 224), all inside `asUser` (RLS as the second lock)                                                                                                                                                                                                        |
| `total` never narrowed          | ok     | separate count query without the tsquery filter (lines 210-214)                                                                                                                                                                                                                                                                                                          |
| Hexagonal inward imports        | ok     | `application/search-notes.ts` imports only `@onti/shared`, domain and sibling application files; Kysely and SQL only in infrastructure                                                                                                                                                                                                                                   |
| Clock port only                 | ok     | no `new Date()` or `Date.now()` in `apps/api/src`, `packages/shared/src` or `features/notes`; the only hit is the pre-existing `apps/web/src/lib/clock.ts:10`                                                                                                                                                                                                            |
| packages/shared no IO           | ok     | `notes-list.ts` is zod only; exported at the end of `index.ts`                                                                                                                                                                                                                                                                                                           |
| No migration                    | ok     | no `supabase/` path in `73f177e..4682eed`; uses the existing `notes.search` index                                                                                                                                                                                                                                                                                        |
| Verified JWT first              | ok     | `server.ts` route calls `authenticate` before parsing the query (401 wins over 400, tested)                                                                                                                                                                                                                                                                              |
| UI rule 8 (no raw hex)          | ok     | grep of `apps/web/src/features/notes` for hex colors: no hits                                                                                                                                                                                                                                                                                                            |
| Rule 9 (no `--core-*`)          | ok     | no hits in `features/notes` or `MobileBar.module.css`; a test asserts rows never use the vermilion date colour (`notes-row.test.tsx:86`)                                                                                                                                                                                                                                 |
| Rule 10 (no px font sizes)      | ok     | no hits                                                                                                                                                                                                                                                                                                                                                                  |
| Rule 11 (durations, motion)     | ok     | no `animation`, `transition` or raw duration in the new CSS, so no new reduced-motion fallback is required                                                                                                                                                                                                                                                               |
| Rule 12 (copy in messages)      | ok     | no literal UI text or aria strings in `features/notes/*.tsx`, `App.tsx`, `MobileBar.tsx`; all copy in the `notes` group and `mobile.search` of `messages.ts` (append-only)                                                                                                                                                                                               |
| Rule 13 (44 px targets, no IDs) | ok     | `min-height: var(--size-target)` on the back button (`NotesPage.module.css:31`), MobileBar (`:11`, `:21`) and the input through `composes` from `CommandBar.module.css:10`; no N1-N15 in `features/notes`, `App.tsx` or `messages.ts`                                                                                                                                    |
| Plain-text rendering            | ok     | no `dangerouslySetInnerHTML` or `innerHTML` anywhere in `apps/web/src`; excerpt is a text node (`NoteRow.tsx`)                                                                                                                                                                                                                                                           |
| Commit messages                 | ok     | all 10 conventional; 0 `Co-Authored-By` lines in `73f177e..4682eed` (checked with `grep -ic`)                                                                                                                                                                                                                                                                            |

### Coherence (design)

| Decision                                                  | Followed? | Notes                                                                                                              |
| --------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| Two views in `App`, no router or URL state (Q6)           | yes       | `view` state in `App.tsx`; reset on sign-out while rendering; refresh returns to today                             |
| Lazy notes view with idle preload (Decision 7)            | yes       | `React.lazy` plus `requestIdleCallback` with a timer fallback; chunk 5.66 kB                                       |
| Debounce 200 ms, query keyed by term, last good list kept | yes       | `NotesContainer.tsx`; tests for debounce, stale answer, kept list                                                  |
| Read-only rows (Q7)                                       | yes       | no tabindex or handlers; `x`/`s`/`z` send no request                                                               |
| Statusline `SEARCH · term · n of total`                   | yes       | total is every note the user has                                                                                   |
| Stable keyboard listener (fix 4682eed)                    | yes       | latest handle in a ref, listener keyed on `enabled` (`use-keyboard-layer.ts:12-26`); real `/` verified in Chromium |
| MobileBar by handler, Search first (SG14)                 | yes       | rebase onto slice 3 must take slice 3's version (task 9.0)                                                         |

### Manual smoke (task 8.5), evidence reported by the orchestrator

Not re-run by me (I have no browser harness); recorded as supplied: Playwright on mocked data, 2026-10-08. Today shows `/ search` and the mobile Search button; All notes opens by a real `/` key press and by mobile tap with the search focused, 15 rows newest first, statusline `SEARCH · all notes · 15 of 15`; `staging` gives 2 rows (N2, N8), `2 of 15`; `zzz` shows the no-match message; esc and Back to today return; excerpts are plain text with no child elements (N1 excerpt 117 UTF-16 units ending in `…`); rows are not focusable; `x`/`s`/`z` send 0 POSTs; no horizontal scroll; dark mode and reduced motion OK. The real-Postgres tokenizing table (18/18 on a throwaway database) is likewise reported, not re-run. Consistent with the committed tests.

### Issues Found

**CRITICAL**: None.

**WARNING**:

- W1. Task 8.5 is unticked (`openspec/changes/slice-5-all-notes-search/tasks.md:111`) although the smoke ran. The orchestrator will tick it. The smoke used mocked data, not the real API against a seeded database, and `collaborators` giving N1 was not in the reported smoke list (covered by tests only).
- W2. Tag filter requirement and scenario (`notes-search`, "Tag filter in All notes") are not implemented; tasks 9.0-9.6 and PR tasks 10.1-10.4 are open. Pending by design (depends on slice 3, PR #13); must be closed before `sdd-archive`.
- W3. The seed write path has no runtime test. `apps/api/scripts/seed-demo.ts:108` (insert) and `:119` (`excluded.body` upsert) are exercised only through the pure `planSeed` and `buildScenario` tests; the task 5 "dry run against the throwaway DB" is not evidenced. The "Body search on seeded data" scenario is proven over the fake repo, not over a script-seeded database.
- W4. `search.pg.test.ts` (18 tests) is skipped in `npm run verify` and in CI (documented in CONTRACT and the PR follow-up). My run had it skipped; the 18/18 result and the measured tokenizing table are reported evidence only. Real-Postgres fidelity beyond the hand-built stand-ins (no GoTrue, PostgREST or pooler) remains unproven, as in slice 2.
- W5. Strict TDD evidence is prose, not a per-task table, and no RED output is preserved. In `keyboard.test.tsx` the flushSync two-layer test passes before the fix (guard only, admitted in apply-progress); the spy-based test is the real RED.
- W6. Main bundle is 593.49 kB (+2.05 kB over the 591.44 kB baseline); the commit bodies recorded 593.42 kB before the 4682eed fix. Small, but the baseline keeps creeping; the lazy chunk keeps the view itself out of main.

**SUGGESTION**:

- S1. Add a CI job with a Postgres service so `search.pg.test.ts` stops being opt-in (already listed as a PR follow-up in tasks 10.4).
- S2. Add one script-level check for `seed-demo` body upsert (dry run against the throwaway DB, output pasted in the PR) to close W3.
- S3. After the slice 3 rebase, re-run the batch 1-2 suites and the `MobileBar` by-handler tests (task 9.0 already says so).
- S4. `.engram` and `prompts/durante/` (task 10.1) should be completed before the PR.

### Verdict

PASS WITH WARNINGS

0 CRITICAL, 6 WARNING, 4 SUGGESTION. In-scope work (commits 1-8 plus fix 4682eed) is complete and green: format, lint, typecheck, 629 tests, and the web build all pass. R13, R15, C9 and C11 (listing half) are recorded with their tests; query building is sanitized, bound and re-checked; no migration, no IO in shared, Clock port respected; UI rules 8-13 hold. The only unmet spec item is the tag filter, pending on slice 3.
