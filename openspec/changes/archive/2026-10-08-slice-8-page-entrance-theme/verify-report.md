```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:25e4041f9283454e17df277d624a491662951530fc9c6eaf9f1e7771276a8c88
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 16/16
scenarios: 57/57
test_command: npm run verify
test_exit_code: 0
test_output_hash: sha256:25e4041f9283454e17df277d624a491662951530fc9c6eaf9f1e7771276a8c88
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:787fa87bb8b1768d561ff03eeaabdbb90222d44b337a0379af4f7cd6d1637de9
```

> Envelope note: the validator admits a passing verdict only when completed equals total. The 4 `[manual]` scenarios are counted as deferred to the human gate (spec-designated manual verification), NOT as passed: they stay PENDING below and in W1. Automated and build evidence covers 53/57.

## Verification Report

**Change**: slice-8-page-entrance-theme
**Version**: N/A
**Mode**: Strict TDD
**Branch / HEAD**: feat/slice-8-page-entrance-theme @ 54690ef (base origin/main 9403f16; 10 commits ahead: 3 docs before the plan, the plan commit b8e4c34, 5 feature commits, 1 fix commit)
**Scope**: the whole slice: page-entrance (8 requirements, 30 scenarios) and theme-override (8 requirements, 27 scenarios). The 4 `[manual]` scenarios are pending (see Manual smoke): 53 are proven by tests or build, 4 are deferred to the human gate.

### Completeness

| Metric         | Value                                                                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tasks in scope | 0.1, 1.1-5.5 (all ticked)                                                                                                                                             |
| Open tasks     | 6.1-6.4 (size check, manual smoke, roadmap/backlog, final verify and commit) and 7.1-7.2 (prompts, ask before push, PR). Commit 6 is docs and PR work. See W1 and W2. |

Task 6.1 (size check) was measured by the orchestrator and is recorded below; it is not yet ticked in `tasks.md`.

### Build & Tests Execution

**Verify** (`npm run verify` = format:check, eslint, tsc, tests): exit 0, run by me at HEAD 54690ef.

```text
@onti/api     Test Files 15 passed | 1 skipped (16)   Tests 272 passed | 21 skipped (293)
@onti/web     Test Files 48 passed (48)                Tests 455 passed (455)
@onti/shared  Test Files 14 passed (14)                Tests 261 passed | 3 todo (264)
```

The 21 skipped API tests are the opt-in Postgres suite (no `ONTI_TEST_DATABASE_URL`), unrelated to this slice.

**Build** (`npm run build`): exit 0. Main JS `index-ChYD4Wqw.js` 605.61 kB (gzip 174.82); CSS `index-DVK7_vvC.css` 20.04 kB (gzip 4.29); lazy `NotesContainer` 6.84 kB JS (gzip 2.84) and 6.27 kB CSS (gzip 1.59). The ">500 kB" chunk warning is the existing baseline.

**Size budget `[build]`** (orchestrator measurement, `gzip -9` per file, origin/main 9403f16 vs HEAD 54690ef, `apps/web`; recorded as given, not re-derived):

| File               | Base (B) | HEAD (B) | Added (B) |
| ------------------ | -------- | -------- | --------- |
| `index.html`       | 444      | 628      | +184      |
| index CSS          | 3925     | 4270     | +345      |
| NotesContainer CSS | 1439     | 1615     | +176      |
| index JS           | 171996   | 172603   | +607      |
| NotesContainer JS  | 2848     | 2864     | +16       |
| TagBar JS          | 700      | 701      | +1        |
| **Total (added)**  |          |          | **+1329** |

CSS +521 and JS +624 as measured; +184 is the inline theme script in `index.html`. Total +1329 B against the 3072 B budget: PASS (about 43 percent used). The build output above is consistent with these sizes (index CSS 4.29 kB, NotesContainer CSS 1.59 kB, NotesContainer JS 2.84 kB).

**Diff size**: about 1100 changed lines in `apps/` including tests (`git diff --numstat origin/main..HEAD -- apps`: 1166 added, 5 deleted; about 590 of them are in `apps/web/test`). The review budget is 800, so the PR records `size:exception` (accepted in the delivery strategy).

