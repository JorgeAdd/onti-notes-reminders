```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:6f07b7a30d10e95e4dd31af5f43f7ed495cf2073ec019fca4565c347e779315e
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 12/12
scenarios: 27/27
test_command: npm run verify
test_exit_code: 0
test_output_hash: sha256:947bdce56287180ab1d3dc59cef01b6c3067ad6e729cdd84807113b4f905b1a3
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:66fe9a3193b8bb11f2f02fffed3a771f7d12076e6f44f4aa240641815a8a5438
```

## Verification Report — slice-9-help

**Change**: slice-9-help
**Scope**: whole slice, commits 4a73cbd..5307248 plus 93f27e8 on feat/slice-9-help (planning 9adbaa4, roadmap 8041985, base origin/main 914fa61). Never pushed.
**Mode**: Strict TDD (runner `npm run test`, run through `npm run verify`)
**Apply-progress**: Engram #1167 (`sdd/slice-9-help/apply-progress`)

### Completeness

| Metric           | Value                                                   |
| ---------------- | ------------------------------------------------------- |
| Tasks total      | 28 (1.1 to 9.3)                                         |
| Tasks complete   | 26                                                      |
| Tasks incomplete | 2 (9.2 manual smoke, 9.3 open the PR; both human-owned) |

No core implementation task is open. Requirements: 12 (help-dialog 9, today-page 1 added + 2 modified). Scenarios: 27 (help-dialog 14, today-page 13).

### Build and tests execution

**Tests**: PASS on the final run (`npm run verify` = format:check, lint, typecheck, tests; exit 0).

- shared: 17 files, 396 passed, 3 todo
- api: 32 files passed, 5 skipped; 491 passed, 49 skipped (Postgres suites need `ONTI_TEST_DATABASE_URL`; slice 9 touches no API)
- web: 72 files, 777 passed (baseline 693, +84)

**First run failed, second passed (see WARNING 1)**: the first `npm run verify` exited 1 on one web test, `today-edit-key.test.tsx > e on a focused row opens the note view already in edit mode` (`findByLabelText` timed out at 2447 ms while the api and web suites ran together). That file is slice 4, untouched by this change. Run alone 3 times: 3/3 pass. Whole web suite alone: 777 pass. Second full `npm run verify`: exit 0. The hash above is of the passing run.

**Build**: PASS (`npm run build`, exit 0; only the >500 kB notice).

| Asset (gzip)                   | origin/main 914fa61 | HEAD      | Delta    |
| ------------------------------ | ------------------- | --------- | -------- |
| `index-*.js` (main)            | 178.98 kB           | 179.81 kB | +0.83 kB |
| `index-*.css` (main)           | 4.58 kB             | 4.63 kB   | +0.05 kB |
| `HelpDialog-*.js` (lazy, new)  | n/a                 | 1.76 kB   | new      |
| `HelpDialog-*.css` (lazy, new) | n/a                 | 0.74 kB   | new      |

The numbers match apply-progress and the task. Help code and CSS ship only in the lazy chunk. No dependency added (no `package.json` change from 914fa61 to HEAD).

**Coverage**: not available (config `coverage.available: false`).

### TDD compliance

| Check                         | Result | Details                                                                                                                                             |
| ----------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| TDD evidence reported         | PASS   | apply-progress lists task, RED test, failure reason, GREEN, triangulation, safety net per unit (not the literal emoji table, all six facts present) |
| All tasks have tests          | PASS   | 10 new test files and 5 modified ones exist at HEAD                                                                                                 |
| RED confirmed (tests exist)   | PASS   | every RED file in the evidence exists                                                                                                               |
| GREEN confirmed (tests pass)  | PASS   | all pass at HEAD in the final run                                                                                                                   |
| Triangulation                 | PASS   | 7 example inputs at two clocks, idle x 3 targets x contexts, 9 trap cases, key vs touch, every empty variant                                        |
| Safety net for modified files | PASS   | recorded ("keys and today suites green before edit")                                                                                                |

