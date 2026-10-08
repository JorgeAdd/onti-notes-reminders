```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:dd9dabe1e01ed16badec5a898c4ef6d669d384961c8dd57860614b442d4b56a8
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 13/13
scenarios: 29/29
test_command: npm run verify
test_exit_code: 0
test_output_hash: sha256:dd9dabe1e01ed16badec5a898c4ef6d669d384961c8dd57860614b442d4b56a8
build_command: npm run build -w @onti/web
build_exit_code: 0
build_output_hash: sha256:9adad476d96d1e00284cd01b7ec4d15c316b71555cdfd4723f4203bdd6104ab1
```

## Verification Report

**Change**: slice-5-all-notes-search
**Version**: N/A
**Mode**: Strict TDD
**Branch / HEAD**: feat/slice-5-all-notes-search @ a2ad9d2 (base origin/main fa6078a, which contains slice 3; 14 commits)
**Scope**: the whole slice, including commit 9 (All-notes tag filter, a2ad9d2), the follow-ups c00fcee (`/` unavailable while the tag bar is open or a placeholder page loads) and c3f3a68 (MobileBar CSS dedupe), and the rebase onto slice 3. This report replaces the earlier pre-rebase report (HEAD 4682eed, commit 9 pending).

### Completeness

| Metric         | Value                                                                                                                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tasks in scope | 0.1, 1.1-9.6 (all ticked, including 8.5 and 9.0-9.6)                                                                                                                                                    |
| Open tasks     | 10.1 prompts in `prompts/durante/`, 10.2 post-rebase smoke, 10.3 ask before push, 10.4 PR description (`tasks.md:139-142`). PR work, human-gated; 10.2 is pending by agreement. Reported as WARNING W1. |

### Build & Tests Execution

**Verify** (`npm run verify` = format:check, eslint, tsc, tests): exit 0.

```text
@onti/api     Test Files 15 passed | 1 skipped (16)   Tests 272 passed | 21 skipped (293)
@onti/web     Test Files 42 passed (42)                Tests 387 passed (387)
@onti/shared  Test Files 14 passed (14)                Tests 261 passed | 3 todo (264)
```

