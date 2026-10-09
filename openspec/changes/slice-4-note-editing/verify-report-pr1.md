```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:0b5a4c1e6a7d9f3b1d2c8e4f5a6b7c8d9e0f1a2b3c4d5e6f708192a3b4c5d6e7
verdict: fail
blockers: 1
critical_findings: 0
requirements: 17/20
scenarios: 29/33
test_command: npm run verify
test_exit_code: 0
test_output_hash: sha256:6ee1796040e34c6eeafe63857d396371ee53b2818abba0aabb5361f4ab755b9c
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:cdd2f8e8fd72a59ef204d1f375465158f99e0b37d394ee35998e4c490a8dce94
```

## Verification Report — slice-4-note-editing, PR1 (read side)

**Change**: slice-4-note-editing
**Scope**: PR1 only, commits 3b70af6..a23bdb4 on top of planning 9549aef (HEAD a23bdb4, branch feat/slice-4-note-editing). Scenarios tagged `[PR2]` are out of scope and listed as deferred, not failed.
**Mode**: Strict TDD (runner `npm run test`, run through `npm run verify`)
**Apply-progress**: Engram #1149 (`sdd/slice-4-note-editing/apply-progress`)

### Completeness

| Metric                                   | Value                                                    |
| ---------------------------------------- | -------------------------------------------------------- |
| PR1 tasks total (1.1.1 to 1.9.3)         | 29                                                       |
| PR1 tasks complete                       | 27                                                       |
| PR1 tasks incomplete                     | 2 (1.9.2 manual smoke, 1.9.3 open PR1; both human-owned) |
| PR2 tasks (2.1.1 to 2.9.3), out of scope | 16, untouched, deferred                                  |

### Build and tests execution

**Build**: PASS (`npm run build`, exit 0). Only the known PostCSS `from` warning and the >500 kB chunk notice, both pre-existing in kind.

| Asset (gzip)                | Size      |
| --------------------------- | --------- |
| `index-*.js` (main)         | 175.76 kB |
| `index-*.css` (main)        | 4.52 kB   |
| `MarkdownBody-*.js` (lazy)  | 37.53 kB  |
| `MarkdownBody-*.css` (lazy) | 0.34 kB   |
| `NotesContainer-*.js`       | 3.87 kB   |

Against origin/main (orchestrator facts, matched by this build): main JS +0.92 kB, main CSS +0.17 kB, markdown only in the lazy chunk. The lazy JS reads 37.53 kB in this build (apply-progress said 37.19, orchestrator said about 37.2); the difference is immaterial and not a regression of the split.

**Tests**: PASS (`npm run verify` = format:check, lint, typecheck, tests; exit 0)

- shared: 16 files, 315 passed, 3 todo
- api: 17 files passed, 2 skipped; 297 passed, 24 skipped (the Postgres suites, need `ONTI_TEST_DATABASE_URL`)
- web: 54 files, 536 passed

**Postgres `[pg]`**: 24 tests are skipped in this run. The orchestrator reports they passed on a throwaway database (apply-progress says the same for `note-detail.pg.test.ts`); this phase did not re-run them. Rows covered: `apps/api/test/postgres/note-detail.pg.test.ts:77` (body, createdAt, tags by slug), `:86` (plain note), `:90` (C11, another user and unknown id are both null).

**Coverage**: not available (config `coverage.available: false`).

### TDD compliance

| Check                         | Result  | Details                                                                                                    |
| ----------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| TDD evidence reported         | PARTIAL | apply-progress has a per-task RED test / failure reason / GREEN list, no Triangulate or Safety Net columns |
| All tasks have tests          | PASS    | every test file named in the evidence exists in 9549aef..HEAD                                              |
| RED confirmed (tests exist)   | PASS    | 100% of listed files present                                                                               |
| GREEN confirmed (tests pass)  | PASS    | all pass at HEAD in this run                                                                               |
| Triangulation                 | PASS    | `it.each` tables (hostile links, tiebreaks, 401 forms); C13/C14 plus smaller worlds                        |
| Safety net for modified files | UNKNOWN | not recorded; the verify gate was green on every commit per apply-progress                                 |

Notable RED evidence: the premise test (default react-markdown shows raw HTML as text) passed before being relied on; RED after wiring exposed the sanitizer dropping raw nodes, which led to `rawToText`. Task 1.7 restored strict parity equality (RED) after 1.6 temporarily ignored the undated block.

### Test layer distribution

