```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:edf7bb06509082974a859dabef173bc5088aa3d1da6448966177d3bf26049c82
verdict: fail
blockers: 1
critical_findings: 0
requirements: 10/10
scenarios: 23/26
test_command: npm run verify
test_exit_code: 0
test_output_hash: sha256:919d0c4145f7ba35c4ca9a969cc97f468bac9dd21a27a46abb9543f4e216f79c
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:93578c255be7317af77e092f742f96ed553f22238bd6295066395a1cca70d076
```

## Verification Report — slice-4-note-editing, PR2 (write side)

**Change**: slice-4-note-editing
**Scope**: PR2 only, commits 68b34da..37e7349 (9 commits, `[PR2]`-tagged scenarios) on branch feat/slice-4-note-editing-write, HEAD 95f6b5e (adds a merge of origin/main 88f30ef, which carries slice 6 and the PR1 merge). PR1 is already verified (`verify-report-pr1.md`).
**Mode**: Strict TDD (runner `npm run test`, run through `npm run verify`)
**Apply-progress**: Engram #1149 (`sdd/slice-4-note-editing/apply-progress`)

### Completeness

| Metric                              | Value                                                    |
| ----------------------------------- | -------------------------------------------------------- |
| PR2 tasks total (2.1.1 to 2.9.3)    | 19                                                       |
| PR2 tasks complete                  | 17                                                       |
| PR2 tasks incomplete                | 2 (2.9.2 manual smoke, 2.9.3 open PR2; both human-owned) |
| PR1 tasks incomplete (out of scope) | 2 (1.9.2, 1.9.3), unchanged                              |

No core implementation task is open. The two open tasks are the human smoke and the PR itself.

### Build and tests execution

**Tests**: PASS (`npm run verify` = format:check, lint, typecheck, tests; exit 0, log hash in the envelope)

- shared: 17 files, 383 passed, 3 todo
- api: 29 files passed, 4 skipped; 452 passed, 45 skipped (the Postgres suites need `ONTI_TEST_DATABASE_URL`)
- web: 57 files, 611 passed

The counts are higher than apply-progress (shared 367, api 345, web 611) only because HEAD includes the slice 6 merge. Web is identical (611).

**Postgres `[pg]`**: skipped in this run. The orchestrator reports the pg tests passed on a throwaway database; apply-progress records 33 passed (note-detail 3, note-update 9, push, search). This phase did not re-run them. Rows covered: `apps/api/test/postgres/note-update.pg.test.ts:107` (title and body only), `:119` (tag links replaced, name kept, new slug named), `:135` (unlinked tag never lists), `:147` (reminder step on the locked row), `:180` (rollback), `:196` (no `updated_at` move), `:205` (two concurrent edits serialise), `:213` (C11 and RLS), `:221` (delete cascades links).

**Build**: PASS (`npm run build`, exit 0; the known PostCSS `from` warning and the >500 kB notice only).

| Asset (gzip)               | PR1 verify | HEAD      |
| -------------------------- | ---------- | --------- |
| `index-*.js` (main)        | 175.76 kB  | 177.01 kB |
| `index-*.css` (main)       | 4.52 kB    | 4.52 kB   |
| `NotesContainer-*.js`      | 3.87 kB    | 5.90 kB   |
| `NotesContainer-*.css`     | n/a        | 2.09 kB   |
| `MarkdownBody-*.js` (lazy) | 37.53 kB   | 37.53 kB  |

Apply-progress measured main JS 176.56 kB (+0.80 kB) before the origin/main merge; the +0.45 kB beyond that at HEAD comes from the slice 6 merge, not from PR2. The lazy chunk grows 3.87 to 5.90 kB (edit form and confirm), as stated. Markdown stays in its own chunk, untouched.

**Coverage**: not available (config `coverage.available: false`).

### TDD compliance

| Check                         | Result | Details                                                                                                                      |
| ----------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| TDD evidence reported         | PASS   | apply-progress has the PR2 table: task, RED test, failure reason, GREEN, triangulation, safety net (all six columns, 9 rows) |
| All tasks have tests          | PASS   | every test file in the evidence exists at HEAD                                                                               |
| RED confirmed (tests exist)   | PASS   | 100% of listed files present                                                                                                 |
| GREEN confirmed (tests pass)  | PASS   | all pass at HEAD in this run                                                                                                 |
| Triangulation                 | PASS   | `it.each` tables (11 reject cases, 7 route 400 cases, 3 forms of 401, 6 blocked-save cases)                                  |
| Safety net for modified files | PASS   | recorded per task ("N passing before")                                                                                       |

