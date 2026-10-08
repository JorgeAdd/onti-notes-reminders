# Archive Report: slice-1-today-page

**Date Archived**: 2026-10-08
**Change Name**: slice-1-today-page
**Archive Location**: `openspec/changes/archive/2026-10-08-slice-1-today-page/`

## Executive Summary

Slice 1 — Read-only Today page completed, deployed to production, and verified green. All 39 tasks complete. Six chained PRs (#3–#8) merged into feature tracker; tracker #2 merged to main at commit 32bec53 with CI passing. Production (Railway + Vercel) deployed and validated. Verdict: **PASS WITH WARNINGS** (0 critical issues). Archive ready.

## Artifact Traceability

| Artifact      | Engram ID | Type         |
| ------------- | --------- | ------------ |
| proposal      | 1064      | architecture |
| spec          | 1065      | architecture |
| design        | 1066      | architecture |
| tasks         | 1067      | architecture |
| verify-report | 1071      | architecture |

## Final State

### Task Completion

**Status**: 39/39 tasks complete

- PR1 (API + shared): 10/10 ✓
- PR2 (seed + docs): 6/6 ✓
- PR3 (web foundation): 8/8 ✓
- PR4 (shell + 401): 6/6 ✓
- PR5 (items + statusline + empty): 5/5 ✓
- PR6 (rail + CONTRACT status): 4/4 ✓

### Verification Verdict

**Verdict**: PASS WITH WARNINGS (validator admitted; exact verify-report bytes: `openspec/changes/archive/2026-10-08-slice-1-today-page/verify-report.md`)

**Test Matrix**: 12/12 requirements, 20/20 scenarios

- 17 automated tests passing
- 3 PARTIAL scenarios accepted on manual evidence (themes/mobile, keyboard focus, seed user scope)
- 0 blockers
- 0 critical issues

**Build Status**:

- `npm run verify`: exit 0 (api 53, web 77 tests in 16 files, shared 40 + 3 todo)
- `npm run build`: exit 0 (JS 569.49 kB / 162.85 gzip)

### Production Deployment

**Status**: Deployed and verified live

**Timeline**:

- Main tracker #2 merged at commit 32bec53 with green "Verify and build" CI
- Railway deployed 32bec53 (SUCCESS)
- Vercel production deployed (live at https://onti-notes-reminders.vercel.app)
- Demo seed re-anchored to 2026-10-08 (6 updated, 9 unchanged)

**Live Verification**:

- `GET /today` with demo token: openCount 4, carried 2, rail 2, otherCount 11 (CONTRACT C4 shape)
- 401 without token ✓
- Real sign-in: full day page loads, 0 px horizontal overflow on desktop and mobile

## Spec Adjustments (Per Verify Warnings)

### MODIFIED Requirement: Statusline mode label visibility

**Original spec (requirement 3, R-Statusline)**: "MUST show the mode label"

**Adjusted spec (per board 05 and design decision 13)**: "MUST show on desktop; MAY be hidden on narrow (mobile) layouts"

**Reason**: Board 05 design confirms statusline mode label hidden on mobile for layout reasons. Implementation already follows this per PR5 design. Spec updated to reflect implemented behavior.

**File**: `openspec/specs/today-page/spec.md` line 66 — status updated.

## Warnings and Deferred Items

Per verify-report (ID 1071), the following are **accepted and deferred** (not blockers):

1. **Automated proof for themes and mobile layouts**: Manual screenshots only (board 05/11); e2e automation deferred to backlog. Rationale: Playwright e2e framework already in use for manual evidence; full e2e suite is separate work unit.

2. **Manual theme override UI**: Deferred to backlog (design decision 14 noted). Rationale: Spec complete; UI implementation is future work.

3. **Automated proof for keyboard focus ring and 44px targets**: Static CSS validation only; Playwright e2e deferred to backlog. Rationale: CSS tokens in place; e2e test suite is separate.

4. **DB integration test for seed RLS scope and Postgres adapter**: Unit tests for planSeed + manual run verified; database-level integration test deferred to backlog. Rationale: Manual verification passed; automated DB test is future work.

5. **PR line counts**: PR1–3 exceeded 400-line budget (390, 330, 380 authored lines). Size exception approved per apply-progress. Rationale: Each PR is autonomous and has clear rollback; split further only if future refactoring needed.

6. **apply-progress per-task TDD tables for PR1–5**: Noted; full TDD visibility in tasks.md. Rationale: Tasks artifact holds detailed TDD flow; apply-progress captured summary.

### Code Debt / Suggestions (Non-blocking)

Per verify-report:

- Bundle size approaching 500 kB; consider `zod/mini` or code splitting in future slice
- Literal 1px/2px/640px values in CSS; migrate to token layer in future refactoring
- Monday assertion for N1 done/tomorrow in demo-scenario test (strengthen data validation)

## Changes to openspec/specs/

**Capabilities ADDED** (both new):

| Domain     | Action  | Summary                                                                                                                         |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| today-page | Created | Full spec: 7 requirements, 13 scenarios (API, page sections, statusline, live labels, empty/error, layout/theme, accessibility) |
| demo-seed  | Created | Full spec: 5 requirements, 5 scenarios (explicit target, relative dates, idempotency, user scope, report)                       |

**Note**: Both delta specs were complete (not incremental changes), so copied mechanically as full specs. `.gitkeep` removed from `openspec/specs/`.

## Design and Architecture Adherence

**Verified against**:

- CLAUDE.md rules 1–23: all followed (commit conventions, TDD, verified on every commit, CLAUDE rules 8–19 OK)
- Design decisions 1–15: all followed (decision 8 deliberate deviation: seed in `apps/api/scripts` per design-11, approved)
- Spec and design reconciliation: rev 2 design agreed with today-page and demo-seed specs

**No out-of-scope features shipped**.

## Archive Checklist

- [x] All implementation tasks marked complete in `tasks.md`
- [x] Verify verdict: PASS WITH WARNINGS (no critical issues)
- [x] Specs synced to `openspec/specs/` (today-page, demo-seed)
- [x] Change folder moved to `openspec/changes/archive/2026-10-08-slice-1-today-page/`
- [x] Archive folder structure verified (diff -r clean)
- [x] Proposal, specs, design, tasks, verify-report all present in archive
- [x] Production deployment confirmed live
- [x] CI passing on merged tracker and main

## Next Steps

1. **Backlog items** (listed in `docs/backlog.md`):
   - Automated theme override UI
   - E2E/CSS automation for focus ring, 44px targets, mobile layouts
   - DB integration test for seed RLS scope
   - Bundle size optimization

2. **Future slices**:
   - Slice 2: Capture and snooze (pending product sync)
   - Slice 3: Day navigation and filters (pending spec alignment)

---

**Archived**: 2026-10-08 by sdd-archive phase
**SDD Cycle**: Complete
**Ready for next change**: Yes
