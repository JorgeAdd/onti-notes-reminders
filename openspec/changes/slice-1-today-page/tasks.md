# Tasks: Slice 1 — Read-only Today page

## Review Workload Forecast

| Field                   | Value                                                                        |
| ----------------------- | ---------------------------------------------------------------------------- |
| Estimated changed lines | ~1,720 authored total (PR1 390, PR2 330, PR3 380, PR4 390, PR5 380, PR6 250) |
| 400-line budget risk    | Medium (PR4 High-risk: trim CSS first; PR1 Medium: split adapter/main.ts)    |
| Chained PRs recommended | Yes                                                                          |
| Suggested split         | PR1 -> PR2 -> PR3 -> PR4 -> PR5 -> PR6                                       |
| Delivery strategy       | ask-on-risk (split approved by human)                                        |
| Chain strategy          | feature-branch-chain                                                         |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

Reason for "No": every PR is estimated at or under 400. Re-forecast PR3/PR4 at task time; if one exceeds 400, trim as noted (not a new decision unless the split changes).

Accepted defaults: singular copy "1 thing today"; sign-out stays in the date column.

Tracker: `feat/slice-1-today-page` (draft, no-merge; only it merges to `main`, PR + green "Verify and build"). Each PR ends with `npm run verify` green. Conventional commits, one work unit per commit, no push without approval. Save prompts under `prompts/antes|durante|despues` (CLAUDE.md 7).

### Suggested Work Units

| Unit | Goal                         | PR / branch -> base                                              | Focused test                                      | Runtime harness                                                             | Rollback boundary                                 |
| ---- | ---------------------------- | ---------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------- |
| 1    | Shared schema + `GET /today` | PR1 `feat/slice-1-today-page-1-api` -> `feat/slice-1-today-page` | `npm run test -w @onti/api` and `-w @onti/shared` | Fastify `inject` in `server.test.ts`                                        | shared `today.ts`, API today files, API clock ban |
| 2    | Demo seed + docs             | PR2 `feat/slice-1-today-page-2-seed` -> PR1 branch               | `npm run test -w @onti/api -- seed`               | Manual `npm run seed:demo -w @onti/api -- --email <e>` dry-run then `--yes` | `apps/api/scripts/*`, seed docs                   |
| 3    | Web foundation               | PR3 `feat/slice-1-today-page-3-web-foundation` -> PR2 branch     | `npm run test -w @onti/web`                       | `npm run build -w @onti/web` (record bundle size)                           | web test setup, `lib/clock.ts`, lint ban, helpers |
| 4    | Page shell + 401 flow        | PR4 `feat/slice-1-today-page-4-shell` -> PR3 branch              | `npm run test -w @onti/web`                       | `npm run dev -w @onti/web` against seeded API                               | restores hello-world on revert                    |
| 5    | Items, statusline, empty     | PR5 `feat/slice-1-today-page-5-items` -> PR4 branch              | `npm run test -w @onti/web`                       | dev server, seeded C4                                                       | CarriedGroup/ItemRow/Statusline/EmptyState        |
| 6    | Hour rail + CONTRACT status  | PR6 `feat/slice-1-today-page-6-rail` -> PR5 branch               | `npm run test -w @onti/web`                       | dev server, desktop+mobile widths, dark                                     | HourRail, CONTRACT.md status                      |

## PR 1: Shared schema + API (~390 lines)

PR body: `GET /today` end to end behind JWT, C1/C3/C4/C7 proven with fixed Clock. Out: seed, web. Next: PR2.