| Layer                        | Tests (HEAD)             | Tools                                         |
| ---------------------------- | ------------------------ | --------------------------------------------- |
| Unit (pure shared, domain)   | shared 315               | vitest                                        |
| Integration (Fastify inject) | api 297 (+24 pg skipped) | vitest + `app.inject`                         |
| Component                    | web 536                  | vitest + jsdom + Testing Library + user-event |
| E2E                          | 0                        | not available                                 |

### Assertion quality

No tautologies, no assertion-free tests, no smoke-only tests found in the PR1 files.

| File                                                                                      | Line  | Pattern                                                                     | Severity                                                                        |
| ----------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `apps/web/test/markdown-body.test.tsx`                                                    | 86-92 | `for` loop over `querySelectorAll('a')` can be empty for most rows          | SUGGESTION (companion tests assert anchors at 113-124)                          |
| `note-view.test.tsx:156`, `notes-row.test.tsx:91,97`, `undated-list.test.tsx:177,186,199` | n/a   | `[static]` tests read CSS or source text (tokens only, 44 px, no vermilion) | SUGGESTION (they encode CLAUDE.md rules 8-13; implementation-coupled by design) |

### Spec compliance matrix (PR1-tagged only)

Counted from the retrieved specs: 20 PR1 requirements, 33 PR1 scenarios (markdown-rendering 5/7, note-view 6/12, notes-search 2/3, reminder-actions 1/1, today-page 2/2, undated-list 4/8). Result tags: COMPLIANT = covering test passed at runtime.

#### markdown-rendering

| Scenario                       | Test                                                                                                                                           | Result    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Subset                         | `markdown-body.test.tsx:23`                                                                                                                    | COMPLIANT |
| Image tag (C10)                | `markdown-body.test.tsx:47` (alert spy, no img, no handler); `note-view.test.tsx:93` (end to end)                                              | COMPLIANT |
| Allowed and blocked            | `markdown-body.test.tsx:82` (19 hostile cases), `:96` and `:113` (anchor, rel, target)                                                         | COMPLIANT |
| Image syntax                   | `markdown-body.test.tsx:107`, hostile table rows                                                                                               | COMPLIANT |
| Fallback (pending, then fails) | `markdown-body.test.tsx:172`; `note-body-failure.test.tsx:13` (mocked import throws)                                                           | COMPLIANT |
| Main chunk `[build]`           | build run: markdown in a separate lazy chunk (yes); main chunk unchanged (no, +0.92 kB gzip JS, +0.17 kB CSS); `bundle-split.test.ts:21,28,36` | PARTIAL   |
| Strip (excerpt)                | `plain-text.test.ts:6`, `excerpt.test.ts:48`                                                                                                   | COMPLIANT |

#### note-view

| Scenario                          | Test                                                                                                                                                                                         | Result         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Own note                          | `note-route.test.ts:69`, `get-note.test.ts:40`, `postgres/note-detail.pg.test.ts:77` [pg]                                                                                                    | COMPLIANT      |
| Another user (C11)                | `note-route.test.ts:82` (404, no title in body), `:99-106` (401: no header, Basic, forged); `get-note.test.ts:77`; pg `:90` [pg]                                                             | COMPLIANT      |
| Malformed id                      | `note-route.test.ts:89` (`N1`, `not-a-uuid`, `123`, unknown uuid: same 404, never 500); `:99` 401 wins before the id                                                                         | COMPLIANT      |
| Row opens the view                | `note-open-flow.test.tsx:107` (click) and `:134` (Enter), `notes-row.test.tsx:62`                                                                                                            | COMPLIANT      |
| Old undated note                  | `undated-list.test.tsx:138` (Today row calls `onOpenNote(id)`); `note-open-flow` and `api.test.ts` fetchNote (by id). The App-level chain Today row to note view is not asserted in one test | PARTIAL        |
| Refresh                           | no direct test; `App.tsx:32` starts at `TODAY`, `AppView` carries no URL state; `note-open-flow.test.tsx:153` (sign-out resets to Today) covers the reset                                    | PARTIAL        |
| Content                           | `note-view.test.tsx:62,79,86`                                                                                                                                                                | COMPLIANT      |
| Read-only keys                    | `note-view.test.tsx:141` (no request sent)                                                                                                                                                   | COMPLIANT      |
| Two steps                         | `note-open-flow.test.tsx:107` (same search kept, then Today); Back `:134`                                                                                                                    | COMPLIANT      |
| States (loading, 404, 5xx, 401)   | `note-view.test.tsx:57,102,111,123`; `query-client.test.ts` (404 not retried)                                                                                                                | COMPLIANT      |
| Focus and hints                   | `note-view.test.tsx:74` (focus on h1), `:129` (esc only)                                                                                                                                     | COMPLIANT      |
| Look on both viewports `[manual]` | task 1.9.2 not run                                                                                                                                                                           | MANUAL-PENDING |

