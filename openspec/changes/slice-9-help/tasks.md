# Tasks: Slice 9 — How it works help

## Review Workload Forecast

| Field                   | Value                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------- |
| Estimated changed lines | ~1,100 (range 950-1,250): src ~520, tests ~560, docs ~15                            |
| 400-line budget risk    | High (also over the 800 slice budget)                                               |
| Chained PRs recommended | No (the human prefers fewer, larger PRs; commit-by-commit reading replaces a chain) |
| Suggested split         | Single PR, label `size:exception`, work-unit commits in TDD order                   |
| Delivery strategy       | single-pr                                                                           |
| Chain strategy          | size-exception                                                                      |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

Note: `openspec/config.yaml` `rules.tasks` says 400 lines and chained PRs; this slice follows the human decision (single PR, `size:exception`). Flagged in design.

Global checks for every commit:

- RED test first, record the failure, then GREEN, then refactor. Tests and docs in the same commit.
- `npx prettier --write` on touched files; `npm run verify` green via the pre-commit hook (rule 22), never `--no-verify`. Conventional message, no AI attribution (rule 5). Stage by explicit path.
- Web: tokens only, copy in `messages.ts` (one `help` block before `errors`), 44 px targets, ink focus, no vermilion, no internal IDs (rules 8-13).
- Never push without asking (rule 6). Save prompts in `prompts/durante/` (rule 7).

### Suggested Work Units

| Unit | Goal                                  | PR  | Focused test command                                                  | Runtime harness                            | Rollback boundary                                       |
| ---- | ------------------------------------- | --- | --------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------- |
| 1    | Help model and coverage test          | PR1 | `npm run test -w @onti/web -- help-coverage`                          | N/A: pure module, no UI                    | `help-model.ts`, `messages.help`, coverage test         |
| 2    | Capture examples through R11          | PR1 | `npm run test -w @onti/web -- help-examples`                          | N/A: parser test                           | examples block and test                                 |
| 3    | `?` command in `reduceKey`            | PR1 | `npm run test -w @onti/web -- keys`                                   | N/A: pure reducer, UI wired in unit 7      | `keys.ts` branch, `use-today-rows` `onHelp`             |
| 4    | `useFocusTrap`                        | PR1 | `npm run test -w @onti/web -- use-focus-trap`                         | N/A: hook harness                          | `use-focus-trap.ts`                                     |
| 5    | Dialog and content                    | PR1 | `npm run test -w @onti/web -- help-dialog`                            | N/A: not mounted until unit 7              | `HelpDialog`, `HelpContent`                             |
| 6    | CSS tokens and motion                 | PR1 | `npm run test -w @onti/web -- help-css`                               | N/A: static scan                           | the two `.module.css` files                             |
| 7    | Statusline button, empty hint, wiring | PR1 | `npm run test -w @onti/web -- statusline empty-state today-help-flow` | `npm run dev`: `?`, button, esc            | `Statusline`, `EmptyState`, `DayPage`, `TodayContainer` |
| 8    | Bundle check and docs                 | PR1 | `npm run test -w @onti/web -- bundle-split`                           | `npm run build`: help only in a lazy chunk | `bundle-split.test.ts`, docs edits                      |

## Commit 1 `feat(web): help model with key coverage test` (unit 1)

- [x] 1.1 RED `apps/web/test/help-coverage.test.ts`: probe `reduceKey` (printable ASCII + Escape/Enter/Tab, idle/armed x target null/open/done x context flags); scan `src/features/**` for `key === '<x>'` literals (`/`, `#`, note `e`/`d`, tag-bar Tab/Enter); reverse check (every model key produced); `KeyHint` exhaustiveness; touch rows hold no keys; touch copy names `messages.mobile.*`, `actionSheet.done`, `capture.presets.*`, `day.prev/next`.
- [x] 1.2 GREEN `apps/web/src/messages.ts`: `help` block (title, open, close, sections, detail, touch, emptyHint, emptyHintTouch).
- [x] 1.3 GREEN `apps/web/src/features/help/help-model.ts`: `HINT_ROWS: Record<KeyHint, ...>`, extra rows (`?`, note `d`, capture `esc`), `buildHelp(touch)` (Capture, Days, On a note, Find), `helpKeys()`.
- [x] 1.4 Prove removing a row fails the test (spec "Coverage"); refactor.

## Commit 2 `test(web): capture examples run through the R11 parser` (unit 2)

- [x] 2.1 RED `apps/web/test/help-examples.test.ts`: per-`input` expectation (title, tags, due) with `parseCapture` at Wed 09:05 `America/Mexico_City` and Wed 18:00; every example has an expectation; `shows` names the day word and time.
- [x] 2.2 GREEN `messages.help.examples`: `Call back 17:00`, `Call back today 08:00`, `Call back tomorrow 9:00`, `Stretch +30m`, `Review PR +2h`, `Call back #client-a`, `Buy milk`; wire into `buildHelp` Capture.