- [x] 1.1 RED: `packages/shared/test/today.test.ts` codec round-trip (ISO string <-> Date). Also confirm zod 4.6.x `parse` decodes (Open Question 3; fallback client-only `z.coerce.date()`). Decision 1.
- [x] 1.2 GREEN: `packages/shared/src/today.ts` (`todayResponseSchema`, types), export from `src/index.ts`. Decision 1.
- [x] 1.3 Add subpath export `./fixtures/jorge-week` in `packages/shared/package.json`; confirm shared tsconfig/eslint cover `test/`. Decision 15.
- [x] 1.4 RED: `apps/api/test/today.test.ts` with fixed `Clock` + fake `NoteRepository` from `jorge-week`: C4, C3, C7, timezone fallback, DST day (D1/D2). Spec "GET /today API".
- [x] 1.5 Create `apps/api/src/domain/note.ts` (`NoteRecord extends PageNote`) and add `Clock`, `NoteRepository` to `application/ports.ts`. Decisions 3, 4.
- [x] 1.6 Extract shared UTC fallback constant; update `application/get-me.ts`; GREEN `application/get-today.ts` (`makeGetToday`). Decisions 3, 5.
- [x] 1.7 `infrastructure/clock/system-clock.ts`; add the clock-ban lint for API in `eslint.config.js` (adapter path exempt). Decision 4, rule 16.
- [x] 1.8 RED: `apps/api/test/server.test.ts` for `/today`: 401 no/forged token, 200 shape, Ana never sees Jorge (R15), 500 hides internals.
- [x] 1.9 GREEN: `db/database.ts` types (`notes`, `tags`, `note_tags`), `db/postgres-note-repository.ts` (`asUser` + `where user_id`, two queries), `http/server.ts` route, wire `main.ts`. Decision 3 (split off if PR >400).
- [ ] 1.10 Run `npm run verify` (green, done); open PR1 against the tracker (orchestrator).

## PR 2: Seed + docs (~330 lines)

PR body: `seed:demo` loads the 15-note scenario with RLS-scoped writes. Out: web. Prior: PR1.

- [x] 2.1 RED: `apps/api/test/demo-scenario.test.ts`: scenario->rows for Mon 12 Jan (2 carried, 2 today, 1 tomorrow, N1 done Tue 17:00, 11 others), deterministic UUIDv5, offsets match `jorge-week`. Decision 11; demo-seed "Relative dates".
- [x] 2.2 GREEN: `apps/api/scripts/demo-scenario.ts` (pure, `localTimeOn`). Decisions 8, 11.
- [x] 2.3 RED: `planSeed` tests: 15 created/0, then 0 created/15 unchanged; user scope; refusal on 0 or 2 users; no target = non-zero exit. Decision 10; "Idempotency", "User scope", "Explicit target".
- [x] 2.4 GREEN: `planSeed` plus `scripts/seed-demo.ts` (`--email`/`--user-id`, dry-run default, `--yes`, `--timezone`, `--remove`, report). Add `seed:demo` to `apps/api/package.json`; include `scripts` in `tsconfig.json`. Decisions 8-10; "Report".
- [x] 2.5 Docs: seed usage in README or `docs/` (prerequisites, flags, `--remove`, UTC-timezone risk). Schema docs untouched (no migration).
- [x] 2.6 Manual: dry-run then `--yes` then repeat against real Postgres, then GET /today at C4; record result in the PR. Run `npm run verify`.

## PR 3: Web foundation (~380 lines)

PR body: web test runner, clock ban, pure helpers, `fetchToday`. No UI change. Prior: PR2. Tasks before 3.2 cannot be test-first: the web runner does not exist yet.

- [x] 3.1 Non-TDD (no runner): `apps/web/vitest.config.ts` (react, jsdom, `test.env` VITE_*), `test/setup.ts`, dev deps, `test` script, tsconfig includes. Decision 7.
- [x] 3.2 Smoke test proving jsdom and jest-dom run; `npm run test` includes web.
- [x] 3.3 RED then GREEN: `lib/clock.ts` + web clock ban in `eslint.config.js` (exempt `lib/clock.ts`). Decision 4.
- [x] 3.4 RED: `test/format.test.ts` (relative labels "late 15h05", "in 25 min", C7 "late 1 min"; `Intl` date parts), then GREEN `features/today/format.ts` + `messages.today` functions, incl. singular "1 thing today". R4, R6, C7; Decision 2.
- [x] 3.5 RED then GREEN: `rail-model.ts` (compact >6, gap row, NOW placement, DST day). Decision 2, SG7.
- [x] 3.6 RED then GREEN: `useNow` (fake timers, skew = server now - dataUpdatedAt, 1-min tick). Decision 6; C7.
- [x] 3.7 RED then GREEN: `fetchToday` + `UnauthorizedError` in `lib/api.ts` (401 -> typed error, others generic). Decision 12.
- [x] 3.8 `npm run verify` and `vite build`; record bundle size.