Unit 8.1 (`bundle-split`) was green at once because the wiring was already lazy; apply recorded a mutation to a static import that made it fail. Accepted as the RED evidence. Commit 1 moved the `?` row to commit 3 and the empty-hint copy to commit 7 (recorded deviations a, b), so each commit stays green under the reverse check.

### Mutation check on the coverage test (run in this phase, restored, nothing committed)

| Mutation in `help-model.ts`         | Result                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------- |
| remove the `capture` hint row (`c`) | 4 tests fail (reduceKey probe, scan, KeyHint exhaustiveness, roadmap keys) |
| remove the extra `help` row (`?`)   | 4 tests fail (probe, scan, row-removed, roadmap keys)                      |
| remove the `edit` hint row (`e`)    | 5 tests fail                                                               |

`git status` is clean after restoring `help-model.ts` from a copy. The coverage test truly fails when a handled key lacks help.

### Spec compliance matrix

Test paths are under `apps/web/test/`. Tags: [static] a source or CSS scan run in vitest, [manual] pending the human smoke 9.2.

#### help-dialog

| Requirement          | Scenario           | Test                                                                                                                                                               | Result                    |
| -------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| Opening and closing  | Never on its own   | `today-help-flow.test.tsx:84` (with notes and without), `:90` (empty account)                                                                                      | COMPLIANT                 |
| Opening and closing  | Open and close     | `today-help-flow.test.tsx:106` (`?`), `:115` (button, esc), `help-dialog.test.tsx:39` and `:47` (close button, esc); 44 px: `help-css.test.ts:66` [static]         | COMPLIANT                 |
| Opening and closing  | `?` while open     | `today-help-flow.test.tsx:106` (one dialog), `:150` (layer inert)                                                                                                  | COMPLIANT                 |
| Presentation         | Desktop modal      | `help-dialog.test.tsx:72` (portal over the page, scrim click closes, inside click does not)                                                                        | COMPLIANT                 |
| Presentation         | Mobile sheet, dock | `help-dialog.test.tsx:102`; `today-help-flow.test.tsx:208` (inside the dock, bars gone, back on close), `:228` (outside tap closes, no row sheet)                  | COMPLIANT                 |
| Sections and content | Desktop content    | `help-dialog.test.tsx:82`; `help-coverage.test.ts:99` (keys per section); `:90` (order and titles)                                                                 | COMPLIANT                 |
| Sections and content | Mobile content     | `help-dialog.test.tsx:109`; `help-coverage.test.ts:119` and `:133` (no keys, names real buttons)                                                                   | COMPLIANT                 |
| One source of truth  | Coverage           | `help-coverage.test.ts:50`, `:56`, `:62`, `:67`; mutation check above                                                                                              | COMPLIANT                 |
| Capture examples R11 | Examples           | `help-examples.test.ts:51` (each input), `:63`, `:67` (past clock), `:72` (shown in capture)                                                                       | COMPLIANT (see WARNING 2) |
| Accessibility        | Focus lifecycle    | `help-dialog.test.tsx:53` (Tab kept inside), `:61` (returns to trigger); `use-focus-trap.test.tsx:59`, `:64`, `:74`, `:97`; `today-help-flow.test.tsx:115`, `:126` | COMPLIANT                 |
| Accessibility        | Labelled dialog    | `help-dialog.test.tsx:32` (role, `aria-modal`, name from the title)                                                                                                | COMPLIANT                 |
| Page keys inert      | Keys blocked       | `today-help-flow.test.tsx:150` (`c / j ]` and more, wake on close), `:180` (`/` and its hint), `:192` (esc does not clear the filter)                              | COMPLIANT                 |
| Motion and style     | Static checks      | `help-css.test.ts:17`, `:26`, `:35`, `:44` (resolved <= 150 ms normal and reduced), `:57`, `:73`, `:81` [static]; focus ring `:66`                                 | COMPLIANT (see WARNING 3) |
| Copy in messages     | No literals        | `help-dialog.test.tsx:132` [static], `:139` (no seed id)                                                                                                           | COMPLIANT                 |