## Commit 3 `feat(web): ? command in the Today key reducer` (unit 3)

- [x] 3.1 RED `apps/web/test/keys.test.ts`: `?` idle yields `{type:'help'}` for target null/open/done; armed `?` disarms, no command; `availableKeys` unchanged. Extend `use-today-rows` test: `onHelp` called, `run` excludes `'help'`.
- [x] 3.2 GREEN `features/today/keys.ts` (`{type:'help'}`, `?` branch), `use-today-rows.ts` (`bar.onHelp()`). Coverage test from commit 1 stays green.

## Commit 4 `feat(web): focus trap hook` (unit 4)

- [x] 4.1 RED `apps/web/test/use-focus-trap.test.tsx`: focus-in on the close button, Tab/Shift+Tab wrap, Escape calls `onEscape` with `preventDefault`, restore to `returnTo` if connected, recovery when focus is on body.
- [x] 4.2 GREEN `features/help/use-focus-trap.ts`.

## Commit 5 `feat(web): help dialog and content` (unit 5)

- [x] 5.1 RED `apps/web/test/help-dialog.test.tsx`: `role=dialog`, `aria-modal`, name from `h2`, close button, esc, backdrop click, four sections, no touch wording on desktop, touch content at <= 640 px, desktop portal vs mobile inline (stub `matchMedia`); no user-facing literals outside messages [static].
- [x] 5.2 GREEN `features/help/{HelpContent,HelpDialog}.tsx` (+ CSS module stubs), using `useNarrow()` and `useFocusTrap`.

## Commit 6 `style(web): help dialog tokens and fade` (unit 6)

- [x] 6.1 RED `apps/web/test/help-css.test.ts`: no `--core-*`, raw hex, px font size or raw duration; no vermilion (`--color-date`); keyframes touch only `opacity`; resolved duration <= 150 ms normal and reduced; close button `--size-target`; `--focus-ring`.
- [x] 6.2 GREEN `features/help/{HelpDialog,HelpContent}.module.css`: scrim, card width, sticky header on mobile, `--motion-crossfade` and `--ease-paper`.

## Commit 7 `feat(web): open help from Today` (unit 7)

- [x] 7.1 RED `statusline.test.tsx`: no button without `onHelp`; with it a "?" button (`aria-haspopup`, label from messages, 44 px CSS) calls back with the element; shown at every width. RED `empty-state.test.tsx`: hint text key vs touch, plain text not a button, every empty variant.
- [x] 7.2 GREEN `Statusline.tsx`/`.module.css` (button, 44 px bar), `EmptyState.tsx` (`hint` prop).
- [x] 7.3 RED `apps/web/test/today-help-flow.test.tsx`: `?` and button open; none on load; `?` while open keeps one dialog; `c / # [ j x` inert; capture bar typing `?` does not open; esc returns focus to row or button; esc does not clear a tag filter; mobile hides `MobileBar` and restores it; All notes and note view have no `?`.
- [x] 7.4 GREEN `TodayContainer.tsx` (`helpOpen`, `returnTo`, `openHelp(from)`, `bar.open`, `searchAvailable`), `DayPage.tsx` (lazy `HelpDialog` under `Suspense fallback={null}`, hide `MobileBar` while open, transparent backdrop on mobile, pass `hint` to `EmptyState`).

## Commit 8 `test(web): pin the lazy help chunk` and docs (unit 8)

- [x] 8.1 RED `apps/web/test/bundle-split.test.ts`: only `DayPage` imports `HelpDialog`, and only through `import()`. GREEN if wiring is already lazy; fix otherwise.
- [x] 8.2 `docs/backlog.md`: add the SG10 gap "↵ open/fold body" (pre-existing drift, not implemented, help omits it).
- [x] 8.3 `docs/roadmap.md`: mark Slice 9 done (SG10 unchanged).

## Verify and delivery

- [x] 9.1 `npm run verify` and `npm run build`; record main-chunk gzip vs `origin/main` (help only in the lazy chunk). Result: main JS 178.98 kB gzip on `origin/main` (914fa61) vs 179.81 kB (+0.83 kB: copy, button, hint, wiring); main CSS 4.58 vs 4.63 kB gzip; lazy `HelpDialog` chunk 1.76 kB JS + 0.74 kB CSS gzip.
- [ ] 9.2 HUMAN: manual smoke at 1280x720 and 375x667, light and dark, reduced motion, keyboard-only: `?` and button open, Tab wrap, esc, focus return, dock sheet replaces bars, statusline 44 px (boards 03/05), empty-state hint.
- [ ] 9.3 HUMAN: open the PR (ask before push), label `size:exception`, note the config 400-line contradiction.