The 21 skipped tests are `apps/api/test/postgres/search.pg.test.ts` (skipped without `ONTI_TEST_DATABASE_URL`, by design). I did not run it against any database. The 21/21 run against a throwaway Postgres 16 is reported evidence (apply-progress #1105), not re-run here.

**Slice 3 regression run**: `vitest run` over `day-navigation`, `tag-filter`, `mobile-tags`, `filtered-page` and `keys`: 5 files, 80 tests passed. `keyboard`, `today-container`, `app`, `mobile-bar` and `statusline` also pass inside the full web run.

**Build** (`npm run build -w @onti/web`): exit 0. Main JS `index-62nD_vzT.js` 603.98 kB (gzip 174.22), CSS 17.98 kB; lazy `NotesContainer` chunk 6.82 kB JS + 5.52 kB CSS; `TagBar` chunk 1.30 kB; `CommandBar` chunk 2.62 kB. The usual ">500 kB" warning is present at baseline too. The main bundle matches the 603.98 kB in apply-progress.

**Coverage**: not available (`@vitest/coverage-v8` is not installed). Skipped, not a failure.

### TDD Compliance

| Check                   | Result | Details                                                                                                                                                                                                                                                                           |
| ----------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TDD evidence reported   | warn   | apply-progress (#1105) is prose: no per-task "TDD Cycle Evidence" table. It records RED counts for commit 9 (shared 1 fail, api 6 fail, web 8 fail, then GREEN) and a mutation check for follow-up A (removing the guards fails both new tests). No RED output is preserved here. |
| All tasks have tests    | ok     | Every code task maps to an existing test file; commit 9 ships tests in `search-notes`, `search-route`, `search.pg`, `notes-list`, `api`, `notes-container`, `notes-view`; c00fcee is `search-availability.test.tsx`.                                                              |
| RED confirmed           | warn   | Test files exist and ship in the same commit as the code. c00fcee passes immediately by design (it locks guards already added during the rebase); the mutation check recorded in apply-progress is the substitute for RED.                                                        |
| GREEN confirmed         | ok     | All suites pass on my own run (920 passed, 21 skipped by design, 3 todo).                                                                                                                                                                                                         |
| Triangulation           | ok     | Tag filter: alone, with a term, before the cap (5 of 60), unknown tag, other user's tag, malformed and repeated tag, tag with and without a term.                                                                                                                                 |
| Safety net for modified | warn   | Not itemized in apply-progress; the husky hook ran `npm run verify` before each commit.                                                                                                                                                                                           |

### Test Layer Distribution

| Layer       | Tests | Files | Tools                                                                          |
| ----------- | ----- | ----- | ------------------------------------------------------------------------------ |
| Unit        | many  | 8     | vitest (search-terms, excerpt, tsquery-of, notes-list, notes-format, debounce) |
| Integration | many  | 14    | vitest + Fastify `inject`; RTL + user-event; real Postgres (opt-in, 21 tests)  |
| E2E         | 0     | 0     | none installed (manual Playwright smoke by the orchestrator; 10.2 pending)     |

### Assertion Quality

Scanned the new or changed test files, with attention to commit 9 and c00fcee. No tautology, no ghost loop, no smoke-only test. The empty-list assertions have non-empty companions with the same setup (`search-notes.test.ts:217-241`, `search-route.test.ts` tag cases, `search.pg.test.ts:241-257`). The only loop assertion in commit 9 (`search-route.test.ts`, three bad tag URLs) iterates a literal array. `mobile-bar.test.tsx` and `notes-row.test.tsx` still read CSS text for tokens (the slice-2 pattern; acceptable for rules 8-13).

**Assertion quality**: 0 CRITICAL, 0 WARNING.

### Spec Compliance Matrix

13 requirements and 29 scenarios in total (notes-search 9 and 21, demo-seed 2 and 3, today-page 2 and 5). All 29 have a covering test that passed in my run.

| Req (spec)                 | Scenario                        | Test / evidence                                                                                                                                                                                                                                                             | Result    |
| -------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| search: GET /notes list    | All notes (C9 data)             | `search-notes.test.ts` "returns every note newest first..."; `search-route.test.ts` newest-first; `search.pg.test.ts` "lists every note by created_at desc"                                                                                                                 | COMPLIANT |
|                            | Cap                             | `search-notes.test.ts` "caps the list at 50 and keeps the total at 60"; `search.pg.test.ts` 50 of 60; shared schema rejects 51                                                                                                                                              | COMPLIANT |
| search: Search matching    | Title and body (C9)             | `search-notes.test.ts:64` (N2 and N8); `demo-scenario.test.ts` C9; `search.pg.test.ts`; route "narrows by q and keeps the total"                                                                                                                                            | COMPLIANT |
|                            | Body-only, prefix, case         | `search-notes.test.ts:72` (`STAGING`, `Staging`, `stag`) and the body-only N1 case; `search.pg.test.ts` `collab:*`/`COLLAB:*`                                                                                                                                               | COMPLIANT |
|                            | No match                        | `search-notes.test.ts:88` and the no-match total of 15; `search.pg.test.ts` tokenizer-ignored terms give 200 and an empty list                                                                                                                                              | COMPLIANT |
| search: Sanitization       | Hostile input                   | `search-route.test.ts:97`; `search-notes.test.ts:166`; `search-terms.test.ts`; `tsquery-of.test.ts`; `search.pg.test.ts` hostile array rejected                                                                                                                             | COMPLIANT |
|                            | Blank q                         | `search-route.test.ts` "treats an empty or blank q as no filter"; `search-notes.test.ts`                                                                                                                                                                                    | COMPLIANT |
|                            | Invalid parameter               | `search-route.test.ts` 400 for `q` over 200, repeated `q`, and (new) malformed, empty or repeated `tag`; `notes-list.test.ts` tag slug table                                                                                                                                | COMPLIANT |
| search: Auth, isolation    | Isolation                       | `search-notes.test.ts:187-205`; route "lists 0 of Jorge's notes for Ana"; `search.pg.test.ts:213` and `:254-257` (Ana's same-slug tag)                                                                                                                                      | COMPLIANT |
|                            | No token                        | `search-route.test.ts` 401 cases (401 wins over 400); `server.test.ts`                                                                                                                                                                                                      | COMPLIANT |
| search: All notes view     | Row content                     | `notes-row.test.tsx` row content, strike; `notes-format.test.ts`; `excerpt.test.ts`                                                                                                                                                                                         | COMPLIANT |
|                            | Body as text                    | `notes-row.test.tsx` "renders an excerpt full of markup literally: no element, no handler"                                                                                                                                                                                  | COMPLIANT |
|                            | Plain notes visible             | `notes-row.test.tsx` no due, tags or excerpt; `search-notes.test.ts` empty excerpt                                                                                                                                                                                          | COMPLIANT |
|                            | Read-only                       | `notes-row.test.tsx` not focusable; `notes-view.test.tsx` x, s and z send no request                                                                                                                                                                                        | COMPLIANT |
| search: Search interaction | Open and return                 | `notes-view.test.tsx:72` (`/` then esc), `:85` (one esc with text typed); `keyboard.test.tsx` listener-stability pair                                                                                                                                                       | COMPLIANT |
|                            | Typing                          | `notes-container.test.tsx` "SEARCH · all notes · 15 of 15 ... SEARCH · term · n of 15"                                                                                                                                                                                      | COMPLIANT |
|                            | Capped count                    | `notes-container.test.tsx` "60 matches of 70 notes read 50 of 70"                                                                                                                                                                                                           | COMPLIANT |
|                            | Mobile                          | `notes-view.test.tsx` opens from the mobile Search button; `mobile-bar.test.tsx` 44 px; `NotesPage.module.css` back button `--size-target`                                                                                                                                  | COMPLIANT |
| search: States             | States                          | `notes-container.test.tsx`: empty, no-match with the term as text, error with Retry (first load and later), 401 once, loading status                                                                                                                                        | COMPLIANT |
| search: Accessibility      | Screen reader                   | `notes-container.test.tsx` polite live region; one h1; input name from `messages.notes.searchLabel`                                                                                                                                                                         | COMPLIANT |
| search: Tag filter         | Filter combined with search     | `notes-container.test.tsx:246-273` (tag, term and tag in one request, statusline `· #slug`, two-step esc, esc inside the bar, phone Tags and Clear); `notes-view.test.tsx:192` (over the wire); `search-notes.test.ts:223`; `search-route.test.ts`; `search.pg.test.ts:241` | COMPLIANT |
| seed: Note bodies          | Body search on seeded data (C9) | `demo-scenario.test.ts` N1 and N8 bodies verbatim, no invented bodies, C9 over the scenario (through the fake repo, see W5)                                                                                                                                                 | COMPLIANT |
| seed: Idempotency          | Re-run                          | `seed-plan.test.ts` same-day repeat creates 0                                                                                                                                                                                                                               | COMPLIANT |
|                            | Body restored                   | `seed-plan.test.ts:60` seeded-before-bodies user updated once, then unchanged                                                                                                                                                                                               | COMPLIANT |
| today: Statusline          | Counts                          | `statusline.test.tsx`, unchanged and green                                                                                                                                                                                                                                  | COMPLIANT |
|                            | Working hints only              | `keyboard.test.tsx`; `statusline.test.tsx`                                                                                                                                                                                                                                  | COMPLIANT |
|                            | Search hint, no unshipped hints | `notes-view.test.tsx` hint exactly when `/` works; `search-availability.test.tsx` (no hint, no-op while the tag bar is open or a placeholder page loads; works again after)                                                                                                 | COMPLIANT |
| today: Layout and theme    | Themes and mobile               | Slice-2 and slice-3 evidence; new CSS adds no animation. Visual smoke after the rebase is pending (10.2)                                                                                                                                                                    | COMPLIANT |
|                            | Mobile Search button            | `mobile-bar.test.tsx` by-handler render, Search first; `notes-view.test.tsx` mobile open; `mobile-tags.test.tsx` (slice 3) green                                                                                                                                            | COMPLIANT |

**Compliance summary**: 29/29 scenarios compliant, 0 UNTESTED, 0 FAILING. Requirements 13/13. The tag filter is no longer pending.

### CONTRACT coverage (rule 23)

| Row                       | Evidence                                                                                                                                                                                                                                                                                      | Status            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| R12 in All notes          | `docs/CONTRACT.md` R12 states the All-notes filter, "applied before the 50-note cap", "an unknown slug is an empty list, not an error", and the `#`, esc, esc steps. Same commit a2ad9d2 as `search-notes`, `search-route`, `search.pg`, `notes-list`, `notes-container`, `notes-view` tests. | ok                |
| Unknown tag (Decision 15) | CONTRACT R12 keeps slice 3's rule for `/today` ("any other slug is a validation error") and adds the All-notes exception in the same paragraph. The spec and design Decision 15 state the same. Tested by `search-route.test.ts` (200 empty vs 400 malformed).                                | ok                |
| R13                       | Wording changed first in 396fe05 and 76a68f0 with `search-terms.test.ts`, `notes-list.test.ts`, `search-notes.test.ts`                                                                                                                                                                        | ok                |
| R15                       | `search-notes.test.ts`, `search-route.test.ts`, `search.pg.test.ts` (explicit `user_id` plus RLS)                                                                                                                                                                                             | ok                |
| C9                        | Recorded in the CONTRACT table with its proving files; `it.todo` markers stay in `contract.test.ts` by documented choice                                                                                                                                                                      | ok                |
| C11                       | Listing and `401` half recorded; `404` half stays `todo` until slice 4                                                                                                                                                                                                                        | partial by design |

Commit-level check of rule 23: CONTRACT changed in 396fe05, 76a68f0, e01653b and a2ad9d2, each with tests in the same commit. c00fcee (tests only) and c3f3a68 (CSS refactor, covered by the existing `mobile-bar.test.tsx`) change no CONTRACT rule.

### Correctness (static)

| Check                              | Status | Notes                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tag slug validated                 | ok     | `notes-list.ts:11` `z.string().max(40).regex(TAG_SLUG)`; a repeated or malformed tag is a 400 in the route (`server.ts` `notesQuerySchema.safeParse`), after `authenticate`                                                                                                                                                                                                                                     |
| Tag as bound parameter             | ok     | `postgres-note-repository.ts:217` `.where('tags.slug', '=', slug)` through Kysely; no raw SQL carries the slug. The tsquery stays a bound parameter (`:202`) after `tsqueryOf` re-checks every term                                                                                                                                                                                                             |
| Explicit user_id on every table    | ok     | notes `:199`, `note_tags` `:215`, `tags` `:216`, the count `:230`, the tag links `:241`; all inside `asUser` (RLS as second lock)                                                                                                                                                                                                                                                                               |
| Filter before the cap              | ok     | the `exists` is added to the select before `.orderBy(...).limit(...)` (`:204-225`); proven by 5 tagged notes among 55 newer ones (`search.pg.test.ts:248`, `search-notes.test.ts:229`)                                                                                                                                                                                                                          |
| `total` never narrowed             | ok     | the count query (`:227-231`) has no tag or tsquery filter                                                                                                                                                                                                                                                                                                                                                       |
| R15 (no existence leak)            | ok     | an unknown tag and another user's tag both give 200 with an empty list and the caller's own total; a list never confirms a tag                                                                                                                                                                                                                                                                                  |
| Hexagonal inward imports (rule 15) | ok     | `application/search-notes.ts` imports `@onti/shared`, domain and sibling application files only; Kysely and SQL only in infrastructure                                                                                                                                                                                                                                                                          |
| Clock port only (rule 16)          | ok     | no `new Date()` or `Date.now()` in the slice-5 source diff                                                                                                                                                                                                                                                                                                                                                      |
| packages/shared no IO (rule 17)    | ok     | `notes-list.ts` is zod plus `TAG_SLUG` only                                                                                                                                                                                                                                                                                                                                                                     |
| Verified JWT first (rule 18)       | ok     | the `GET /notes` route calls `authenticate` before parsing the query                                                                                                                                                                                                                                                                                                                                            |
| No migration (rule 19)             | ok     | no `supabase/` path in the range                                                                                                                                                                                                                                                                                                                                                                                |
| UI rule 8                          | ok     | no raw hex, `--core-*` or px font size in the added non-test source                                                                                                                                                                                                                                                                                                                                             |
| UI rules 9-11                      | ok     | no vermilion use outside the date block; no `animation` or `transition` added; targets via `--size-target` (`MobileBar.module.css`, `NotesPage.module.css`); the `focus-visible` rule is now shared by `.search`, `.secondary` and `.capture`                                                                                                                                                                   |
| UI rule 12                         | ok     | no literal copy in the added `.tsx`; strings in `messages.ts` (`notes`, `mobile.search`, `statusline.keys.search`, tag hints)                                                                                                                                                                                                                                                                                   |
| UI rule 13                         | ok     | no N1-N15 in `features/notes`, `App.tsx` or `messages.ts`                                                                                                                                                                                                                                                                                                                                                       |
| Plain-text rendering               | ok     | no `dangerouslySetInnerHTML` or `innerHTML` in the added source                                                                                                                                                                                                                                                                                                                                                 |
| Rebase conflict resolutions        | ok     | MobileBar renders `Search · Tags · + Capture`, each by handler, `onCapture` optional (`MobileBar.tsx`); TodayContainer `/` guard covers bar, tag bar, sheet, armed snooze and placeholder page (`TodayContainer.tsx:108-115`); App keeps slice 3's `load(day)` plus the notes view switch; NotesPage passes `isToday` and `note={null}` to the DateColumn (`NotesPage.tsx:51-53`); CONTRACT keeps both sections |
| Commit messages                    | ok     | all 14 conventional; 0 `Co-Authored-By` lines in `origin/main..HEAD` (`git log --format=%B                                                                                                                                                                                                                                                                                                                      | grep -ic co-authored` gives 0) |

### Coherence (design)

| Decision                                                         | Followed? | Notes                                                                                                                                                                                                               |
| ---------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two views in `App`, no router or URL state (Q6)                  | yes       | `view` state in `App.tsx`; reset on sign-out                                                                                                                                                                        |
| Lazy notes view with idle preload (Decision 7)                   | yes       | `React.lazy` plus `requestIdleCallback` with a timer fallback; the slice 3 `TagBar` is lazy too                                                                                                                     |
| Debounce 200 ms, query keyed by term and tag                     | yes       | `NotesContainer.tsx` query key `['notes', term, tag]`; last good list kept                                                                                                                                          |
| Read-only rows (Q7)                                              | yes       | no tabindex or handlers; `x`, `s`, `z` send no request                                                                                                                                                              |
| Stable keyboard listener                                         | yes       | latest handle in a ref, listener keyed on `enabled` (`use-keyboard-layer.ts`)                                                                                                                                       |
| Decision 15: SQL `exists` before the cap, unknown tag 200        | yes       | see Correctness                                                                                                                                                                                                     |
| Decision 15: bar tags = current result plus active tag           | deviates  | the container accumulates every tag any answer carried since the view opened (`NotesContainer.tsx:50-62`, `barTags`); see W2                                                                                        |
| Decision 8: `/` guard `bar === null && sheet === null && !armed` | deviates  | the shipped guard also excludes the tag bar and a placeholder page (`TodayContainer.tsx:108-115`, c00fcee); intended and tested, the design row is stale (W3)                                                       |
| Decision 8: "typing is never intercepted"                        | deviates  | `#` opens the tag bar even from the search input (`NotesContainer.tsx:77-81`); documented in the spec (`specs/notes-search/spec.md:163`) and tested (`notes-container.test.tsx:236`), not in design Decision 8 (S1) |

### Manual smoke

Task 10.2 is pending: the earlier smoke (pre-rebase, 2026-10-08, Playwright on mocked data) covered `/`, mobile Search, `staging` giving N2 and N8, esc, plain-text excerpts, read-only rows, dark mode and reduced motion. A post-rebase smoke including the tag filter is running separately and is not part of this evidence. The real-Postgres run (21/21 on a throwaway database) is reported, not re-run.

### Issues Found

**CRITICAL**: None.

**WARNING**:

- W1. Tasks 10.1-10.4 are open (`tasks.md:139-142`). 10.2 (post-rebase smoke with the tag filter) must finish before the PR; 10.1 needs the session prompts in `prompts/durante/` (the folder ends at `10-slices-3-and-5-in-parallel.md`) and `.engram`. By agreement these are PR-stage work, not apply failures.
- W2. Design Decision 15 and task 9.5 (`design.md:25`, `tasks.md:134`) say the bar tags are "the current result plus the active tag". The shipped behaviour accumulates every tag seen since the view opened (`NotesContainer.tsx:50-62`, tested at `notes-container.test.tsx:256-259`). The behaviour is better (a narrowed list can still switch tags) and is recorded only in apply-progress. Update the design row. The accumulated list can also keep a tag that no longer exists on any note until the view closes (no spec impact).
- W3. Design Decision 8 (`design.md:18`) and the today-page delta (`specs/today-page/spec.md`, "Search hint" scenario: "no capture bar or sheet open, no `s` armed") are stale against c00fcee: `/` and its hint are also off while slice 3's tag bar is open or a placeholder page loads. The same scenario still says "no hint for tag filter or day navigation shows unless that feature has shipped"; both have shipped with slice 3. Behaviour is tested (`search-availability.test.tsx`); only the documents lag.
- W4. `search.pg.test.ts` (21 tests) is skipped in `npm run verify` and in CI. The 21/21 result and the tokenizing table are reported evidence only; fidelity beyond the hand-built stand-ins (no GoTrue, PostgREST or pooler) remains unproven, as in slice 2.
- W5. The seed write path has no runtime test: `apps/api/scripts/seed-demo.ts` (insert and `excluded.body` upsert) is exercised only through `planSeed` and `buildScenario`; the task 5 dry run against the throwaway DB is not evidenced. The "Body search on seeded data" scenario is proven over the fake repo.
- W6. Strict TDD evidence is prose, not a per-task table, and no RED output is preserved. c00fcee and the follow-up A tests pass at once (guards existed); the recorded mutation check stands in for RED.
- W7. Main bundle is 603.98 kB, up from the 591.44 kB slice-5 baseline and from slice 3's own main; the commit 9 body records 603.98 kB. The lazy chunks keep the notes view and tag bar out of main, but the baseline keeps creeping.
- W8. Commit 9 is about 602 changed lines excluding `.engram` (apply-progress), over the 500-line forecast; the single PR carries `size:exception` (accepted).

**SUGGESTION**:

- S1. Add one sentence to design Decision 8 about `#` from the input (search ignores punctuation, so no searchable character is lost), and one clause to CONTRACT R12 if the behaviour should be a product rule. It is documented in the spec and tested, so it is not an undocumented deviation.
- S2. A tag selected with an empty term and zero results would render `No notes match “”.` (`NotesStatus.tsx`, `messages.ts:131`). Reachable only if the tag disappears from every note while selected; consider a tag-aware message.
- S3. Add a CI job with a Postgres service so `search.pg.test.ts` stops being opt-in (already listed in task 10.4).
- S4. Add one script-level check for the `seed-demo` body upsert (dry run against the throwaway DB, output in the PR) to close W5.

### Verdict

PASS WITH WARNINGS

0 CRITICAL, 8 WARNING, 4 SUGGESTION. All 14 commits are green on format, lint, typecheck, 920 tests and the web build; the 5 slice 3 suites (80 tests) pass on this branch; the tag filter is implemented and covered end to end; query security holds (slug validated and bound, explicit `user_id` on notes, `note_tags` and `tags`, filter before the cap, total never narrowed); R12, R13 and R15 are recorded in CONTRACT with their tests in the same commits. Remaining items are PR-stage tasks (10.1-10.4, including the post-rebase smoke) and design or spec wording that lags the shipped behaviour.