Real RED evidence is credible: 19 failed (schema and `clearReminder` missing), 25 of 26 failed (routes were 404), 32 failed (`readDue`, `parseTagList` missing), 15 failed (no confirm), module-level TypeError for the edit form.

### Test layer distribution

| Layer                        | Tests at HEAD         | Tools                                       |
| ---------------------------- | --------------------- | ------------------------------------------- |
| Unit (pure shared, domain)   | shared 383            | vitest                                      |
| Integration (Fastify inject) | api 452 (+45 skipped) | vitest + `app.inject` over fakes; pg manual |
| Component                    | web 611               | vitest + jsdom + Testing Library            |
| E2E                          | 0                     | not available                               |

### Assertion quality

No tautologies, ghost loops or type-only assertions found in the new files read (`note-write-route`, `update-note`, `note-edit`, `note-delete`, `today-edit-key`). Assertions check payloads, calls (`toHaveBeenCalledWith`, `not.toHaveBeenCalled`) and rendered text. Cache refresh is asserted by spying `setQueryData`, `invalidateQueries` and `removeQueries` on a real `QueryClient`, which is a call assertion rather than a rendered-state one (see WARNING 1).

### Spec compliance matrix (PR2-tagged scenarios)

Totals: 10 requirements (note-editing 7; today-page "Edit key on a Today row" and the modified "Statusline" with its `[PR2]` Edit hint; undated-list "Reminder changes move notes") and 26 scenarios (note-editing 22, today-page 3, undated-list 1).

