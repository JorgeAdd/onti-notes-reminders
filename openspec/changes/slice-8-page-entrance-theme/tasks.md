# Tasks: Slice 8 — Page entrance and theme override

## Review Workload Forecast

| Field                   | Value                                                                         |
| ----------------------- | ----------------------------------------------------------------------------- |
| Estimated changed lines | ~800-850 incl. tests and docs (c1 180, c2 170, c3 110, c4 130, c5 200, c6 40) |
| 400-line budget risk    | High (800 review budget is borderline; c1 and c5 are the largest)             |
| Chained PRs recommended | No (single-pr; no chain)                                                      |
| Suggested split         | Single PR, 6 ordered work-unit commits                                        |
| Delivery strategy       | single-pr                                                                     |
| Chain strategy          | size-exception                                                                |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

Reason: the strategy is `single-pr` with an 800-line budget including tests. If the final diff exceeds 800, the PR records `size:exception` (do not chain). Trim CSS and test helpers first.

Global checks for every commit: `npm run verify` green (rule 22, never `--no-verify`); conventional message, no co-author or AI attribution; stage by explicit path; tests in the same commit; tokens only, copy in `messages.ts`; order RED, GREEN, refactor; prompts in `prompts/durante/` (rule 7); no push without asking (rule 6). No header rule exists: no `--entrance-rule-*`, `.rule`, `.ruled`.

### Suggested Work Units

| Unit | Goal                                      | Focused test command                                          | Runtime harness                        | Rollback boundary                                       |
| ---- | ----------------------------------------- | ------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------- |
| 1    | Tokens, entrance CSS module, static tests | `npm run test -w @onti/web -- entrance-tokens`                | N/A (CSS only, not wired)              | `tokens.css` additions, `entrance.module.css`, 2 tests  |
| 2    | Entrance flag wired to sheets             | `npm run test -w @onti/web -- entrance-once`                  | `npm run dev -w @onti/web`, full load  | `lib/entrance.ts`, `data-entrance` and `composes` lines |
| 3    | Desk-only pending, 400 ms status          | `npm run test -w @onti/web -- pending-states today-container` | Dev server with throttled `/today`     | `use-after-delay.ts`, `TodayContainer` gate             |
| 4    | Theme module and inline script            | `npm run test -w @onti/web -- theme.test theme-script`        | Dev server, reload per stored value    | `theme.ts`, `index.html` script, 2 tests                |
| 5    | ThemeControl, placements, messages        | `npm run test -w @onti/web -- theme-control`                  | Dev server 1280x720 and 375x667        | `features/theme/*`, `showTheme`, `messages.theme`       |
| 6    | Size check and docs                       | `npm run build -w @onti/web`                                  | Build output gzip comparison vs `main` | docs files only                                         |

## Commit 0: Branch

- [ ] 0.1 Work on `feat/slice-8-page-entrance-theme`; confirm the brief and SG15/SG16/SG18/SG19 docs already landed in their own commits (rule 14).

## Commit 1: `feat(web):` entrance tokens and CSS module (~180 lines)

- [ ] 1.1 RED: create `apps/web/test/css-tokens.ts` (parse `:root`, overlay mobile and reduced blocks, resolve `var()`, read `from` keyframes and `animation` order).
- [ ] 1.2 RED: `apps/web/test/entrance-tokens.test.ts`: seven roles with exact values; no `--entrance-rule-*`, `--ease-enter/exit`, overshoot; mobile block precedes reduced block; reduced remaps (incl. `--entrance-delay-bar`); first frame equals rest (alone and with mobile); delays 0 ms; totals <= 500 ms; capture bar opacity only; only `--motion-*`/`--ease-*`/`--entrance-*`; no `transition` in `src/**/*.css`; no component entrance media queries; no row or field stagger.
- [ ] 1.3 GREEN: `apps/web/src/styles/tokens.css`: seven roles after the motion roles, `max-width: 640px` remap of `--entrance-rise`, reduced-motion remaps.
- [ ] 1.4 GREEN: create `apps/web/src/styles/entrance.module.css` (`sheet-in`, `date-in`, `last-in`; `.sheet`, `.date`, `.last` under `[data-entrance]`, `backwards`).
- [ ] 1.5 `npm run verify`; commit.

## Commit 2: `feat(web):` entrance on sheets (~170 lines)