#### today-page

| Requirement         | Scenario              | Test                                                                                                                                                               | Result                 |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| Help key and button | Key opens help        | `today-help-flow.test.tsx:106`; `keys.test.ts:249`, `:257`; `use-today-rows-help.test.tsx:32`, `:64`                                                               | COMPLIANT              |
| Help key and button | Typing `?`            | `today-help-flow.test.tsx:138` (capture bar); `use-today-rows-help.test.tsx:50` (layer off); armed `?` `keys.test.ts:261`                                          | COMPLIANT              |
| Help key and button | Button                | `today-help-flow.test.tsx:115`; `statusline.test.tsx:90`, `:118` (44 px, ink ring, every width) [static]                                                           | COMPLIANT              |
| Help key and button | Out of scope views    | `today-help-flow.test.tsx:239` (All notes), `:275` (notes and note features do not reference help) [static]; note view: no reference, no key layer there           | COMPLIANT              |
| Statusline          | Counts                | existing `statusline.test.tsx:11`; green in the suite                                                                                                              | COMPLIANT (regression) |
| Statusline          | Working hints only    | existing `statusline.test.tsx:28`, `:53`, `:62`; `keyboard.test.tsx`; `keys.test.ts` `availableKeys` unchanged                                                     | COMPLIANT (regression) |
| Statusline          | Edit hint [PR2]       | existing `keys.test.ts`, `keyboard.test.tsx`                                                                                                                       | COMPLIANT (regression) |
| Statusline          | Day and filter hints  | existing `keys.test.ts`, `day-navigation` suites                                                                                                                   | COMPLIANT (regression) |
| Statusline          | Search hint           | existing suites plus `today-help-flow.test.tsx:180` (no `/` hint while help is open)                                                                               | COMPLIANT              |
| Statusline          | Help button present   | `statusline.test.tsx:90`, `:102` (not a key hint, shown beside them)                                                                                               | COMPLIANT              |
| Empty states        | Empty                 | existing `empty-state.test.tsx:11`; `today-help-flow.test.tsx:90`                                                                                                  | COMPLIANT              |
| Empty states        | Hint wording by width | `empty-state.test.tsx:26` (exact "Press ? to see how it works"), `:35` ("Tap ? to see how it works"), `:42` (every variant); `today-help-flow.test.tsx:98` (phone) | COMPLIANT              |
| Empty states        | Failure and expiry    | existing `today-container` and auth suites; unchanged paths                                                                                                        | COMPLIANT (regression) |

**Compliance summary**: 27/27 scenarios have a passing covering test. The statusline growing to 44 px as a visual change to boards 03/05 and the real browser smoke are [manual] (task 9.2, pending). Scenario clock values: see WARNING 2.

### Roadmap binding decisions

