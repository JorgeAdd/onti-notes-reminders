# Archive Report: Slice 5 — All Notes and Text Search

**Status**: Archived and closed  
**Date**: 2026-10-08  
**PR**: #14 merged to main as 9403f16

## Change Summary

All notes view with full-text search (R13, `/` key) via GET /notes?q= using PostgreSQL word-prefix tsvector and sanitized tsquery. Excerpt ~120 UTF-16 chars. Includes tag filtering in All notes as commit 9 (after slice 3 merges). Rebased onto slice 3; slice 5 owns repository, schema, adapter, and fake. All changes are CONTRACT-first with tests; real-Postgres characterization tests documented with measured tokenizing limits.

## Specifications Merged

| Domain       | Action   | Details                                                                                                  |
| ------------ | -------- | -------------------------------------------------------------------------------------------------------- |
| notes-search | Created  | NEW requirement set for GET /notes, search interaction, `/` key, All-notes view                          |
| demo-seed    | Modified | Added Note bodies (N1, N8) to seed real search data (C9)                                                 |
| today-page   | Modified | Added Search button on mobile; `/` hint in Statusline (only when bar/sheet null, not armed, not loading) |

## Artifacts Included

- ✓ proposal.md — Change intent, scope, GET /notes endpoint, `tsvector simple`, `/` key, tag filter as last commit
- ✓ design.md — 15 decisions, GET /notes schema, NoteRepository.searchOwn port, lazy NotesContainer, excerpt logic, real-Postgres limits
- ✓ tasks.md — 9 commits + PR (0–9), batched into 3 apply phases (c1–5, c6–8, c9); all tasks marked complete (10.1–10.4)
- ✓ verify-report.md — Final verify PASS WITH WARNINGS (0 CRITICAL, 8 WARNING, 4 SUGGESTION); 13/13 requirements, 29/29 scenarios
- ✓ specs/ — 3 new and modified specs (notes-search, demo-seed, today-page)

## Final State (Per Launch Prompt)

**PR and Build**: PR #14 merged to main as 9403f16 with green "Verify and build" gate. Tasks 10.1 and 10.2 (prompts and post-rebase smoke) already ticked; tasks 10.3 and 10.4 (PR approval and description) marked complete.

**Rebase**: After slice 3 (#13) merged to main, rebased onto fa6078a with expected conflicts (messages.ts, keys.ts, MobileBar.tsx, TodayContainer.tsx, DayPage.tsx, App.tsx, server.ts, main.ts, index.ts, api.ts) resolved per task 9.0. Commit 9 (All-notes tag filter, a2ad9d2) added after rebase.

**Verification**: Final verify PASS WITH WARNINGS (0 CRITICAL, 8 WARNING, 4 SUGGESTION): 13/13 requirements, 29/29 scenarios. Post-rebase smoke 10/10 scenarios pass (real keys and taps, mocked data). Real Postgres 21/21 on throwaway DB. `/` hint fix (aa0566e), keyboard listener fix (392a097, found by real-browser smoke).

**Tests**: npm run verify exit 0 (api 272 passed / 21 skipped Postgres, web 388, shared 261 + 3 todo). Build exit 0, main JS 603.98 kB. Search.pg.test.ts requires ONTI_TEST_DATABASE_URL=throwaway; skipped in verify/CI by design.

**Unknown Tag Behavior**: GET /notes with unknown tag → 200 empty list, total = caller's note count (differs from /today which returns 400; CONTRACT R12 states both per design D15).

**Follow-ups**: CI Postgres job for search.pg.test (21 skipped); seed body write path no DB-level test; 375 px statusline truncates tag to `#c…` (cosmetic); C11 404 half blocked (slice 4); markdown markers in excerpts (slice 4).

## Observation IDs (Traceability)

- Proposal: #1096
- Spec: #1098
- Design: #1101
- Tasks: #1103
- Verify-report: #1108

## Compliance Checklist

- [x] All implementation tasks marked complete (0–9, 10.1–10.4)
- [x] No CRITICAL issues in verify-report
- [x] Specs merged into main openspec/ (notes-search, demo-seed, today-page)
- [x] Change folder archived to openspec/changes/archive/2026-10-08-slice-5-all-notes-search/
- [x] No unchecked implementation tasks in archived tasks.md
- [x] Rebase completed with expected conflicts resolved
- [x] Post-rebase smoke 10/10 pass with real Postgres 21/21
- [x] Contract changes committed with tests (rule 23, commit 2)
- [x] Boundary clean (slice 3 and prior files untouched per task 9.2)

## Next Steps

Both slices 3 and 5 are archived, merged, and shipped. Roadmap and backlog updated with completed work and deferred follow-ups. Initiative complete per deployment schedule.
