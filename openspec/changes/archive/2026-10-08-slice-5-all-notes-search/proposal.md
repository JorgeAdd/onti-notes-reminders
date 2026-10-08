# Proposal: Slice 5 — All notes and text search

## Intent

Make every note findable. Serves `docs/product/brief.md` §5 and `docs/roadmap.md` slice 5. Plain notes (slice 2 Q1) are invisible today and the Today page cannot search. The `notes.search` tsvector and GIN index already exist (ADR-003 decision 6), so this slice is an endpoint, a repository method and one web view. No migration.

## Scope

### In Scope

1. **API:** `GET /notes?q=` (R13). tsvector `simple`, word-prefix tsquery built from sanitized tokens, never raw input. Without `q`: all notes, newest first. Max 50, no pagination.
2. **Ownership:** scoped to the JWT subject (R15); no token is 401 (C11).
3. **Port:** `NoteRepository` list/search method, in-memory fake and Postgres adapter; use case `search-notes.ts`.
4. **Web view:** All notes replaces the day page (same date column, paper look, dock, statusline). `/` opens it with search focused; mobile bar "Search" (SG14); esc or "Back to today" returns. Server search as you type. Statusline `SEARCH · term · n of 15` (SG10). No URL state.
5. **Rows:** title, tags, due, done strike, ~120-char plain-text excerpt. Read-only (no `x`/`s`/`z`); statusline lists working keys only.
6. **Demo seed:** dataset bodies so C9 matches title plus body on real data.
7. **Last commit, after slice 3 merges:** All-notes tag filter reusing slice 3's `#` tag bar and `filterByTag`.

### Out of Scope

Day navigation and day-page tag filter (slice 3); note edit and markdown (slice 4); push (slice 6); highlighting, pagination, substring matching, `pg_trgm`.

## Capabilities

### New Capabilities

- `notes-search`: All notes view, `GET /notes`, query sanitizing, excerpt, ownership, key and mobile entry.

### Modified Capabilities

- `demo-seed`: seed writes dataset bodies.
- `today-page`: `/` key, mobile Search button, statusline SEARCH mode.

## Decisions (human-approved)

| #   | Decision                                                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q5  | Text search first; the All-notes tag filter is slice 5's LAST commit, after slice 3 merges, reusing slice 3's `#` tag bar and `filterByTag`                                             |
| Q6  | Full view replacing the day page; `/` opens it focused; mobile "Search"; esc or "Back to today" returns; newest first; server-side as you type; `SEARCH · term · n of 15`; no URL state |
| Q7  | Rows: title, tags, due, done strike, ~120-char plain-text excerpt (never HTML); read-only; statusline shows only working keys                                                           |
| Q8  | Seed adds dataset bodies; word-prefix on the existing tsvector (no `pg_trgm`, no migration); max 50, newest first, no pagination, no highlighting; R15/C11 tests                        |

## Approach

New files first: `application/search-notes.ts`, `apps/web/src/features/notes/*`, a shared notes-list schema. Append-only edits to shared files (own messages group, new `ServerDeps` fields last, exports last in `index.ts`). View switch is in-memory, no router; lazy-load the view (bundle already large).

## Parallel work

Slice 3 is built in the main checkout and merges FIRST. It extends `GET /today` and does not touch the repository. Slice 5 owns `GET /notes`, the list/search method, body and `created_at` ordering. Rebase after slice 3; expect small conflicts in `keys.ts`, `messages.ts`, `MobileBar.tsx`.

## Affected Areas

| Area                                                  | Impact   | Description                                   |
| ----------------------------------------------------- | -------- | --------------------------------------------- |
| `apps/api/src` (ports, adapter, server, `main.ts`)    | Modified | route, use case, Kysely `body` and `search`   |
| `apps/api/test`                                       | Modified | C9, R15, C11, sanitizing; Postgres tokenizing |
| `packages/shared/src`                                 | Modified | notes-list schema, excerpt helper             |
| `apps/web/src/features/notes`, `keys.ts`, `MobileBar` | New/Mod  | view, `/`, Search button, statusline          |
| `apps/api/src/.../seed-demo.ts`                       | Modified | bodies                                        |
| `openspec/specs`                                      | New/Mod  | one new, two deltas                           |

## Risks

| Risk                                                                    | Likelihood | Mitigation                                                               |
| ----------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| **Size: ~450-650 prod + ~700-1,000 test lines vs 800 single-pr budget** | High       | Resolved: one PR with `size:exception` (human, 2026-10-08, Engram #1097) |
| `simple` parser may tokenize URLs/hosts as one token (unverified)       | Med        | Test in real Postgres before design freezes                              |
| Query injection via tsquery syntax                                      | Med        | Sanitized tokens only; test operator characters                          |
| Merge conflicts with slice 3                                            | Med        | New files, append-only edits, rebase before last commit                  |
| No design board for All notes                                           | Med        | Reuse board 04 and SG8; flag gaps at design                              |

## Rollback Plan

Revert the PR; no migration, so no data rollback. Seeded bodies are harmless. The tag-filter commit reverts independently.

## Dependencies

Slice 2 archived; slice 3 merged before the last commit; schema, RLS, grants unchanged.

## Success Criteria

- [ ] C9 passes on title and body; R13 case-insensitive.
- [ ] Another user's notes never appear (R15); no token is 401 (C11).
- [ ] `/` and mobile Search open the view; esc returns; rows are read-only.
- [ ] Tag filter works on All notes after slice 3.
- [ ] `npm run verify` and "Verify and build" green.

## Open Questions

- Delivery split versus `size:exception`: **resolved: one PR, `size:exception`** (human approval for slices 3 and 5, 2026-10-08, Engram #1097, topic `sdd/slices-3-5/delivery`).