| Requirement                 | Scenario                     | Test                                                                                                                                                                                                            | Result    |
| --------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| PATCH /notes/:id            | Title and body               | `apps/api/test/note-write-route.test.ts:105`; `update-note.test.ts:44`                                                                                                                                          | COMPLIANT |
| PATCH /notes/:id            | Validation                   | `note-write-route.test.ts:149` (blank, 201, body 20001, bad slug, NUL, bad due; each leaves the note unchanged); `packages/shared/test/notes.test.ts:183`                                                       | COMPLIANT |
| PATCH /notes/:id            | Empty body                   | `note-write-route.test.ts:116`; `update-note.test.ts:66`; web `note-edit.test.tsx:139`                                                                                                                          | COMPLIANT |
| PATCH /notes/:id            | Isolation (C11)              | `note-write-route.test.ts:176` (Ana 404), `:185` (unknown and non-UUID 404), `:195` (401: none, Basic, forged, before id and body); `pg:213`                                                                    | COMPLIANT |
| PATCH /notes/:id            | Last write wins              | `note-write-route.test.ts:204`; `pg:205` (row lock, both land)                                                                                                                                                  | COMPLIANT |
| Tag editing                 | Replace tags                 | `note-write-route.test.ts:122`; `update-note.test.ts:78`; `pg:119`, `:135` (unlinked tag never lists)                                                                                                           | COMPLIANT |
| Tag editing                 | New slug                     | `update-note.test.ts:78` (names derived, client name ignored); `pg:119`                                                                                                                                         | COMPLIANT |
| Reschedule and remove       | Reschedule open snoozed note | `update-note.test.ts:106`; `rules.test.ts:101`; `note-write-route.test.ts:129`                                                                                                                                  | COMPLIANT |
| Reschedule and remove       | Reschedule a done note       | `update-note.test.ts:114` and `:126` (equal value still reopens); `note-write-route.test.ts:129`                                                                                                                | COMPLIANT |
| Reschedule and remove       | Remove                       | `update-note.test.ts:131`; `note-write-route.test.ts:139`; web `note-edit.test.tsx:379` (`dueAt: null`)                                                                                                         | COMPLIANT |
| Edit mode                   | Edit and save                | `apps/web/test/note-edit.test.tsx:81`, `:126` (one patch, only changed fields)                                                                                                                                  | COMPLIANT |
| Edit mode                   | Cancel                       | `note-edit.test.tsx:249` (`esc`), `:264`, `:273`; `today-edit-key.test.tsx:81`                                                                                                                                  | COMPLIANT |
| Edit mode                   | Blocked save                 | `note-edit.test.tsx:193` table (blank, long title, long body, bad tag, too many tags, unreadable time) and `:227`                                                                                               | COMPLIANT |
| Edit mode                   | Failure                      | `note-edit.test.tsx:301` (5xx keeps values, one message), `:320` (401), `:329` (404 reloads to not-found), `:282` (pending disables Save)                                                                       | COMPLIANT |
| Delete                      | Confirm                      | `apps/web/test/note-delete.test.tsx:89` (one DELETE, view closes, caches refreshed), `:71`, `:132`, `:144`; `note-write-route.test.ts:220`                                                                      | COMPLIANT |
| Delete                      | Cancel                       | `note-delete.test.tsx:106` (nothing sent, view stays), `:119`                                                                                                                                                   | COMPLIANT |
| Delete                      | API (C11)                    | `note-write-route.test.ts:220` (204 then 404 on GET and repeat), `:229` (Ana 404, note survives), `:237`, `:245` (401); `delete-note.test.ts:18`; `pg:213`                                                      | COMPLIANT |
| Delete                      | `d` elsewhere                | `note-delete.test.tsx:224` (list), `:266` (not a Today key), `:198` (edit mode)                                                                                                                                 | COMPLIANT |
| Keys                        | `e` on Today                 | `apps/web/test/today-edit-key.test.tsx:67`; `keyboard.test.tsx:341`; `keys.test.ts:201`                                                                                                                         | COMPLIANT |
| Keys                        | Typing                       | `note-edit.test.tsx:114`; `keyboard.test.tsx` (capture bar, tag bar: typing `e` inserts the letter)                                                                                                             | COMPLIANT |
| Consistency after writes    | Reschedule onto today        | `note-edit.test.tsx:408` spies the invalidation only; no test renders Today after a write, no count assertion                                                                                                   | PARTIAL   |
| Consistency after writes    | Delete                       | `note-delete.test.tsx:89` spies `removeQueries`/`invalidateQueries` only; no Today render                                                                                                                       | PARTIAL   |
| Edit key on a Today row     | Focused row                  | `today-edit-key.test.tsx:67`; `keyboard.test.tsx:349`                                                                                                                                                           | COMPLIANT |
| Edit key on a Today row     | Capture bar open             | `keyboard.test.tsx:405` area ("off while the capture bar is open: typing e inserts the letter"), `:425`                                                                                                         | COMPLIANT |
| Statusline                  | Edit hint                    | `keyboard.test.tsx` "hints e only while a row is focused and the app can open notes"; `keys.test.ts:223` to `:243`; `note-delete.test.tsx:266` (no `d` on Today)                                                | COMPLIANT |
| Reminder changes move notes | Set and remove               | server derives the undated set from `dueAt` (PR1 `today.test.ts`, `undated.test.ts`) and PATCH sets/clears it (`update-note.test.ts:120`, `:131`), but no test chains PATCH then `GET /today` or a Today render | PARTIAL   |

**Compliance summary**: 23/26 scenarios compliant, 3 PARTIAL, 0 UNTESTED, 0 FAILING.

Two PARTIAL rows are the "Consistency after writes" scenarios and one is the undated "Set and remove". All three hinge on the same claim: after a write, Today and the undated list show the new state and the counts agree. The pieces are each proven (write persisted, caches invalidated, `/today` computed from stored state), but no single test joins them, and the manual smoke 2.9.2 that does is pending.

### Correctness checks requested