## PR 4: Page shell + 401 flow (~390 lines; trim CSS first)

PR body: TodayContainer replaces hello-world; loading, error/retry, session-expired. Out: items, rail. Prior: PR3.

- [x] 4.1 RED: `AuthForm` shows `messages.auth.sessionExpired` (`role="status"`); clears on next attempt. Decision 12.
- [x] 4.2 RED: `TodayContainer` loading, 5xx error + retry, focus refetch, rollover refetch at `window.end`, 401 -> `onSessionExpired` once with no error state. Spec "Empty, loading and error", "Live labels".
- [x] 4.3 GREEN: `TodayContainer` (TanStack `useQuery`, retry off for `UnauthorizedError`), `DayPage` frame, `DateColumn` (vermilion only here, sign-out >= 44 px), `PageHeader` (single `h1`, count copy). SG2, SG13; Decisions 6, 14; landmarks.
- [x] 4.4 Wire `QueryClientProvider` in `main.tsx`; `App.tsx` `onSessionExpired` -> `signOut()` + `expired` flag -> `AuthContainer` -> `AuthForm`; `messages.auth.sessionExpired`.
- [x] 4.5 CSS Modules (tokens only, named-areas grid, mobile 640 px); delete `features/me/*`, `fetchMe`, `messages.me`.
- [x] 4.6 `npm run verify`; manual dev run, check light/dark.

## PR 5: Items + Statusline + EmptyState (~380 lines)

PR body: carried group, item rows, statusline, empty state. Out: HourRail. Prior: PR4.

- [ ] 5.1 RED then GREEN: `CarriedGroup` "Still open from Tue 6" oldest first, "late 15h05"; `ItemRow` (struck when done, no actions, tags as plain text, no `N#`). R2, R3, SG3, SG12; C3/C4.
- [ ] 5.2 RED then GREEN: `Statusline` `<footer>` "4 today · 2 carried · 15 notes", weekday/day, ticking clock; move `messages.me.modeNormal` to `messages.statusline.mode`; no key hints. Decision 13; "Statusline".
- [ ] 5.3 RED then GREEN: `EmptyState` (calm copy, no onboarding, same layout) + "{n} other notes on the back of the pad" (R5, SG8).
- [ ] 5.4 DayPage render test for C4 (header "4 things today", header "left today" when done), landmarks, one `h1`. CSS per component.
- [ ] 5.5 `npm run verify`.

## PR 6: HourRail + CONTRACT status (~250 lines)

PR body: rail with NOW line, gaps, compact mode; marks C1/C3/C4/C7 verified. Prior: PR5.

- [ ] 6.1 RED then GREEN: `HourRail` from `rail-model` (per-hour desktop, one "10-15" gap row mobile via CSS, NOW line steps per minute, compact >6, N4 "in 25 min"->"in 24 min"). Board 03/05, SG7, SG15; no animation.
- [ ] 6.2 CSS Module: `--focus-ring`, >= `--size-target`, reduced-motion needs only token remap. Decision 14, rules 8-11.
- [ ] 6.3 Docs: `docs/CONTRACT.md` verification status for C1/C3/C4/C7 (no rule numbers changed; rule 23).
- [ ] 6.4 Final `npm run verify`; manual boards 03/05/09/11 check, no horizontal scroll; promote tracker PR from draft.