| Decision                                                                                                     | Result | Evidence                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `?` and a >= 44 px statusline button open help on Today; never opens on its own                              | OK     | `keys.ts` `?` branch; `Statusline.tsx` button; `Statusline.module.css .help` min 44 px; flow tests above                                                                                                                                        |
| Empty-state hint copy exact (desktop and touch)                                                              | OK     | `messages.ts:116-117`; `empty-state.test.tsx:26`, `:35`                                                                                                                                                                                         |
| Desktop modal; <= 640 px sheet inside the dock replacing the bars                                            | OK     | `HelpDialog.tsx` portal vs inline; `DayPage.tsx` hides `MobileBar` while `help !== null`; `today-help-flow.test.tsx:208`                                                                                                                        |
| Four sections and exact content                                                                              | OK     | `help-model.ts`, `messages.help`; Capture `c`, HH:MM, today HH:MM (late), tomorrow HH:MM, +Nm/+Nh, #tag, no time, esc; Days `[ ]`, `t`; On a note `j/k x z s h t e d`, ↵/esc; Find `/`, `#`, esc. Rows are a superset (WARNING 4, SUGGESTION 2) |
| Touch equivalents on mobile                                                                                  | OK     | `messages.help.touch`; `help-coverage.test.ts:133` names the real labels                                                                                                                                                                        |
| Rows derived from `KeyHint` and messages, not hand-written; coverage fails on a missing row                  | OK     | `HINT_ROWS: Record<KeyHint, ...>`, lines are `messages.statusline.keys`; mutation check above                                                                                                                                                   |
| Capture examples through the shared R11 parser with an injected clock                                        | OK     | `help-examples.test.ts` uses `parseCapture` from `@onti/shared` with fixed `Date` and `TZ`                                                                                                                                                      |
| `role="dialog"`, `aria-modal`, labelled title; focus in, trapped, returns to trigger                         | OK     | `HelpDialog.tsx`, `use-focus-trap.ts`; tests above                                                                                                                                                                                              |
| esc and 44 px close button close it                                                                          | OK     | `help-dialog.test.tsx:39`, `:47`; `HelpDialog.module.css .close` uses `--size-target`                                                                                                                                                           |
| Page keys inert while open; no second dialog                                                                 | OK     | `bar.open` includes `help !== null`; `searchAvailable` adds `help === null`; `today-help-flow.test.tsx:106`, `:150`                                                                                                                             |
| Fade <= 150 ms, `--motion-*`, `--ease-paper`, reduced motion via the global block; tokens only; no vermilion | OK     | `HelpDialog.module.css`: `animation: reveal var(--motion-crossfade) var(--ease-paper) backwards`, keyframes set only `opacity`; `help-css.test.ts`. Open only (WARNING 3)                                                                       |
| Copy only in `messages.ts`                                                                                   | OK     | `help-dialog.test.tsx:132`; empty hint and button glyph are in `messages.help`                                                                                                                                                                  |
| No new dependency                                                                                            | OK     | no `package.json` diff                                                                                                                                                                                                                          |
| Help in a lazy chunk; sizes as stated                                                                        | OK     | `DayPage.tsx` `lazy(() => import('../help/HelpDialog'))`; `bundle-split.test.ts:41`; build table above                                                                                                                                          |
| Conventional commits, no AI attribution                                                                      | OK     | 10 slice commits plus planning and roadmap are conventional; no Co-Authored-By or generator line in `914fa61..HEAD`                                                                                                                             |

### Design coherence

| Decision                               | Followed? | Notes                                                                              |
| -------------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| 1 Help model (`HINT_ROWS`, extra rows) | Yes       | extra rows: `?` (Find), note `d`, capture `esc`                                    |
| 2 Coverage test (probe, scan, reverse) | Yes       | all three present, plus mutation proof                                             |
| 3 Capture examples                     | Yes       | design clock Wed 09:05, spec says Tue 6 11:12 (WARNING 2)                          |
| 4 `?` in `reduceKey`                   | Yes       | armed `?` disarms, `availableKeys` unchanged, tested                               |
| 5 Page keys while open                 | Yes       | `bar.open` and `searchAvailable`; transparent backdrop on mobile                   |
| 6 Dialog shell and trap                | Yes       | one document keydown, `preventDefault` on Escape, `returnTo` kept in the container |
| 7 Desktop vs sheet                     | Yes       | backdrop lives in `HelpDialog` not `DayPage` (recorded deviation c)                |
| 8 Lazy load                            | Yes       |                                                                                    |
| 9 Motion and tokens                    | Yes       | no exit animation (WARNING 3)                                                      |
| 10 Statusline button                   | Yes       | `onHelp` optional, so `?` is not consumed where no handler exists (deviation d)    |
| 11 Empty-state hint                    | Yes       |                                                                                    |
| 12 Touch copy anti-drift               | Yes       |                                                                                    |