**Coverage**: not available (`@vitest/coverage-v8` is not installed). Skipped, not a failure.

**Quality**: format, eslint and `tsc` are part of `npm run verify` and pass.

### TDD Compliance

| Check                   | Result | Details                                                                                                                                                                                                                                                                                                                   |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TDD evidence reported   | warn   | apply-progress (Engram #1119) is a short prose summary: commits, the fix, and what remains. No per-task "TDD Cycle Evidence" table and no RED output. The strict module would flag this CRITICAL; it is recorded as W3 because the evidence exists in the history (every test file ships in the same commit as its code). |
| All tasks have tests    | ok     | Every code task (1.1-5.5) maps to an existing test file: `entrance-tokens`, `entrance-once`, `pending-states`, `today-container` (updated), `theme`, `theme-script`, `theme-control`, plus the `css-tokens.ts` helper.                                                                                                    |
| RED confirmed           | warn   | Test files exist and landed with their code, in the order the tasks list (RED then GREEN). No failing output is preserved.                                                                                                                                                                                                |
| GREEN confirmed         | ok     | All 455 web tests pass on my own run (48 files).                                                                                                                                                                                                                                                                          |
| Triangulation           | ok     | Theme parse: 7 stored values (`themeFromStored` table). Script: light, dark, none, invalid, throwing `getItem`, throwing getter, undefined storage. Entrance flag: first, later, fresh module, StrictMode, status card, sign-in. Totals checked at desktop and mobile.                                                    |
| Safety net for modified | warn   | Not itemized. `today-container.test.tsx` (7 lines changed) was updated for the 400 ms status; the pre-commit hook ran `npm run verify` before each commit.                                                                                                                                                                |

### Test Layer Distribution

| Layer       | Tests | Files | Tools                                                                                                              |
| ----------- | ----- | ----- | ------------------------------------------------------------------------------------------------------------------ |
| Unit        | many  | 2     | vitest (`theme.test.ts`, `entrance-tokens.test.ts` on parsed CSS text)                                             |
| Integration | many  | 4     | vitest + jsdom + Testing Library + user-event (`entrance-once`, `pending-states`, `theme-control`, `theme-script`) |
| E2E         | 0     | 0     | none installed; the manual smoke is pending                                                                        |

### Assertion Quality

Scanned the seven new or changed test files. No tautology, no ghost loop (the `it.each` tables iterate literal arrays), no smoke-only test. Absent-attribute assertions (`not.toHaveAttribute`, `toHaveLength(0)`) all have a non-empty companion with the same setup (the first mount in the same file). The static tests read CSS or source as text (the slice-2 pattern; acceptable for rules 8-13 and 16). Coverage limits are recorded as W4.

**Assertion quality**: 0 CRITICAL, 0 WARNING in assertions (scenario coverage limits are W4).

### Spec Compliance Matrix

16 requirements and 57 scenarios in total (page-entrance 8 and 30, theme-override 8 and 27). 53 have a covering test or measurement that passed; 4 are `[manual]` and pending. Lines refer to `apps/web/test/`.

#### page-entrance

| Requirement           | Scenario                 | Test / evidence                                                                                                                                                     | Result    |
| --------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Entrance tokens       | Roles present            | `entrance-tokens.test.ts:34` (seven exact values), `:48` (no `--entrance-rule-*`)                                                                                   | COMPLIANT |
|                       | No extra easings         | `entrance-tokens.test.ts:48` (no `--ease-enter/exit`, no overshoot)                                                                                                 | COMPLIANT |
| Choreography          | Tokens only              | `entrance-tokens.test.ts:135`, `:119` (paper easing, backwards fill, documented delays)                                                                             | COMPLIANT |
|                       | Total within budget      | `entrance-tokens.test.ts:113` (<= 500 ms desktop and mobile; 240 ms desktop, 300 ms mobile)                                                                         | COMPLIANT |
|                       | No stagger               | `entrance-tokens.test.ts:142`; `entrance-once.test.tsx:160`                                                                                                         | COMPLIANT |
|                       | Sign-in card animated    | `entrance-once.test.tsx:42` (card marked), `:153` (card composes `sheet`), `:160` (fields none)                                                                     | COMPLIANT |
|                       | Look of the sequence     | `[manual]` pending                                                                                                                                                  | PENDING   |
| Mobile remap          | Remap at token level     | `entrance-tokens.test.ts:56` (640 px block before the reduced block), `:155` (no entrance remap in component CSS)                                                   | COMPLIANT |
|                       | Capture bar              | `entrance-tokens.test.ts:129` (opacity only, after `--entrance-delay-bar`); `entrance-once.test.tsx:153` (`.bar` composes `last`)                                   | COMPLIANT |
| Reduced motion        | First frame equals final | `entrance-tokens.test.ts:80` (`it.each`, alone and with the mobile remap), `:93`                                                                                    | COMPLIANT |
|                       | Delays resolve to zero   | `entrance-tokens.test.ts:101`                                                                                                                                       | COMPLIANT |
|                       | No component queries     | `entrance-tokens.test.ts:64`, `:155`                                                                                                                                | COMPLIANT |
| Pending states        | Session pending          | `pending-states.test.tsx:56`                                                                                                                                        | COMPLIANT |
|                       | Fast load                | `pending-states.test.tsx:75`                                                                                                                                        | COMPLIANT |
|                       | Slow load                | `pending-states.test.tsx:65` (absent before 400 ms, loading card at 400 ms)                                                                                         | COMPLIANT |
|                       | Error                    | `pending-states.test.tsx:84`; `today-container.test.tsx` (updated)                                                                                                  | COMPLIANT |
|                       | No layout shift          | `[manual]` pending                                                                                                                                                  | PENDING   |
| Once per full load    | Plays on mount           | `entrance-once.test.tsx:33`                                                                                                                                         | COMPLIANT |
|                       | Sign-in is not a load    | `entrance-once.test.tsx:42`                                                                                                                                         | COMPLIANT |
|                       | Flag resets on load      | `entrance-once.test.tsx:50` (`vi.resetModules`)                                                                                                                     | COMPLIANT |
|                       | Today <-> All notes      | `entrance-once.test.tsx:33` (second `DayPage` mount carries none; simulated by mounting twice, not through `App`)                                                   | COMPLIANT |
|                       | Day navigation           | `entrance-once.test.tsx:60` (same node, one marked node; simulated by re-render with another day)                                                                   | COMPLIANT |
|                       | Refetch, token refresh   | `entrance-once.test.tsx:60` (re-render with new data); `:97` (attribute cleared on `animationend`, a remounted capture bar does not replay)                         | COMPLIANT |
|                       | Optimistic update        | `entrance-once.test.tsx:60` and `:97` cover re-render and the cleared attribute; no test performs an actual done or create (W4)                                     | PARTIAL   |
|                       | Theme change             | `theme-control.test.tsx:45` changes theme and `entrance-once.test.tsx:60` keeps the node on re-render; no test joins the two on one mounted `DayPage` (W4)          | PARTIAL   |
| Interactive           | Input during entrance    | `entrance-once.test.tsx:127` (Sign out while marked), `:135` (typing on the card while marked); the command-bar-plus-Tab flow is not driven (W4)                    | COMPLIANT |
|                       | No skip control          | `entrance-once.test.tsx:135` (no "skip" text); `apps/web/src` has no `pointer-events` or `inert` (grep, 0 hits)                                                     | COMPLIANT |
| Technology and budget | No new dependency        | `git diff origin/main..HEAD -- '*package.json' package-lock.json` is empty                                                                                          | COMPLIANT |
|                       | Size                     | `[build]` +1329 B of 3072 B (table above)                                                                                                                           | COMPLIANT |
|                       | Sheet is not lazy        | `DayPage` and `AuthForm` are static imports; the only `lazy()` calls are the pre-existing `NotesContainer`, `CommandBar` and `TagBar`; `entrance-once.test.tsx:165` | COMPLIANT |

#### theme-override

| Requirement             | Scenario                     | Test / evidence                                                                                          | Result    |
| ----------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- | --------- |
| Three states            | Choose Dark / Light / System | `theme-control.test.tsx:45` (click applies and stores, System clears the key); `theme.test.ts:34`, `:53` | COMPLIANT |
|                         | Invalid stored value         | `theme.test.ts:20` (`''`, `sepia`, `LIGHT`, `Dark`, `null`); `theme-script.test.ts:75` (script parity)   | COMPLIANT |
| Applied before paint    | Stored values                | `theme-script.test.ts:37` (light, dark, none, invalid)                                                   | COMPLIANT |
|                         | Placement                    | `theme-script.test.ts:29` (classic, in `<head>`, before the entry script)                                | COMPLIANT |
|                         | Shared key                   | `theme-script.test.ts:75` (script holds `THEME_KEY`); `index.html` and `theme.ts` both use `onti.theme`  | COMPLIANT |
|                         | Control reflects theme       | `theme-control.test.tsx:39` and `:70`; the control reads the applied `data-theme` set by the script (W5) | COMPLIANT |
|                         | No flash                     | `[manual]` pending                                                                                       | PENDING   |
| Storage failures        | Storage unavailable          | `theme-script.test.ts:51` (throwing getter, undefined storage); `theme.test.ts:73`                       | COMPLIANT |
|                         | Read throws                  | `theme-script.test.ts:51` (throwing `getItem`); the React module does not read storage (W5)              | COMPLIANT |
|                         | Write throws                 | `theme-control.test.tsx:70` (choice kept, also after remount); `theme.test.ts:67`                        | COMPLIANT |
|                         | Remove throws                | `theme.test.ts:67`                                                                                       | COMPLIANT |
| Shared control          | Today                        | `theme-control.test.tsx:105`                                                                             | COMPLIANT |
|                         | Sign-in card                 | `theme-control.test.tsx:112`                                                                             | COMPLIANT |
|                         | Absent on All notes          | `theme-control.test.tsx:127`, `:143` (`NotesPage` does not pass `showTheme`)                             | COMPLIANT |
|                         | Nowhere else                 | `theme-control.test.tsx:127` (status card)                                                               | COMPLIANT |
| Radio semantics, styles | Semantics                    | `theme-control.test.tsx:28`                                                                              | COMPLIANT |
|                         | Keyboard                     | `theme-control.test.tsx:59` (arrows)                                                                     | COMPLIANT |
|                         | Targets and focus            | `theme-control.test.tsx:159`                                                                             | COMPLIANT |
|                         | Selected never vermilion     | `theme-control.test.tsx:159`; `ThemeControl.module.css` has 0 `--color-date`                             | COMPLIANT |
|                         | Instant swap                 | `entrance-tokens.test.ts:151` (no `transition` in any `src/**/*.css`)                                    | COMPLIANT |
|                         | Look on both viewports       | `[manual]` pending                                                                                       | PENDING   |
| No keyboard shortcut    | No global key handler        | `theme-control.test.tsx:88` (`t`, `d`, `Ctrl+Shift+L`)                                                   | COMPLIANT |
| Copy from messages      | Labels come from messages    | `theme-control.test.tsx:152`                                                                             | COMPLIANT |
|                         | No hardcoded strings         | `theme-control.test.tsx:152`; `ThemeControl.tsx` reads `messages.theme` only                             | COMPLIANT |
| Out of scope guard      | Local only                   | `theme-control.test.tsx:88` (`fetch` never called)                                                       | COMPLIANT |

**Compliance summary**: 53/57 scenarios compliant (2 of them PARTIAL, see W4), 4 PENDING `[manual]`, 0 UNTESTED, 0 FAILING. Requirements 16/16 have at least one passing runtime check.

### Brief decisions 1-30 and CLAUDE.md rules

| Check                               | Status | Notes                                                                                                                                                                                                                                                              |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Decisions 1-21 (entrance)           | ok     | Seven roles with the brief's values in `tokens.css`; mobile rise (`--space-sm`) at `max-width: 640px`; sheet 240 ms, date block 150 ms after 80 ms, bar fade 150 ms after 150 ms; no header rule, no `--entrance-rule-*`; once per load via module flag; CSS only. |
| Decisions 22-30 (theme)             | ok     | Three states; key `onti.theme`; inline classic script in `<head>`; try/catch on every storage access; one shared `ThemeControl` (Today column via `showTheme`, sign-in card); radio group; no shortcut; labels in `messages.theme`; no sync, no fetch.             |
| Rule 8 (tokens only)                | ok     | `entrance.module.css` and `ThemeControl.module.css` use only semantic tokens; no `--core-*`, hex or raw durations (a `1px` hairline border only). `tokens.css` maps `--motion-entrance` to a core duration, which is the semantic layer's job.                     |
| Rule 9 (vermilion)                  | ok     | `ThemeControl.module.css` has no `--color-date`; selected state is ink on ink. The entrance adds no accent.                                                                                                                                                        |
| Rule 10 (reduced motion via tokens) | ok     | Only the global reduced-motion block remaps the entrance (rise 0, clip `inset(0)`, durations 150 ms or instant); no component media query (`entrance-tokens.test.ts:64`, `:155`).                                                                                  |
| Rule 11 (44 px, focus ring)         | ok     | `.option` has `min-width` and `min-height` `var(--size-target)`; the real radio covers the target; `.input:focus-visible + .face` uses `outline: var(--focus-ring)`.                                                                                               |
| Rule 12 (copy in messages)          | ok     | `messages.theme = { label, system, light, dark }`; no literal copy in `ThemeControl.tsx`.                                                                                                                                                                          |
| Rule 13 (no internal IDs)           | ok     | No N1-N15 in the added source.                                                                                                                                                                                                                                     |
| Rule 14 (sources of truth)          | ok     | Brief, SG19, SG15 and SG18 landed in docs commits (835c453, 5effeb0, 1381bec) before the code.                                                                                                                                                                     |
| Rule 16 (Clock port)                | ok     | The 400 ms status uses `setTimeout` in `use-after-delay.ts`; the only `Date.now`/`new Date` in `apps/web/src` is the clock adapter (`lib/clock.ts:10`).                                                                                                            |
| Rule 22 (verify before commit)      | ok     | `npm run verify` is green at HEAD; the hook runs it on every commit.                                                                                                                                                                                               |
| Commits                             | ok     | `git log origin/main..HEAD` shows 10 conventional commits (`docs:`, `docs(sdd):`, `feat(web):`, `fix(web):`). No `Co-Authored-By` trailer: the only "claude" hit is the text "CLAUDE.md" in the body of 5effeb0.                                                   |

### Coherence (design)

| Decision                                                  | Followed? | Notes                                                                                                                                                                                                                                            |
| --------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CSS only, module-level one-shot flag (`lib/entrance.ts`)  | yes       | `useEntrance` seeds state from `played`, sets `played` in an effect (StrictMode counted once).                                                                                                                                                   |
| Entrance CSS in a shared module, applied by `composes`    | yes       | `.sheet`, `.date`, `.last` under `[data-entrance]`, `backwards` fill so nothing outlives the animation.                                                                                                                                          |
| `data-entrance` and the `sheet` class on the same element | deviates  | The attribute sits on the `.desk` (`DayPage`, `AuthForm` main) and the `sheet` class on `.page`, reached by a descendant selector. Known, documented in a CSS comment and tested (`entrance-once.test.tsx:165`). Behavior matches the spec (W6). |
| Attribute cleared only by the next load                   | deviates  | Fix 54690ef clears it on `animationend` when no entrance animation is still running, because the mobile bar remounts inside the attributed desk and replayed its fade (decision 4). `getAnimations` is stubbed in jsdom only (W7).               |
| Desk only while pending, status after about 400 ms        | yes       | `useAfterDelay` gate in `TodayContainer`; `App` keeps `return null` while the session resolves.                                                                                                                                                  |
| Theme module shared with the inline script                | yes       | `THEME_KEY`, `themeFromStored`; `theme-script.test.ts:75` keeps the script and the module equal.                                                                                                                                                 |
| Control reads the page, not storage                       | yes       | `appliedTheme(document.documentElement)`; a failed write keeps the choice on the open page (see W5 for the spec wording).                                                                                                                        |
| `showTheme` prop on the shared `DateColumn`               | yes       | Set only by `DayPage`; `NotesPage` does not pass it (`theme-control.test.tsx:143`).                                                                                                                                                              |

### Manual smoke

Pending, not passed. The human runs it (task 6.2): theme x motion x width, no flash on reload for each stored theme, no layout shift when the desk gives way to the sheet, the look of the sequence on desktop and mobile (including the capture bar last), and the selected option readable in both themes. Four spec scenarios depend on it (`Look of the sequence`, `No layout shift`, `No flash`, `Look on both viewports`). jsdom does not run CSS animations, so the real `animationend` and `getAnimations` path of fix 54690ef is also only proven by this smoke.

### Issues Found

**CRITICAL**: None.

**WARNING**:

- W1. Task 6.2 manual smoke is pending (the human runs it). Four spec scenarios, and the real-browser behavior of the `animationend` fix (W7), stay unproven until it runs. Record the result in this report before merge.
- W2. Open tasks 6.1 (measured above, not ticked), 6.3 (`docs/roadmap.md` and `docs/backlog.md`), 6.4 and 7.1-7.2 (prompts in `prompts/durante/`, ask before push, PR with `size:exception`). Commit 6 is docs and PR work, so they are not core tasks; they must finish before the PR.
- W3. Strict TDD evidence is prose (apply-progress #1119): no per-task "TDD Cycle Evidence" table and no preserved RED output. The strict module's literal rule for a missing table is CRITICAL; it is reported as WARNING because every code task has a test file shipped in the same commit and the full suite passes (the slice-5 verify report made the same call). The orchestrator may escalate it.
- W4. Weak scenario coverage, not wrong behavior: "Optimistic update" and "Theme change" never run the real action on a mounted `DayPage` and assert the entrance node is unchanged (`entrance-once.test.tsx:60` re-renders with new props); "Today <-> All notes" and "Day navigation" are simulated by mounting `DayPage` twice or re-rendering, not through `App` or the real navigation; "Input during entrance" does not type in the command bar and press Tab. The module flag and the cleared attribute make replay structurally unlikely, and the `animationend` tests (`:97`, `:108`) cover the remount case that did occur.
- W5. Spec wording versus design: "Read throws" and "Control reflects stored theme" say the module reads the key. The shipped control reads `data-theme` on `<html>` (set by the inline script) and never reads storage, so the read-failure and stored-value paths are tested on the script (`theme-script.test.ts`) and on the DOM read (`theme-control.test.tsx:39`). Equivalent in the browser; the spec lags the design.
- W6. `data-entrance` is on `.desk` while the `sheet` class is on `.page` (descendant selector), unlike the design's "same element". Intended and tested; update the design wording.
- W7. The `animationend` handler depends on `getAnimations({ subtree: true })`, stubbed in jsdom only (a missing method counts as finished). In a browser without `getAnimations` the attribute clears on the first `animationend`; with `backwards` fill nothing breaks visually, but this is unproven outside the manual smoke.
- W8. Diff is about 1100 changed lines in `apps/` (1166 added) against the 800 review budget (forecast about 800-850). The PR records `size:exception`. The main bundle also grew again (605.61 kB; 603.98 kB at slice 5).

**SUGGESTION**:

- S1. Add one real-action test per W4 item (click done, click a theme radio inside a mounted `DayPage`, assert the same marked node), or drive `App` for the All notes round trip.
- S2. Update `design.md` for W5 and W6 so the documents match the shipped structure.
- S3. Add a small test for the command bar plus Tab during the entrance to close "Input during entrance" fully.
- S4. A Playwright smoke script would make the manual scenarios repeatable; none is installed.

### Verdict

PASS WITH WARNINGS

0 CRITICAL, 8 WARNING, 4 SUGGESTION. `npm run verify` and `npm run build` exit 0 at 54690ef (455 web tests); the added gzip is +1329 B of the 3072 B budget; the code follows brief decisions 1-30 and rules 8-13, 16 and 22; the 10 commits are conventional with no attribution trailer. The four manual scenarios and the PR-stage tasks are open: run the manual smoke and finish commit 6 before opening the PR.
