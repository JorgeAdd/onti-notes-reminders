# Tasks: Slice 3 — Day navigation and tag filter

## Review Workload Forecast

| Field                   | Value                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Estimated changed lines | ~3,120 incl. tests and docs (c1 20, c2 370, c3 505, c4 355, c5 470, c6 425, c7a 350, c7b 290, c8 300, c9 35) |
| 400-line budget risk    | High (800 review budget also exceeded; c3 and c5 are the riskiest)                                           |
| Chained PRs recommended | No (human approved one PR with `size:exception`, Engram #1097)                                               |
| Suggested split         | Single PR, 10 ordered work-unit commits, 4 apply batches (each <= ~1,200 lines)                              |
| Delivery strategy       | exception-ok                                                                                                 |
| Chain strategy          | size-exception                                                                                               |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

Apply batches (attempt ledger, lines include tests and docs):

| Batch | Commits    | Lines  |
| ----- | ---------- | ------ |
| A     | 0, 1, 2, 3 | ~895   |
| B     | 4, 5       | ~825   |
| C     | 6, 7a, 7b  | ~1,065 |
| D     | 8, 9, PR   | ~335   |

Global checks for every commit: `npm run verify` green (rule 22, never `--no-verify`); conventional message, NO Co-Authored-By or AI attribution (rule 5); tests and docs in the same commit; strict TDD (RED before GREEN); stage by explicit path only (never `git add -A` or `.`); tokens only, strings in `messages`, targets >= `--size-target`, reduced motion via `--motion-*` (rules 8-13). Save prompts in `prompts/durante/` (rule 7). No push without asking (rule 6). Web commits record `npm run build -w @onti/web` bundle size (baseline main JS 591.44 kB).

Ownership gate (slice 5): the branch MUST NOT modify `apps/api/src/application/ports.ts` (NoteRepository), the Postgres note repository, `apps/api/test/fakes.ts`, `packages/shared/src/notes.ts`, `apps/api/src/domain/note.ts`, `apps/api/src/infrastructure/db/database.ts`. Checked in tasks 3.7, 5.9, 9.2.

### Suggested Work Units

| Unit | Goal                              | Focused test command           | Runtime harness                           | Rollback boundary                      |
| ---- | --------------------------------- | ------------------------------ | ----------------------------------------- | -------------------------------------- |
| 1    | Housekeeping docs                 | `npm run verify`               | N/A (docs only)                           | the three doc files                    |
| 2    | CONTRACT + calendar/shared domain | `npm run test -w @onti/shared` | N/A (pure functions)                      | `CONTRACT.md`, `domain/*`              |
| 3    | Response schema, assembly, patch  | `npm run test -w @onti/shared` | N/A (pure)                                | `today.ts`, `day-response.ts`, patch   |
| 4    | `/today?date&tag` API             | `npm run test -w @onti/api`    | Fastify `inject`                          | `get-today.ts`, route parse            |
| 5    | Web data layer                    | `npm run test -w @onti/web`    | `npm run dev -w @onti/web` vs API; bundle | `day-view*`, mutations, `App.tsx`      |
| 6    | Day navigation UI                 | `npm run test -w @onti/web`    | dev server, `[ ] t`; bundle               | keys, `DayNav`, chrome                 |
| 7a   | Tag filter control                | `npm run test -w @onti/web`    | dev server, `#`, tab, esc; bundle         | `TagBar`, `?tag=` wiring               |
| 7b   | Filtered page                     | `npm run test -w @onti/web`    | dev server, C8 view; bundle               | `OtherNotes`, header/status copy       |
| 8    | Mobile                            | `npm run test -w @onti/web`    | dev server at 375x667; bundle             | `MobileBar`, `DayNav` mobile, backdrop |
| 9    | Status docs + smoke               | `npm run verify`               | manual smoke 1280x720 and 375x667         | docs only                              |

## Commit 0: Branch

- [x] 0.1 Confirm branch `feat/slice-3-day-navigation-tag-filter` from `main`; PR targets `main`.

## Commit 1: `docs:` housekeeping (~20 lines)

- [x] 1.1 `openspec/changes/archive/2026-10-08-slice-2-capture-snooze/archive-report.md:107`: fix stale "#10 -> onboarding slice 3" line.
- [x] 1.2 `openspec/config.yaml:6,23`: web tests are jsdom + RTL + user-event, 244 tests.
- [x] 1.3 `docs/design/style-guide-decisions.md`: record Q4 board-04 deviations. Run `npm run verify`, commit (rule 14, own commit).

## Commit 2: `docs:`+`test:`+`feat(shared):` CONTRACT first (~370 lines)

- [x] 2.1 `docs/CONTRACT.md` first (rule 23): R1 any-day window, new R18 (other day: no carried, no NOW, time-only, viewed-day date block), R4 "{n} things on Wed 7", R5 other-notes count on other days and filtered views, R12 (known tag, Q2), D5/D6 navigation rows.
- [x] 2.2 RED: `packages/shared/test/calendar-date.test.ts`: Feb 30, `2026-1-5`, range 2000..2099, `addCalendarDays` across month/year/leap day, `localCalendarDate`, `dayWindow` 2026-03-08 NY = 23 h, 2026-11-01 = 25 h, Sat 7 -> Sun 8 -> Mon 9 no skip, windows tile over a year in NY, Mexico_City, Havana, 04:59Z/05:00Z on 2 Nov.
- [x] 2.3 RED: `day-page` tests (date arg: no carried off today, done stay, isToday; R18), `other-notes` tests (order dueAt, undated last, title, id; undated rows no date), `filterByTag` object tags with the C8 string test unchanged; R4/R5 wording cases.
- [x] 2.4 GREEN: `packages/shared/src/domain/calendar-date.ts`, `other-notes.ts`; modify `day-page.ts` (`date` calendar string), `tag.ts` (widening). If Havana tiling is red, fix `dayWindow` with `localTimeOn` gap rule.
- [x] 2.5 Run `npm run verify`; commit.

## Commit 3: `feat(shared):` schema, assembly, patch (~505 lines, High)

- [x] 3.1 RED: `today.test.ts`: `dayQuerySchema` (date range, repeated/empty, tag slug max 40), `todayResponseSchema` new required fields, nullable `others` dates.
- [x] 3.2 RED: `day-response.test.ts`: C8 (rail 1, others 4, hidden 10, otherCount 4), carried filtered, empty filtered "0 notes" with `hiddenCount = total`, `todayWindow` end as rollover instant.
- [x] 3.3 RED: `today-patch.test.ts`: views {today, today+tag, Tue 6, Fri 9} x {snooze h/t, done, undo}; snooze to another day (`otherCount+1`, filtered enters `others`); insert {matching, non-matching +1 hidden, other-day}; `replacesId` not counted twice; `tags` kept plus new slug.
- [x] 3.4 GREEN: `today.ts` (`dayQuerySchema`, `otherItemSchema`, response fields); create `day-response.ts` `buildDayResponse`; export in `index.ts` (append only).
- [x] 3.5 GREEN: generalize `today-patch.ts` `applyReminderChange` (view from page, universe = items + others, rebuild with `page.date`).
- [x] 3.6 Update web fixtures for the new required fields (`apps/web/test/*`); `npm run test -w @onti/web` green.
- [x] 3.7 Check: `git diff --name-only main...HEAD` plus staged contains none of the slice-5-owned files. `npm run verify`; commit.

## Commit 4: `feat(api):` `/today?date&tag` (~355 lines)

- [x] 4.1 RED: `apps/api/test/today.test.ts`: C8 on `jorge-week`; date past/future/today; date+tag; unknown tag, another user's tag, tag with zero notes -> `ValidationError`; NY DST dates; default `query = {}` keeps slice 1-2 tests green.
- [x] 4.2 RED: `server.test.ts`: 401 before 400; 400 for `date=2026-02-30`, `2026-1-5`, empty, repeated, `tag=Client-B`, empty, 41 chars, unknown, another user's, zero-notes; 200 valid known tag and today's own date; body round-trips schema.
- [x] 4.3 RED: `apps/api/test/day-parity.test.ts`: `applyReminderChange` equals real `makeGetToday` after the same change (same views x changes as 3.3).
- [x] 4.4 GREEN: `get-today.ts` (query, known-tag check from `listOwn`, `filterByTag`, `buildDayResponse`); `server.ts` one `dayQuerySchema` parse inside the existing route.
- [x] 4.5 Check slice-5 files untouched (`ports.ts`, `fakes.ts`, repo, `database.ts`). `npm run verify`; commit.

## Commit 5: `feat(web):` data layer (~470 lines, High)

- [ ] 5.1 RED: `day-view.test.ts`: `readView` drops syntax errors via `dayQuerySchema`, unknown params preserved, today writes no `d`, `]` at 2099-12-31 and `[` at 2000-01-01 no-ops, `dayKey`.
- [ ] 5.2 RED: `api.test.ts` `fetchToday(token, view)` URL; component tests: push on nav, back restores, `popstate`, redundant `d` dropped.
- [ ] 5.3 RED: write in flight then navigate -> rollback and success patch hit the stored key; actions blocked on placeholder; `c` allowed and no `cancelQueries` on a key without data; `onMutate` removes inactive `['day']`; settle invalidates `['day']`.
- [ ] 5.4 RED: rollover: past day + minute ticks no refetch; tomorrow viewed + midnight one refetch; URL 400 (`?d=garbage` no request; `?tag=nope` -> `replaceState` + one message line).
- [ ] 5.5 GREEN: create `features/today/day-view.ts`, `use-day-view.ts` (`useSyncExternalStore`); modify `lib/api.ts`, `App.tsx` `load(view)`, `TodayContainer.tsx` (`keepPreviousData`, `todayWindow` rollover), `mutations/use-reminder-actions.ts` (key in `Context`).
- [ ] 5.6 Append `messages.ts` error line.
- [ ] 5.7 Grep gate: `grep -rn "\['today'\]" apps/web/src apps/web/test` returns nothing (fix `reminder-actions.test.tsx:68`); only `day-view.ts` builds keys.
- [ ] 5.8 `npm run build -w @onti/web`; record bundle size (baseline 591.44 kB).
- [ ] 5.9 Check slice-5 files untouched. `npm run verify`; commit.

## Commit 6: `feat(web):` day navigation UI (~425 lines)

- [ ] 6.1 RED: `keys.test.ts`: `[ ] t` with `ctx`, `t` no-op on today, `s` then `t` still Tomorrow, `availableKeys` days/today hints only when working.
- [ ] 6.2 RED: component tests: `[` types `'[['`; viewed-day date block, header "{n} things on Wed 7", statusline day and counts; time-only rows (`showRelative` false); focus resets to first row; placeholder shows `view.date` with loading indicator; single `aria-live="polite"` region; `aria-current=date` on today; ‹ › Today `aria-label`s from messages; empty state per day.
- [ ] 6.3 GREEN: modify `keys.ts` (4th param defaulted), `TodayContainer`, `DayPage`, `DateColumn`, `PageHeader`, `Statusline`, `EmptyState`, `ItemRow` (`showRelative`), `use-today-rows.ts`; create `DayNav.tsx` (desktop text) + CSS Module; append `messages.day`.
- [ ] 6.4 `npm run build -w @onti/web`; record bundle size. `npm run verify`; commit.

## Commit 7a: `feat(web):` tag filter control (~350 lines)

- [ ] 7a.1 RED: `#` opens bar only when tags exist; Tab/Shift+Tab cycle from active tag; ↵ applies via `setView({tag})` push; esc order (armed snooze, bar, filter); filter persists across `[`; `aria-pressed`/`aria-current`; no hint when no tags; layer disabled while bar open.
- [ ] 7a.2 GREEN: lazy `TagBar.tsx` + CSS in dock, `keys.ts` (`tags`, `clearFilter`), `?tag=` wiring, `messages.filter`, `statusline.keys` hints.
- [ ] 7a.3 Bundle size recorded (main and lazy chunk). `npm run verify`; commit.

## Commit 7b: `feat(web):` filtered page (~290 lines)

- [ ] 7b.1 RED: C8 view (1 rail row, "Other notes with #client-b" 4 rows); dated rows show date+time, undated rows show NO date text; header "{n} notes" (page + others); muted "{hiddenCount} notes hidden"; `FILTER · #slug` mode; capture on filtered view: notice and `hiddenCount` +1 once.
- [ ] 7b.2 GREEN: `OtherNotes.tsx` + CSS (read-only, no focus), `PageHeader`, `DateColumn`, `Statusline`, capture notice, messages only.
- [ ] 7b.3 Bundle size recorded. `npm run verify`; commit.

## Commit 8: `feat(web):` mobile (~300 lines)

- [ ] 8.1 RED: ‹ › Today >= 44 px with labels; "Tags" button only when `onTags` passed (order search?, tags?, capture); chips with `aria-pressed`, "Clear #tag" chip; outside tap closes dock, keeps filter, opens no row sheet (backdrop swallows click); narrow note "{hiddenCount} notes hidden · #slug".
- [ ] 8.2 GREEN: `DayNav` mobile, `MobileBar` handler-prop buttons, `TagBar` `mobile` + backdrop, CSS tokens and reduced motion.
- [ ] 8.3 Bundle size recorded. `npm run verify`; commit.

## Commit 9: `docs:` status + smoke (~35 lines)

- [ ] 9.1 `docs/CONTRACT.md` verification status for C8, D5, D6, Q1; roadmap tick; smoke checklist text.
- [ ] 9.2 Final check: `git diff --name-only main...HEAD | grep -E "ports.ts|fakes.ts|packages/shared/src/notes.ts|domain/note.ts|database.ts|postgres-note"` returns nothing.
- [ ] 9.3 Manual smoke at 1280x720 and 375x667: seed Thu 8 14:30 `#client-b` (5 notes, 10 hidden), `[` to Wed 7, `t`, refresh and back keep view, `s t` then `]`, 2 Nov and 8 Mar with a New York profile, light/dark, reduced motion, no horizontal scroll. Record in PR with final bundle size.
- [ ] 9.4 `npm run verify`; commit.

## PR task

- [ ] P.1 Ask the human before pushing (rule 6). Open PR to `main`, label `size:exception`, commit-by-commit reading guide, bundle sizes (baseline 591.44 kB), smoke results, open-question defaults (R4 wording, no tag injected on capture, read-only others).
- [ ] P.2 Save prompts in `prompts/durante/` (rule 7). Merge only with green "Verify and build".