| Check                                                                      | Result | Evidence                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PATCH/DELETE 404 (other user, non-UUID), 401, DELETE 204                   | OK     | `note-write-route.test.ts:176`, `:185`, `:195`, `:220`, `:229`, `:237`, `:245`                                                                                                                                                 |
| 400 empty/long title, long body, bad slug; empty body 200                  | OK     | `note-write-route.test.ts:149`, `:116`; schema `notes.test.ts:183`                                                                                                                                                             |
| Last write wins                                                            | OK     | `note-write-route.test.ts:204`; pg `:205` (row lock)                                                                                                                                                                           |
| Editing never touches reminder fields except via R8                        | OK     | `update-note.test.ts:44` (title/body only), `:98` (tags do not touch reminder), `:143` (absent `dueAt` keeps it); pg `:147`                                                                                                    |
| R8: done note reopens; remove clears all; re-arm only on a different value | OK     | `update-note.test.ts:114`, `:126`, `:131`; `rules.test.ts` `clearReminder`, `reschedule`; CONTRACT R8 line 51                                                                                                                  |
| Tags by `#slug`, server-derived names, client name ignored                 | OK     | `update-note.test.ts:78`, `:88`; `note-write-route.test.ts:122`; `parseTagList` in `packages/shared/src/domain/tag.ts`                                                                                                         |
| Hard delete                                                                | OK     | `delete-note.test.ts:18`; route `:220`; pg `:221` (cascades links, keeps tag row and other notes)                                                                                                                              |
| R20 todo to proven with its tests in the same commit (rule 23)             | OK     | 1c6a47b changes `docs/CONTRACT.md` (+15 -11) with `note-write-route.test.ts` (+259); the web half lands with its tests in 30e5fac (CONTRACT +12 with `note-delete.test.tsx`). "Still `todo`" now lists only C15                |
| Query invalidation after mutations                                         | OK     | `note-edit.test.tsx:408` (setQueryData note, invalidate notes and day, remove inactive day), `:424` (failed save refreshes nothing); `note-delete.test.tsx:89`, `:162`, `:174`                                                 |
| Inline confirm copy "Delete? ↵ confirm · esc cancel"                       | OK     | `StatuslineConfirm.tsx`, `messages.note.delete.prompt`; `note-delete.test.tsx:71` (statusline, no modal, view stays)                                                                                                           |
| `esc` in edit discards                                                     | OK     | `note-edit.test.tsx:249`; `today-edit-key.test.tsx:81`; form `onKeyDown` Escape handler                                                                                                                                        |
| Save is a button only, no shortcut (SG20)                                  | OK     | `note-edit.test.tsx:238` (Enter and ctrl+Enter send nothing); `NoteEditForm.tsx:113` `onSubmit` is `preventDefault`, no submit button                                                                                          |
| `e` and `d` only in the note view; `e` on a focused Today row              | OK     | `note-delete.test.tsx:224`, `:266`; `keys.test.ts:201`; `today-edit-key.test.tsx:67`, `:96`                                                                                                                                    |
| CLAUDE.md 8-13 (tokens, no vermilion, motion, 44 px, copy, no IDs)         | OK     | static CSS tests `note-edit.test.tsx:436`, `note-delete.test.tsx:272`; no hex literals in the new `features/note` sources; copy in `messages.ts`                                                                               |
| CLAUDE.md 15-18 (layers, Clock, shared no IO, JWT)                         | OK     | `update-note.ts`/`delete-note.ts` take `now` and the profile timezone from the caller; routes verify the token before the id and body (401 test `:195`); `new Date(...)` in shared only wraps provided values, no `Date.now()` |
| Conventional commits, no attribution                                       | OK     | 9 PR2 commit subjects conventional; no Co-Authored-By in `a23bdb4..HEAD`                                                                                                                                                       |

### Coherence (design)

| Decision                                       | Followed? | Notes                                                                           |
| ---------------------------------------------- | --------- | ------------------------------------------------------------------------------- |
| 21 Edit form (parseTagList, presets, preview)  | Yes       | `NoteEditForm.tsx`; changed fields only                                         |
| 22 Delete confirm as container mode            | Yes       | focus moves off the button so one `↵` deletes once (`note-delete.test.tsx:132`) |
| 24 Design source first (SG20, R20)             | Yes       | landed before PR1; see SG20 evaluation below                                    |
| Deviation 1: pg `updateOwn`/`deleteOwn` in 2.2 | Accepted  | needed for typecheck; annotated in tasks.md 2.3.2                               |
| Deviation 3: `e` hint only with an `edit` flag | Accepted  | stricter than the spec ("hint only where it works"); tested `keys.test.ts:236`  |
| Deviation 5: 404 on save reloads to not-found  | Accepted  | `note-edit.test.tsx:329`                                                        |

### SG20 deviation evaluation (rule 14)

**Fact**: Edit and Delete sit in the note view header beside Back at every width (`NotePage.tsx:78`, `NotePage.module.css:42`). The note says SG20 describes a touch bottom bar.

**Finding**: the SG20 text in `docs/design/style-guide-decisions.md:27` does not say "bottom bar". It reads "on touch an Edit and a Delete button and a Back button". The only bottom bar in the style guide is SG14 (Search, Tags, Capture). The phrase "SG20 describes a bottom bar `Edit · Delete` on touch" comes from `docs/backlog.md:83-85`, which therefore misquotes the source of truth. Header buttons satisfy the SG20 wording, and the spec ("an Edit button, the only way on touch"). The real differences are (a) the buttons also show on desktop, where SG20 implies keys plus hints only, and (b) the backlog entry describes the deviation inaccurately.