#### notes-search (delta)

| Scenario          | Test                                                                                       | Result    |
| ----------------- | ------------------------------------------------------------------------------------------ | --------- |
| Marked word (R13) | `search-notes.test.ts:99` (`stag` finds `**staging**`, excerpt without markers)            | COMPLIANT |
| Markers stripped  | `excerpt.test.ts:48`, `plain-text.test.ts:6`, `notes-row.test.tsx:54` (no element created) | COMPLIANT |
| Row opens note    | `notes-row.test.tsx:62`, `note-open-flow.test.tsx:107`                                     | COMPLIANT |

Untagged scenarios of the modified requirement (HTML as text, rows action-free) are also covered: `excerpt.test.ts:53`, `notes-row.test.tsx:54,62`.

#### reminder-actions and today-page (deltas)

| Scenario                 | Test                                                                                                                                                                                                         | Result               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| Undated parity (C14)     | `today-patch.test.ts` (undated parity block, C14, replacesId, snooze/done/undo untouched); `day-parity.test.ts` (strict equality with the real use case)                                                     | COMPLIANT            |
| Undated set (today-page) | `apps/api/test/today.test.ts` (R19, C13, C14 block); `shared/test/today.test.ts`                                                                                                                             | COMPLIANT            |
| Coexistence (C13)        | `undated-list.test.tsx:127` (header "Without a reminder · 9" in the column) plus `day-page.test.tsx:20` ("11 other notes on the back of the pad") from the same fixture; no single test asserts both strings | COMPLIANT (composed) |

#### undated-list

| Scenario                    | Test                                                                                                                                                             | Result    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Wed 09:05 (C13)             | `apps/api/test/today.test.ts` ("C13 · Wed 7 09:05: 9, 8 rows, still 11 other")                                                                                   | COMPLIANT |
| Independence                | `apps/api/test/today.test.ts` (same set for any day and a tag filter); `undated-list.test.tsx:171`                                                               | COMPLIANT |
| Rows and more (C13)         | `undated-list.test.tsx:46,62,78`                                                                                                                                 | COMPLIANT |
| Empty                       | `undated-list.test.tsx:62`                                                                                                                                       | COMPLIANT |
| Row and more open All notes | `undated-list.test.tsx:83,94,138`                                                                                                                                | COMPLIANT |
| Mobile (C13)                | `undated-list.test.tsx:113,122`                                                                                                                                  | COMPLIANT |
| Capture (C14)               | `capture-flow.test.tsx` (C14 "Export format questions #client-b": first, 10, "+ 2 more", equal after settling); `undated.test.ts:120,128`; `today-patch.test.ts` | COMPLIANT |
| Failure                     | `capture-flow.test.tsx` (failed capture rolls list and count back)                                                                                               | COMPLIANT |

**Compliance summary**: 29/33 PR1 scenarios COMPLIANT, 3 PARTIAL (Main chunk, Old undated note, Refresh), 1 MANUAL-PENDING (Look on both viewports), 0 FAILING, 0 UNTESTED.

**Requirements complete**: 17/20. Not complete: Lazy loading (Main chunk partial), Entry points (two partial), Accessibility and theme (manual pending).

**Deferred to PR2 (not failed)**: note-editing (PATCH, tag editing, reschedule, edit mode, delete, keys, consistency after writes), today-page `e` hint and "Edit key on a Today row", undated-list "Reminder changes move notes".

### Ordering and parity checks requested

- Undated ordering (`packages/shared/src/domain/undated.ts`): `createdAt` descending, then title by UTF-16 code unit (no `localeCompare`), then id; tests `undated.test.ts:39,78,87,92`.
- Count above 8: `undated.test.ts:39` (9 notes, 8 rows), `:97` (count of all, items capped), `:148` (a note past the limit raises the count only); web `capture-flow` C14 (10, "+ 2 more").
- Capture without a time: `today-patch.test.ts` ("a capture without a time goes first, 9 becomes 10, 8 rows"), `undated.test.ts:155` replacesId (count unchanged), `day-parity.test.ts` strict equality with the server use case, `capture-flow.test.tsx` rollback.

