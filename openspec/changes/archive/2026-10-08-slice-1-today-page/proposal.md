# Proposal: Slice 1 — Read-only Today page

## Intent

Deliver brief Moment 3 (the morning view) and its success criterion, "a morning view of only today's items, with their context", as a real page backed by the API. Today the web shows a hello-world `DayPage` and `GET /me` only. Serves `docs/product/brief.md` §3 (Moment 3) and §2 (success for Jorge).

## Scope

### In Scope

- `GET /today`: day page from shared `buildDayPage`/`todayWindow`, Clock port, profile timezone, `authenticated` (RLS); read-side notes repository.
- Today UI, desktop + mobile, light + dark: header count, carried group, hour rail + NOW line, struck done items (read-only), other-notes count, statusline.
- Empty state: same page, empty rail, calm copy (no onboarding).
- Demo seed script: scenario dataset relative to the current date, per account, idempotent, scoped to that user only.
- Web test setup (Vitest + jsdom + Testing Library), required by strict TDD.

### Out of Scope

- Done/undo, snooze, capture, day navigation (slices 2–3+); tag filter, search.
- Timezone-on-first-login (slice 7); welcome/onboarding.
- Day-rollover tear-off animation (SG15), deferred.

## Capabilities

### New Capabilities

- `today-page`: read-only day page (API read + web rendering + empty state + live labels).
- `demo-seed`: relative-date scenario seed for a given account.

### Modified Capabilities

- None (no CONTRACT rule changes).

## Approach

Reuse tested shared domain; API stays hexagonal (use case + port + Postgres adapter, time via Clock). Web: container fetches `/today`, presentational components use semantic tokens, copy in `messages.ts`.

Assumptions (correctable at review):

- NOW line and relative labels tick every minute; data refetched on focus and at local midnight.
- Animated parts honor reduced motion (SG16).

## Affected Areas

| Area                                                   | Impact       | Description                                   |
| ------------------------------------------------------ | ------------ | --------------------------------------------- |
| `packages/shared/src`                                  | Modified     | `/today` response schema/types                |
| `apps/api/src` + `test`                                | New          | use case, port, repository, route             |
| `apps/web/src/features/today`, `messages.ts`, `styles` | New/Modified | UI replaces `DayPage` hello-world             |
| `apps/web` config                                      | New          | Vitest/jsdom setup                            |
| `scripts/seed-demo.*`                                  | New          | seed script                                   |
| `docs/`                                                | Modified     | seed usage; `CONTRACT.md` verification status |

## Acceptance anchors

- CONTRACT: R1–R6, R15, R16; rows C1, C3, C4, C7.
- Design: SG1–SG8, SG13–SG16, SG18; boards `03`/`05` (light), `09`/`11` (dark).
- Data: `docs/product/scenario-dataset.md`; ADR-001..003.

## Risks

| Risk                                                                                                                      | Likelihood | Mitigation                                            |
| ------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------- |
| Exceeds 400-line budget: ~900–1100 authored lines (shared 30, API 200, web setup 60, UI+CSS+tests 500, seed 200, docs 30) | High       | Chain 3 PRs: API+shared; web test setup+UI; seed+docs |
| Seed touches other users' data                                                                                            | Low        | Scope by user id; idempotent test                     |
| Midnight/DST edges in live ticks                                                                                          | Med        | Clock port; D1/D2 style tests                         |

## Rollback Plan

Each PR reverts independently: remove `/today` route, restore hello-world `DayPage`, delete seed script. No migration, so no data rollback; seeded demo rows are removable by the script's own user-scoped cleanup.

## Dependencies

- Existing schema/RLS; demo account; shared domain already tested.

## Success Criteria

- [ ] Demo account at the C4 moment shows carried items, rail, header and other-notes count per C4.
- [ ] C1/C3/C7 behaviors hold in API tests with an injected clock.
- [ ] 401 without token; no cross-user data (R15).
- [ ] `npm run verify` and "Verify and build" green; both themes and mobile meet SG13 targets.

## Open Questions

- None blocking.