### Known items

- **SG10 "↵ open/fold body"**: recorded in `docs/backlog.md` "Deferred from Slice 9"; pre-existing drift; help omits it. Confirmed.
- **Statusline grows to 44 px**: CSS asserted (`statusline.test.tsx:118`); the visual effect on boards 03/05 is [manual].
- **`openspec/config.yaml` 400-line rule**: the slice is about 1,655 changed lines outside `openspec/` and `.engram/` (28 files, +1,655 -13), above 400 and above the 800 slice budget. It follows the human's single `size:exception` PR, as design and tasks state.

### Issues Found

**CRITICAL**: None.

**WARNING**:

1. **Flaky pre-existing test under full-suite load.** The first `npm run verify` exited 1 on `today-edit-key.test.tsx` (slice 4 file, unchanged): `findByLabelText` timed out at the default 1 s while api and web ran together. It passed 3/3 alone, in the web suite alone, and in a second full verify. The pre-commit hook runs the same command, so a rerun may be needed; the apply session reported green on every commit. Not caused by slice 9 as far as can be shown, but this slice adds a lazy chunk and 84 tests to the web suite, so watch it in CI. Fix later by raising that test's `findBy` timeout or awaiting the lazy chunk.
2. **Scenario clock and example set differ from the spec text.** The spec "Examples at Tue 6 11:12" lists `17:00`, `09:00`, `today 09:00`, `tomorrow 09:00`, `+15m`, `+2h`, `#client-a`. Design decision 3 and the tests use Wed 09:05 and Wed 18:00 with `17:00`, `today 08:00`, `tomorrow 9:00`, `+30m`, `+2h`, `#client-a`, `Buy milk`. Every claim in the spec is still proven by the real parser (today, tomorrow if past, late today, tomorrow, offsets, tag, no reminder), only the literal values differ. Align the spec text to the design (docs only) or leave as a recorded drift.
3. **No exit fade.** The spec says open and close use a fade; the dialog mounts with a 150 ms opacity reveal and unmounts at once on close (the `help-css` test asserts only the keyframes and the duration). Calm and within SG15 (nothing travels), but literally open only. Decide: reword the spec to "open", or add a closing state in a later slice.
4. **Manual smoke 9.2 pending (HUMAN).** Desktop and 375 px, light and dark, reduced motion, keyboard-only; also the 44 px statusline against boards 03/05, focus ring, and the sticky header inside the 60dvh dock. Nothing here proves real layout.
5. **Size.** Over the 400-line config rule and the 800 slice budget; follows the human decision (`size:exception`, one PR, commit-by-commit reading). Note the contradiction in the PR (task 9.3).

**SUGGESTION**:

1. `?` while a row action sheet is open (phone) and with a focused text field other than the bars are protected by the existing layer (`sheetItem === undefined` and the bar flags), but no help-specific test pins them. One flow test each would close the spec sentence "unless a sheet has focus or is open".
2. The help adds rows beyond the roadmap list (`?` how it works under Find; `esc` closes the snooze menu; `tab`/`↵` tag-bar hints via `tags`, `clear`). Harmless and derived from hints, but the spec table says "exactly this content". Either accept it in the spec or trim.
3. `.engram/chunks` and `manifest.json` appear in the diff against 914fa61; confirm they belong in the PR.
4. Save the SG10 gap decision (implement `↵` open/fold or drop it from SG10) before the next key-handling slice.

### Verdict

**PASS WITH WARNINGS.** 0 CRITICAL, 5 WARNING, 4 SUGGESTION. The final `npm run verify` (exit 0) and `npm run build` (exit 0) pass, every scenario has a covering test or a [static] scan, every roadmap binding decision is met, and the coverage test was shown to fail under mutation. Ready for the human smoke 9.2, then archive after the PR merges.