### Correctness (static evidence)

| Area                                | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R14 raw HTML is text (C10)          | Implemented | `MarkdownBody.tsx`: no `rehype-raw`, no GFM (asserted by `bundle-split.test.ts:36`). `rawToText` runs first in `rehypePlugins` and walks the whole tree recursively, so every `raw` node (block, inline, nested) becomes `text` before `rehype-sanitize` sees it. No other rendering path exists: `NoteBody` renders either `MarkdownBody` or `PlainBody` (a text node), and excerpts are text nodes. No `dangerouslySetInnerHTML` introduced (grep clean). |
| R14 link and image allowlist        | Implemented | Three locks: `urlTransform` (absolute http, https, mailto only; relative and protocol-relative blank), sanitizer schema (`href` protocols, `img` removed from tag names), `disallowedElements=['img']`. The `a` component always sets `rel="noopener noreferrer"` and `target="_blank"`; a blocked link renders a `span` with its text.                                                                                                                     |
| C11 `GET /notes/:id`                | Implemented | `noteIdOf` (`z.uuid()`) throws `NotFoundError` for a non-UUID; `authenticate` runs first so 401 wins; `findOwn` filters by `user_id` plus RLS; response omits `notifiedDueAt`; the 500 path does not leak the failure.                                                                                                                                                                                                                                      |
| Excerpt stripping, raw search (R13) | Implemented | `markdownToPlainText` is linear and line-based (20,000-char hostile input test `plain-text.test.ts:56`); search still hits the raw body.                                                                                                                                                                                                                                                                                                                    |
| Optimistic parity                   | Implemented | `insertUndated` shares `compareUndated` with `selectUndated`, so server and client agree.                                                                                                                                                                                                                                                                                                                                                                   |
| CONTRACT updates (rule 23)          | Implemented | C10, C11 (404), R14, R19, C13, C14 moved to proven with test paths in the commits that land the tests; R20 stays `todo` for PR2.                                                                                                                                                                                                                                                                                                                            |

### CLAUDE.md compliance (rules 8-13, 15-18)

| Rule                                | Result | Evidence                                                                                                                                           |
| ----------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8 tokens only                       | PASS   | New CSS modules use `var(--color-*)` and `var(--size-target)`; the only literals are `1px` rules and the visually-hidden 1px box; no `--core-*`    |
| 9 vermilion for the date block only | PASS   | no `--color-date` in new CSS (the one hit in `DateColumn.module.css` is the existing date block); `[static]` tests assert it                       |
| 10 reduced motion                   | PASS   | no animation or transition added                                                                                                                   |
| 11 44 px targets, visible focus     | PASS   | `NoteRow` and `UndatedList` use `min-height: var(--size-target)`; `:focus-visible` on rows, title, back, links; `[manual]` visual check pending    |
| 12 no hardcoded copy                | PASS   | grep of added JSX finds no literal strings; copy in `messages.ts` (+19 lines); `undated-list.test.tsx:177` asserts it                              |
| 13 no internal IDs                  | PASS   | no `N1-N15` in `apps/web/src`; `note-view.test.tsx:79` and `undated-list.test.tsx:102` assert it                                                   |
| 15 hexagonal layers                 | PASS   | `get-note.ts` (application) imports only domain, ports, errors; Kysely `sql` only in `infrastructure/db`; `findOwn` added to the port and the fake |
| 16 Clock port                       | PASS   | `getNote` reads `clock.now()` once; no `new Date()`, `Date.now()` added in api or shared src                                                       |
| 17 shared has no IO                 | PASS   | `plain-text.ts`, `undated.ts`, schemas are pure; no IO imports added                                                                               |
| 18 JWT on every request             | PASS   | `GET /notes/:id` calls `authenticate` before reading params; 401 tests for missing, non-bearer, forged                                             |

### Coherence (design)

| Decision                                                           | Followed? | Notes                                                                                          |
| ------------------------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------- |
| Markdown in a lazy chunk (ADR-002)                                 | Yes       | one importer, dynamic `import()`, asserted by `bundle-split.test.ts`                           |
| Note view inside All notes, no URL state                           | Yes       | `AppView` `{view:'notes', noteId}`                                                             |
| `AppView` without the edit flag in PR1                             | Deviation | recorded; PR2 adds it; harmless                                                                |
| `rawToText` before the sanitizer                                   | Deviation | recorded; necessary for C10 literal text; strengthens the design                               |
| Headings in bodies render as bold paragraphs                       | Deviation | recorded; keeps one h1                                                                         |
| `insertUndated` with `replacesId` keeps count                      | Deviation | recorded; same result in the cases that matter, covered by `undated.test.ts:155,165`           |
| Existing tests edited (capture-flow Q1, filtered-page, tag-filter) | Deviation | recorded; the new behavior changes those expectations; note-open-flow tests got a 20 s timeout |