**Classification**: WARNING, not CRITICAL. It breaks no behavior in CONTRACT, no spec scenario, no accessibility rule (44 px, focus, tokens all tested), and the mismatch is documentation drift, not a contradiction a reader must resolve before merge. Rule 14 (design source first) is formally met because SG20 landed first; what is left is that SG20 and the shipped layout should say the same thing.

**Fix options** (human decision):

1. Amend SG20 (docs only, cheapest): state that Edit, Delete and Back are header buttons at every width, with the keys and hints as the desktop accelerators; correct the `docs/backlog.md` entry to stop attributing a bottom bar to SG20. No code, no retest. Recommended unless the 375x667 smoke shows reach problems.
2. Move the buttons: render Edit and Delete in a touch-only bottom bar (markup plus CSS in `NotePage`, hide at desktop width, tests for placement and 44 px reach). Costs a few commits and a re-smoke; worth it only if the thumb-reach concern is real.

### Issues Found

**CRITICAL**: None.

**WARNING**:

1. Three scenarios are PARTIAL: "Reschedule onto today", "Delete" (consistency) and undated "Set and remove". Invalidation is asserted by spies, and `/today` derives from stored state, but no test renders Today after a write and checks the counts and the undated list. Close it with one App-level test (reschedule an undated note, Today shows it on the rail, undated count minus one, header count plus one; then remove the reminder and see it back), or by recording the 2.9.2 smoke result. This is the reason the machine envelope is `fail` (see Verdict).
2. SG20 versus header buttons (above): header placement at every width, backlog entry misquotes SG20.
3. Manual smoke 2.9.2 is pending (HUMAN): both viewports, light/dark, edit, empty-body save, reschedule onto today, remove reminder, delete confirm and cancel, `e` from Today.
4. PR2 size: about 3,370 changed lines (53 files, +3,249 -122, excluding `.engram` and the lockfile) against a ~1,660 forecast; about 60% is tests. `size:exception` covers it; reviewers should read commit by commit.
5. `[pg]` tests are not in CI and were not re-run in this phase (skipped, 45 at HEAD). The orchestrator reports 33 of 33 passing on a throwaway database; the new write SQL (row lock, tag upsert, cascade) is only proven there. Deploy order: Railway before Vercel (new PATCH and DELETE routes).
6. Branch hygiene: HEAD contains a merge of origin/main (slice 6 and PR1), so `git diff` against the branch base is larger than PR2. The PR diff must be taken against the merged base to show only PR2.
7. Known timing risk from PR1: web `note-open-flow` tests use a 20 s timeout. Not a PR2 regression; the full web suite ran in 37 s here.

**SUGGESTION**:

1. Add the Today-after-write test from WARNING 1 so the consistency requirement is proven by one runtime test instead of three pieces.
2. Add an API-level `PATCH` then `GET /today` test (undated set, counts) to complete the server half of R19/R20 cheaply.
3. Fix `docs/backlog.md:83-85` wording whichever SG20 option is chosen.
4. Consider a one-line note in `docs/CONTRACT.md` R20 row that the pg suites are manual, as already done for C2.

### Verdict

**Human verdict: PASS WITH WARNINGS.** `npm run verify` and `npm run build` exit 0 at 95f6b5e. 0 CRITICAL, 7 WARNING, 4 SUGGESTION. Every behavior the request listed holds: PATCH/DELETE status codes and isolation, last write wins, R8 reopen and remove, server-derived tag names, hard delete, R20 proven in the same commit as its tests, invalidation after mutations, the inline confirm copy, `esc` discards, Save as a button only, `e` and `d` scoping, rules 8-13 and 15-18, and conventional commits without attribution.

**Machine envelope: `verdict: fail`, `blockers: 1`, `critical_findings: 0`.** The admission validator (`gentle-ai sdd-verify-validate`) refuses a passing verdict while completed counts are below totals, and 3 of 26 PR2 scenarios are PARTIAL (WARNING 1). This is incomplete evidence, not a failing test. Same convention as `verify-report-pr1.md`. Close WARNING 1 (one test or the 2.9.2 smoke), re-run verify for a `pass_with_warnings` envelope, then archive after the SG20 decision.
