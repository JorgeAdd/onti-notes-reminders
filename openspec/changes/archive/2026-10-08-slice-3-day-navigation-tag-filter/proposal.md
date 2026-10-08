# Proposal: Slice 3 — Day navigation and tag filter

## Intent

Let the user leave today and find notes by tag. Serves `docs/product/brief.md` (day page, tags), `docs/roadmap.md` slice 3, CONTRACT R1, R3, R6, R12, matrix C8. Today only `/today` exists: no other day, and notes without a reminder (C8) cannot be reached.

## Scope

### In Scope

- **Day navigation (SG10):** `[` / `]` previous/next day, `t` back to today.
- **Tag filter (R12):** `#` opens tag bar, tab cycles, ↵ applies, esc clears.
- **API:** `GET /today?date=&tag=` over `listOwn` + shared `filterByTag`; adds `others`, `hiddenCount`, tag summary; 400 on bad input.
- **Web state:** `?d=&tag=` via History API, no router library; key `['day', date|'today', tag|null]`; optimistic patch generalized to the viewed day and `others`.
- **Mobile minimal:** see Q3.
- **Docs first (rule 23):** CONTRACT day-page rule and R12 clarifications with tests; today-page spec rewritten (hints and out-of-scope lines).
- **Housekeeping:** fix `archive-report.md:107` (PR #10 gave only the theme override to slice 4; onboarding stays Unassigned pending a Slice 8 design brief); fix `openspec/config.yaml` testing note (apps/web has 244 tests).

### Out of Scope

Search, All notes (slice 5); editing, markdown, theme override (slice 4); push (slice 6); onboarding.

## Capabilities

### New Capabilities

- `day-navigation`: viewed-day state, URL query, non-today page rules.
- `tag-filter`: filter scope, others section, header and statusline.

### Modified Capabilities

- `today-page`: hint and out-of-scope rules.
- `reminder-actions`: actions allowed on any viewed day.

## Decisions (human-approved)

| #   | Decision                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q1  | Non-today day page: only items due that local day, NO carried group; done/snooze/undo allowed; rows show the time without relative duration; `t` returns to today. Goes into docs/CONTRACT.md first with tests (rule 23).                                          |
| Q2  | Filter scope: carried items filtered too; "the rest" = every note with the tag not on the viewed day's rail (undated and other-day notes, showing their date); filter persists across day navigation; label "Other notes with #tag" (not board 04 "NO DATE", SG8). |
| Q3  | Mobile minimal: ‹ › beside the date block plus "Today" when not on today (≥ 44 px); "Tags" button in the bottom bar opens tag chips in the dock; "Clear #tag" chip clears the filter; an outside tap only closes the dock (filter stays). No design pass.          |
| Q4  | Header keeps R12 ("{n} notes", "{total − n} notes hidden"); borrow only statusline `FILTER · #client-b` from board 04; deviation recorded in `docs/design/style-guide-decisions.md`.                                                                               |

## Approach

Extend `/today` (no new route; backward compatible). Filter server-side, so no payload growth. Generalize `buildDayPage` with a day anchor. Prefix-invalidate `['day']` on settle, since a snooze moves an item between days. Absent `d` follows today across midnight.

## Affected Areas

| Area                                                                    | Impact   | Description                             |
| ----------------------------------------------------------------------- | -------- | --------------------------------------- |
| `packages/shared/src`, `test`                                           | Modified | day anchor, date parse, response schema |
| `apps/api/src` (`get-today`, `server`), `test`                          | Modified | query params, `others`, C8 test         |
| `apps/web/src/features/today`, `api.ts`, `messages.ts`                  | Modified | keys, URL state, patch, TagBar, mobile  |
| `docs/CONTRACT.md`, `docs/design/style-guide-decisions.md`, `openspec/` | Modified | CONTRACT first, Q4 deviation, specs     |

## Parallel work

Slice 5 is built in another worktree and owns `GET /notes`, body, search. Slice 3 MUST NOT touch `ports.ts` (`NoteRepository`), the Postgres note repository, `apps/api/test/fakes.ts`, `packages/shared/src/notes.ts`, `NoteRecord` or `database.ts`. Slice 3 merges first; slice 5's rebase resolves small conflicts in `keys.ts`, `messages.ts`, `MobileBar.tsx`. Shared-file edits are append-only (own messages group; MobileBar renders buttons by handler prop).

## Risks

| Risk                                                                                      | Likelihood | Mitigation                                                            |
| ----------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------- |
| **Size: ~1,600–1,900 lines (650–900 production, 800–1,000 test) vs 800 single-pr budget** | High       | Split or `size:exception` decision at the tasks gate; not chosen here |
| Slice 5 conflicts                                                                         | Med        | Append-only edits; merge first                                        |
| Mobile has no board                                                                       | Med        | Minimal affordances; design pass later                                |

## Rollback Plan

Revert the PR(s). No migration, no data change. `/today` without params behaves as today; the URL query is ignored by older builds.

## Dependencies

Slices 1–2 merged; shared `filterByTag` exists.

## Success Criteria

- [ ] C8 and R12 pass at API and shared level; the Q1 rule has tests with `docs/CONTRACT.md` updated first.
- [ ] Day and tag state survive refresh and back; snooze across days stays consistent.
- [ ] Mobile affordances ≥ 44 px; copy only in `messages.ts`.
- [ ] `npm run verify` and "Verify and build" green.

## Open Questions

- Split versus `size:exception` (tasks gate).
