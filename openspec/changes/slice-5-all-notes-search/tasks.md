# Tasks: Slice 5 — All notes and text search

## Review Workload Forecast

| Field                   | Value                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| Estimated changed lines | ~2,125 incl. tests and docs (c1 160, c2 388, c3 183, c4 140, c5 79, c6 260, c7 431, c8 221, c9 263)      |
| 400-line budget risk    | High (800 review budget also exceeded; commits 2, 7, 8, 9 are the riskiest)                              |
| Chained PRs recommended | No (human approved one PR, 2026-10-08, Engram #1097; commit-by-commit reading replaces the chain)        |
| Suggested split         | Single PR, 9 ordered work-unit commits, 3 apply batches (c1-5 ~950, c6-8 ~912, c9 ~263 after the rebase) |
| Delivery strategy       | exception-ok                                                                                             |
| Chain strategy          | size-exception                                                                                           |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

Reason for "No": `size:exception` is already accepted. Re-forecast commits 2, 7 and 8 at task time; if one passes ~450 lines, trim CSS and copy first, not a new decision unless the split changes.

Global checks for every commit:

- `npm run verify` green before the commit (rule 22); never `--no-verify`; husky hooks run in this worktree.
- Conventional message, NO `Co-Authored-By` or AI attribution (rule 5). Stage files by explicit path only.
- Tests and docs in the same commit. CONTRACT wording first, with its tests in the same commit (rule 23).
- Web: tokens only, strings in `messages`, targets >= `--size-target`, no internal IDs in UI (rules 8-13). Record `vite build` main JS size (baseline 591.44 kB) in every web commit message body or PR notes.
- Order inside each commit: RED test, then GREEN code, then refactor. Record red before green.
- Save prompts in `prompts/durante/` (rule 7). No push without asking the human (rule 6).

### Suggested Work Units

| Unit | Goal                                   | Focused test command                                           | Runtime harness                                           | Rollback boundary                                 |
| ---- | -------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------- |
| 1    | R13 prefix wording, pure domain        | `npm run test -w @onti/api`                                    | N/A (pure functions)                                      | `search-terms.ts`, `excerpt.ts`, tests, CONTRACT  |
| 2    | Shared schema, port, adapter, use case | `npm run test -w @onti/shared` and `-w @onti/api`              | N/A (fake repo; adapter proven in unit 3)                 | `notes-list.ts`, `search-notes.ts`, adapter, port |
| 3    | Real-Postgres characterization         | `ONTI_TEST_DATABASE_URL=<throwaway> npm run test -w @onti/api` | Throwaway local Postgres 16 + stand-ins                   | `test/postgres/*` only                            |
| 4    | `GET /notes` route                     | `npm run test -w @onti/api`                                    | Fastify `inject`; `curl` against local API                | route, `ServerDeps.searchNotes`, `main.ts` line   |
| 5    | Seed bodies N1, N8                     | `npm run test -w @onti/api`                                    | `seed-demo` dry run against the throwaway DB              | seed scripts and tests                            |
| 6    | Read-only rows and list                | `npm run test -w @onti/web`                                    | N/A (no entry point yet)                                  | `features/notes/{NoteRow,NoteList,format}`        |
| 7    | Notes container and states             | `npm run test -w @onti/web`                                    | Dev server with test mount is not available; RTL only     | `features/notes/*` container files, `api.ts`      |
| 8    | Entry points (`/`, Search button)      | `npm run test -w @onti/web`                                    | `npm run dev -w @onti/web` vs API at 1280x720 and 375x667 | `App.tsx`, `MobileBar`, `DayPage`, hint           |
| 9    | All-notes tag filter (after slice 3)   | `npm run test -w @onti/shared`, `-w @onti/api`, `-w @onti/web` | Dev server: `#`, tag, two-step `esc`                      | `tag` param, `#` key, tests (reverts alone)       |

## Commit 0: Branch

- [x] 0.1 Work on `feat/slice-5-all-notes-search` (already checked out); PR targets `main`.

## Batch 1 (commits 1-5, ~950 lines)

### Commit 1: `docs:`+`test:` R13 word-prefix, domain (~160 lines)

- [x] 1.1 `docs/CONTRACT.md`: R13 word-prefix wording ONLY (no "50 / newest first" sentence yet; that is commit 2).
- [x] 1.2 RED: `apps/api/test/search-terms.test.ts`: split on punctuation, lowercase, dedupe, cap 8, `''`/spaces/`???` give `[]`, NFC accents, every operator char (`' " \ & | ! : ( ) < >`, `-`) disappears.
- [x] 1.3 RED: `apps/api/test/excerpt.test.ts`: newline collapse, 120 UTF-16 units incl. `…`, word cut in last 40 units, exactly 120 untouched, no cut between surrogate halves, empty gives `''`.
- [x] 1.4 GREEN: `apps/api/src/domain/search-terms.ts` and `excerpt.ts` (Decisions 2, 4). No IO, no framework imports (rule 15).
- [x] 1.5 `npm run verify`; commit `docs:`/`test:` style message (e.g. `feat(api): word-prefix search terms and excerpts`).

### Commit 2: `feat(api):` shared contract, port, adapter, use case (~388 lines)

- [ ] 2.1 `docs/CONTRACT.md`: add "max 50, newest first, no pagination or highlighting" to R13 first (rule 23).
- [ ] 2.2 RED: `packages/shared/test/notes-list.test.ts`: `z.encode` round trip, 51 notes rejected, excerpt 121 rejected, `q` 201 rejected, emoji-heavy body via `excerptOf` passes `notesListResponseSchema`.
- [ ] 2.3 GREEN: `packages/shared/src/notes-list.ts` (`SEARCH_LIMITS`, `notesQuerySchema`, `noteListItemSchema`, `notesListResponseSchema`); export at the END of `index.ts`.
- [ ] 2.4 RED: `apps/api/test/search-notes.test.ts`: C9 on `jorge-week` + N1/N8 bodies (`staging`, `STAGING`, `stag` give N2 and N8), body-only (`collaborators` gives N1), AND of terms, empty `q` newest first, cap 50 with total 60, `total` not narrowed (2 matches / total 15; no match / total 15), R15 (Ana sees 0 of Jorge's), operator input never throws, tz fallback `UTC`, clock read once. No assertions on `client`, `example`, `web`.
- [ ] 2.3b GREEN: `application/ports.ts` (`NoteListRow`, `searchOwn`, appended), `test/fakes.ts` (`InMemoryNotes.searchOwn`, one-line `failingNotes` update), `application/search-notes.ts`.
- [ ] 2.5 GREEN: `infrastructure/db/database.ts` (`body`, `created_at`, `search` columns) and `postgres-note-repository.ts` `searchOwn` + `tsqueryOf` (bound parameter, per-term `/^[\p{L}\p{N}]+$/u` re-check).
- [ ] 2.6 `npm run verify`; commit.

### Commit 3: `test(api):` real-Postgres characterization (~183 lines)

- [ ] 3.1 Create a THROWAWAY local Postgres 16 database using the scripts in `/private/tmp/claude-501/-Users-jdd-Projects/4da8b503-aa94-4d3f-b0a2-0740dac2259d/scratchpad/db-checks/`. Never the hosted database, never `apps/api/.env`.
- [ ] 3.2 `apps/api/test/postgres/standins.sql` (roles, `auth.users`, `auth.uid`; migration commands in header).
- [ ] 3.3 RED/characterize: `apps/api/test/postgres/search.pg.test.ts` with `describe.skipIf(!process.env.ONTI_TEST_DATABASE_URL)`: C9 with Ana's decoy, case, prefix, body-only `collaborators`/`release` give N1, AND, `created_at desc`, 60 rows give 50 and total 60, total counts only caller's notes, `body_head` <= 400, hostile term array rejected, RLS path via `asUser`.
- [ ] 3.4 Pin the measured tokenizing table: host `staging.client-b.example` one token; `client-a` -> `client`, `a`; `/web` file token (`web` no match on N1); `collab:*`/`COLLAB:*` match; `'client':* & 'b':*`, `example:*`, `web:*` no match; `²`/`Ⅻ` give 200 empty list, no error.
- [ ] 3.5 Run once with `ONTI_TEST_DATABASE_URL` set (paste output for the PR) and once unset (skipped). Update the design limits only if a row differs.
- [ ] 3.6 `npm run verify` (test skipped without the variable); commit.

### Commit 4: `feat(api):` GET /notes route (~140 lines)

- [ ] 4.1 RED: `apps/api/test/search-route.test.ts` (Fastify `inject`): 200 shape round trips the schema; C11 no token 401, forged token 401, Ana lists 0 of Jorge's; 400 for `q` over 200 and repeated `q`; `?q=` equals no filter; 500 hides internals; CORS allows GET.
- [ ] 4.2 GREEN: `infrastructure/http/server.ts` route; `ServerDeps.searchNotes` added LAST; `main.ts` wiring on its own line.
- [ ] 4.3 `docs/CONTRACT.md`: status for C9 and the listing half of C11 (404 half stays `todo`).
- [ ] 4.4 `npm run verify`; commit.

### Commit 5: `feat(seed):` N1 and N8 bodies (~79 lines)

- [ ] 5.1 RED: `seed-plan.test.ts` (empty-body user is "updated" once, then "unchanged"), `demo-scenario.test.ts` (N1 and N8 carry dataset bodies verbatim; `staging` over `buildScenario` gives N2 and N8).
- [ ] 5.2 GREEN: `apps/api/scripts/demo-scenario.ts` (`ScenarioNote.body?`), `seed-plan.ts` (`DesiredNote.body`, `ExistingState.notes[].body`, body compare), `seed-demo.ts` (`readExisting` selects `body`; insert and `excluded.body` upsert). Bodies from `docs/product/scenario-dataset.md` only; none invented.
- [ ] 5.3 `npm run verify`; commit.

## Batch 2 (commits 6-8, ~912 lines)

### Commit 6: `feat(web):` read-only rows and list (~260 lines)

- [ ] 6.1 RED: `apps/web/test/notes-format.test.ts` (`dueLabel`: year only when different, timezone) and `notes-row.test.tsx` (done strike, tags, due, excerpt as text: `<img src=x onerror=alert(1)>` renders literally, hidden "done", no tabindex or handlers).
- [ ] 6.2 GREEN: `features/notes/{format.ts,NoteRow.tsx,NoteList.tsx}` + CSS Modules (tokens only), `messages.ts` `notes` group (append-only).
- [ ] 6.3 `npm run verify`; record bundle size; commit.

### Commit 7: `feat(web):` container, page, input, statusline (~431 lines)

- [ ] 7.1 RED: `apps/web/test/api.test.ts` (`searchNotes` URL encoding, 401 typed `UnauthorizedError`); `use-debounced-value` with fake timers.
- [ ] 7.2 RED: `notes-container.test.tsx`: input found by accessible name `messages.notes.searchLabel`; loading `role="status"`; first-load error and Retry; error after success keeps input and text; 401 once; empty and no-match copy; debounce (one request per pause, previous list kept); statusline `SEARCH · term · n of 15` and `SEARCH · all notes · 15 of 15`; hints switch with focus; 70 notes/60 match gives `50 of 70`; polite hidden live line.
- [ ] 7.3 GREEN: `lib/api.ts` `searchNotes` (appended), `use-debounced-value.ts`, `NotesContainer`, `NotesPage` (`composes` from `DayPage.module.css`), `NotesStatus`, `SearchInput` (`aria-label`, `maxLength` from `qMax`), `SearchStatusline`, CSS; optional `DateColumn.otherCount`.
- [ ] 7.4 `npm run verify`; record bundle size; commit.

### Commit 8: `feat(web):` entry points (~221 lines, HIGH risk)

- [ ] 8.1 RED: `notes-view.test.tsx` and `mobile-bar.test.tsx`: `/` opens and focuses; `esc` and "Back to today" return; `/` ignored in capture bar and while `s` armed; `x`, `s`, `z` in notes view change nothing and send no request; Today hint lists `/ search` also with no rows (bar null, sheet null, not armed); mobile Search opens; `MobileBar` renders by handler; sign-out resets view.
- [ ] 8.2 GREEN: `App.tsx` (`view` state, `React.lazy`, idle preload, `Suspense fallback={null}`); `TodayContainer` `/` hook + `search` hint; `keys.ts` `KeyHint 'search'` (one line); `DayPage`/`MobileBar` `onSearch`; `messages.ts` `mobile.search`, `statusline.keys.search`.
- [ ] 8.3 If slice 3 has already merged, rebase first (see 9.0) and take its `MobileBar` by-handler version; otherwise include the by-handler change here.
- [ ] 8.4 `npm run verify`; record `vite build` sizes (main vs 591.44 kB baseline, lazy chunk); commit.
- [ ] 8.5 Manual smoke at 1280x720 and 375x667 (`/`, `staging` gives N2 and N8, `collaborators` gives N1, esc, mobile Search, reduced motion). Note the missing design board for visual confirmation.

## Batch 3 (commit 9, ~263 lines, own batch after the rebase)

### Gate: rebase onto main after slice 3 merges

- [ ] 9.0 Wait for slice 3 on `main`. `git fetch` then `git rebase origin/main` with `rerere` on; do it ONCE, before commit 9. Expected conflicts and resolution:
  - `messages.ts`: keep both; `search` beside slice 3's keys.
  - `keys.ts`: union of `KeyHint` values.
  - `MobileBar.tsx` (+ CSS): take slice 3's version, add only `onSearch`, Search first (SG14).
  - `TodayContainer.tsx`, `DayPage.tsx`: re-apply the `/` hook; guard also checks slice 3's open bars.
  - `App.tsx`: keep slice 3's `load`; view branch unchanged.
  - `server.ts`, `main.ts`, `index.ts`, `api.ts`: keep both blocks.
  - After the rebase run `npm run verify` and re-run Batch 1-2 test suites before touching commit 9.

### Commit 9: `feat:` All-notes tag filter (~263 lines)

- [ ] 9.1 Re-check the `TagBar` and `filterByTag` APIs from slice 3 (Open Question 4); adjust the plan only if they differ.
- [ ] 9.2 `docs/CONTRACT.md`: All-notes tag filter text first (rule 23); C9/C11 status if not done.
- [ ] 9.3 RED: shared schema (`tag` validated with `TAG_SLUG`), fake and use case (filter before the 50 cap; unknown tag gives empty list, 200), route (`?q=&tag=`), real-Postgres `exists` over `note_tags` -> `tags.slug`.
- [ ] 9.4 RED: web `notes-view.test.tsx`: `#` opens the bar; tag filters results; with a tag active the first `esc` clears the tag and closes the bar, the next `esc` leaves; `#` hint in notes statusline.
- [ ] 9.5 GREEN: `notes-list.ts`, port, `search-notes.ts`, `postgres-note-repository.ts` SQL `exists`, fake; web reuses `TagBar` and `filterByTag`, tag state in `NotesContainer`, bar tags = current result plus active tag.
- [ ] 9.6 `npm run verify`; run the Postgres test with `ONTI_TEST_DATABASE_URL` (throwaway DB); record bundle size; commit.

## PR

- [ ] 10.1 Save the session prompts in `prompts/durante/` (rule 7), numbered with an intent header.
- [ ] 10.2 Manual smoke again at 1280x720 and 375x667 including the tag filter; paste the Postgres output and bundle sizes.
- [ ] 10.3 ASK the human before pushing (rule 6; approval covers that one push). Then open the PR to `main`, label `size:exception`.
- [ ] 10.4 PR description: commit-by-commit reading guide (order 1 to 9, risk per commit, "API first"), the smoke checklist, the documented tokenizing limits, and the follow-up for a CI Postgres job.