### Commits

`9549aef..HEAD`: 9 commits, all conventional (`feat(api|shared|web)`, `docs(sdd)`), none with a Co-Authored-By or AI attribution trailer (rule 5 verified by grep of the messages).

### Issues found

**CRITICAL**: None.

**WARNING**:

1. Manual smoke (task 1.9.2) is pending, not passed: 1280x720 and 375x667, light and dark, reduced motion, no horizontal scroll, screenshots for the PR. The spec's `[manual]` scenario "Look on both viewports" and the 44 px and focus-ring visuals depend on it. Task 1.9.3 (open PR1, label `size:exception`, Railway before Vercel) is also open. Do both before merge.
2. Spec scenario "Main chunk `[build]`" says the main chunk MUST be unchanged; it grew by +0.92 kB gzip JS and +0.17 kB CSS (within the +6 kB design budget, markdown is lazy). Accept as a documented deviation or amend the spec wording at archive.
3. "Old undated note" and "Refresh" are only PARTIAL: each half is tested, but no test drives Today row to note view through `App`, and no test asserts that a fresh `App` render lands on Today with a note open before reload. Both hold by construction (`useState(TODAY)`, `openNote` wiring); a short App-level test in PR2 would close them.
4. apply-progress lacks the Triangulate and Safety Net columns of the strict TDD evidence table; modified-file safety nets cannot be confirmed (the per-commit verify gate was green).
5. Size: about 2,970 changed lines without the lockfile (3,124 including `tasks.md` and `.engram/manifest.json`) against a forecast of 1,825 and a 400-line budget. `size:exception` was accepted, but the 60-70% overrun over forecast is worth recording; the PR needs the commit-by-commit reading plan.
6. `[pg]` tests did not run in this verify (24 skipped); their pass is taken from the orchestrator and apply-progress. They are not in CI.
7. The `note-open-flow` tests carry a 20 s timeout because they flake at 5 s under load (web suite takes about 45 s, jsdom created 54 times). Not a failure now, a flake risk later.

**SUGGESTION**:

1. Reflow the `excerptOf` doc comment in `apps/api/src/domain/excerpt.ts` (one line is about 130 characters; prettier does not wrap comments).
2. Add `expect(container.querySelectorAll('a').length)` guards or a positive companion in the hostile table loop (`markdown-body.test.tsx:86-92`) so the anchor loop is not vacuous.
3. Add one test that asserts the "Without a reminder · 9" header and the "11 other notes" line in a single render (C13 coexistence).
4. Wire the `[pg]` suites into an optional CI job or a documented script so they stop depending on a manual throwaway database.
5. Deploy order to carry into the PR description: Railway (new wire fields `createdAt`, `undated`) before Vercel; the web client rejects a stale API without `createdAt` (`api.test.ts` fetchNote).

### Verdict

**Human verdict: PASS WITH WARNINGS** for the code, the runtime evidence and the security review: `npm run verify` and `npm run build` exit 0 at a23bdb4, 0 CRITICAL, 7 WARNING, 5 SUGGESTION. R14 and C10/C11 hold: raw HTML always ends as text, only http, https and mailto become links with `rel="noopener noreferrer"`, no images, and `GET /notes/:id` gives 404 (other user, unknown or non-UUID id) and 401 (no or forged token). PR2 scenarios are deferred, not failed.

**Machine envelope: `verdict: fail`, `blockers: 1`, `critical_findings: 0`.** The admission validator (`gentle-ai sdd-verify-validate`) refuses a passing verdict while completed counts are below totals, and 4 of 33 PR1 scenarios are not runtime-complete: 1 `[manual]` pending (smoke 1.9.2, the single blocker, human-owned), 1 `[build]` deviation (main chunk +0.92 kB gzip instead of unchanged), 2 PARTIAL (Old undated note, Refresh). No code defect behind any of them. The record becomes `pass_with_warnings` once the smoke is recorded as passed and WARNINGs 2 and 3 are accepted or closed. Archive belongs after PR2 anyway.