- [ ] 2.1 RED: `apps/web/test/entrance-once.test.tsx`: attribute on first `DayPage`/`AuthForm` mount, absent on the next; fresh module resets; no replay on re-render, refetch, optimistic done/snooze, day navigation, theme click (same node); sign-in after the card gets none; All notes round trip gets none; StrictMode once; `TodayStatus` does not consume the flag; no skip control, typing and Sign out work while attribute is set; card has sheet class, fields none.
- [ ] 2.2 GREEN: create `apps/web/src/lib/entrance.ts` (`useEntrance`, `resetEntranceForTests`).
- [ ] 2.3 GREEN: `DayPage.tsx` and `.module.css` (`data-entrance`, `.desk` composes `sheet`), `DateColumn` date block composes `date`, `MobileBar.module.css` `.bar` composes `last`, `AuthForm.tsx` and `.module.css` (`.page` composes `sheet`).
- [ ] 2.4 `npm run verify`; commit.

## Commit 3: `feat(web):` desk-only pending and 400 ms status (~110 lines)

- [ ] 3.1 RED: `apps/web/test/pending-states.test.tsx` (fake timers): `App` empty while `getSession` pending; `TodayStatus` absent at 399 ms, present at 400 ms; never for a fast load; immediate on error; timer cleared on unmount.
- [ ] 3.2 RED (same commit): update `apps/web/test/today-container.test.tsx` lines 56-61 to await the delayed status.
- [ ] 3.3 GREEN: create `apps/web/src/features/today/use-after-delay.ts` (`useAfterDelay`, `STATUS_DELAY_MS = 400`); gate `TodayStatus` in `TodayContainer.tsx` (error or elapsed, else `null`). Keep `App.tsx` `return null`.
- [ ] 3.4 `npm run verify`; commit.

## Commit 4: `feat(web):` theme module and inline script (~130 lines)

- [ ] 4.1 RED: `apps/web/test/theme.test.ts`: `themeFromStored` (light, dark, null, `''`, `sepia`, `LIGHT`); `applyTheme` set/remove; `storeTheme` writes, removes, swallows throwing `setItem`/`removeItem`/null storage; `appliedTheme`.
- [ ] 4.2 RED: `apps/web/test/theme-script.test.ts`: script in `<head>`, classic, before entry script; run for light, dark, none, invalid, throwing `getItem`, throwing getter, undefined storage; parity with `themeFromStored`; contains `THEME_KEY` value.
- [ ] 4.3 GREEN: create `apps/web/src/features/theme/theme.ts` (design Interfaces).
- [ ] 4.4 GREEN: `apps/web/index.html`: inline script exactly as in design.
- [ ] 4.5 `npm run verify`; commit.

## Commit 5: `feat(web):` ThemeControl and placements (~200 lines)

- [ ] 5.1 RED: `apps/web/test/theme-control.test.tsx`: radiogroup named by `messages.theme.label`, three radios, one checked, initial from the DOM; click applies and stores; arrows move; failing write keeps choice; remount shows applied; no network call; no global key changes theme; present in `DayPage` column and sign-in card, absent in `NotesPage` and status card; labels equal messages; source has no copy literals; CSS has `--size-target`, `--focus-ring`, ink checked state, no `--color-date`, no `transition`.
- [ ] 5.2 GREEN: `apps/web/src/messages.ts` `theme: {label, system, light, dark}` (append-only).
- [ ] 5.3 GREEN: create `features/theme/ThemeControl.tsx` and `ThemeControl.module.css` (design Decision 7).
- [ ] 5.4 GREEN: `DateColumn.tsx` `showTheme?` prop (set by `DayPage` only); `AuthForm.tsx` renders the control last in the card.
- [ ] 5.5 `npm run verify`; commit.

## Commit 6: `docs:` size check and verify report (~40 lines)

- [ ] 6.1 Build `main` (`9403f16`) and the branch with `npm run build -w @onti/web`; for `dist/assets/*.css`, `dist/assets/*.js`, `dist/index.html` run `gzip -c <file> | wc -c`; compare by name. Added gzip CSS+JS (incl. inline script) must be <= 3072 B; record both tables in the PR.
- [ ] 6.2 Manual smoke (theme x motion x width, no flash, no layout shift, no shadow pop); write the results to `openspec/changes/slice-8-page-entrance-theme/verify-report.md`.
- [ ] 6.3 `docs/roadmap.md` and `docs/backlog.md`: mark Slice 8 and keep cross-device sync in backlog.
- [ ] 6.4 `npm run verify` and `npm run build`; commit.

## PR

- [ ] 7.1 Save session prompts in `prompts/durante/` (rule 7).
- [ ] 7.2 ASK the human before pushing (rule 6). Open the PR to `main`; add `size:exception` if the diff exceeds 800 lines.
