# Archive Report: Slice 8 — Page entrance and theme override

**Change**: slice-8-page-entrance-theme
**Archived**: 2026-10-08
**Mode**: Hybrid (OpenSpec + Engram)
**Status**: Complete (PR #16 merged; intentional archive with carried warnings)
**Merge commit**: e2dca50 (origin/main)

## Overview

Slice 8 adds a CSS-only entrance of the real sheet on every full page load (Today when signed in, the sign-in card when signed out), a desk-only pending state with a 400 ms threshold for `TodayStatus`, and a three-state manual theme override (System / Light / Dark) stored per device in `localStorage` and applied before first paint by an inline script in `apps/web/index.html`.

## Final State (at close)

Final-state facts below follow the Final-State Authority ranking. Snapshot claims from `verify-report` are attributed to their source and time.

- **PR #16** merged as e2dca50. Final-state fact from the orchestrator launch prompt; the merge commit is present in `origin/main` history (`git log`).
- **"Verify and build"** green on the PR. Launch-prompt fact; not re-checked by this archive.
- **Theme control layout fix** (ab02add, `fix(web): make the theme control one segmented row and stretch Sign out`): the control wrapped inside the 200 px date column. Fixed as a segmented grid with joined borders, focus ring lifted with `z-index` and `outline-offset`, and Sign out stretched full width. Found in the maintainer's manual smoke. Checked with headless screenshots at 1280 and 375 px in light and dark (launch-prompt fact). Diff stat for ab02add: 6 files, 92 insertions, 14 deletions.
- **Prompt saved** in dc714f7 (`docs: save the slice 8 theme control smoke-fix prompt`); `prompts/durante/13-slice-8-theme-control-segmented.md` and `prompts/20-slice-8-theme-override.md` are present on disk.
- **Web tests**: 459 passing (launch-prompt fact, after ab02add). At verify time the count was 455 (see Contradictions).
- **Bundle size**: gzip CSS+JS +1329 B against the 3072 B budget (launch-prompt figure; matches the `verify-report` measurement at 54690ef). ab02add changed CSS after that measurement, so this figure was not re-measured by this archive.
- **Diff size**: about 1250 changed lines in `apps/` including tests (launch-prompt figure). `verify-report` measured 1166 added and 5 deleted at 54690ef, and ab02add adds 92 and removes 14 more. Delivered with `size:exception` (800-line review budget).
- **Manual smoke** (task 6.2): run by the maintainer; one finding fixed in ab02add. The smoke result is recorded here from the launch prompt; no separate smoke artifact exists in the repository.
- **Keyboard focus ring** on the segmented theme control was not visible in the headless screenshots. Left to the maintainer's browser check (backlog).

## Verification Snapshot

`verify-report` (observation #1120) verdict: PASS WITH WARNINGS, 0 CRITICAL, 8 WARNING, 4 SUGGESTION. Written at HEAD 54690ef and committed in 5a61738 (`docs(sdd): add slice 8 verify report (pass with warnings) and bundle size check`). Intermediate snapshot; state at close is given above.

### Warning Disposition

| Warning                                                                   | Verify-time status | Status at close                         | Source / resolution                                                                                    |
| ------------------------------------------------------------------------- | ------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| W1: Task 6.2 manual smoke pending                                         | Open               | Resolved                                | Maintainer smoke run; finding fixed in ab02add (launch prompt; task 6.2 ticked)                        |
| W2: Tasks 6.3, 6.4, 7.1, 7.2 open                                         | Open               | Resolved                                | 6.3 by this archive (roadmap and backlog); 6.4 by PR CI; 7.1 by dc714f7; 7.2 by PR #16 merge (e2dca50) |
| W3: Strict TDD evidence as prose (no per-task table)                      | Open               | Open, carried                           | Follow-up (backlog not updated; see Follow-ups)                                                        |
| W4: Optimistic-update and theme-change no-replay tests only re-render     | Open               | Open, carried                           | Backlog: "Deferred from Slice 8"                                                                       |
| W5: Control reads applied `data-theme`, spec says module reads storage    | Open               | Open, carried                           | Behavior equivalent in the browser; spec wording not changed by this archive. Follow-up                |
| W6: `data-entrance` on `.desk`, `sheet` class on `.page`                  | Open               | Open, not carried by launch instruction | Design wording lags the shipped structure (verify S2). Follow-up                                       |
| W7: `animationend` clearing depends on `getAnimations` (stubbed in jsdom) | Open               | Open, carried                           | Backlog: "Deferred from Slice 8"                                                                       |
| W8: About 1100 changed lines vs 800 budget                                | Open               | Accepted                                | Delivered with `size:exception`                                                                        |

Suggestions S1 to S4 from `verify-report` were not addressed in this slice and are not carried into the backlog by this archive.

## Specs Merged

| Domain         | Action  | Details                                                                                                                                                                                                                                      |
| -------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| page-entrance  | Created | Full spec copied from `specs/page-entrance/spec.md` (no existing main spec). Entrance tokens, choreography, mobile remap, reduced motion, pending states, once-per-load, interactivity, budget                                               |
| theme-override | Created | Full spec copied from `specs/theme-override/spec.md`, plus one final-state paragraph in "Shared control and placement": one-row segmented grid of three equal segments with label-size text; Sign out full width below it in the date column |

**Source of Truth Updated**:

- `openspec/specs/page-entrance/spec.md` (new)
- `openspec/specs/theme-override/spec.md` (new)

## Archive Contents

- proposal.md
- specs/ (page-entrance, theme-override delta specs)
- design.md
- tasks.md (all implementation tasks ticked; see Task Reconciliation)
- verify-report.md

## Task Reconciliation (Task Completion Gate)

Exceptional stale-checkbox reconciliation, performed on explicit orchestrator instruction. Reason: the implementation and PR work completed after `tasks.md` and `verify-report` were written, and the checkboxes were not updated by `sdd-apply`. Ticked in the archived `tasks.md`:

- 6.2 manual smoke: launch-prompt fact; ab02add in git history.
- 6.3 roadmap and backlog: performed by this archive (`docs/roadmap.md`, `docs/backlog.md`).
- 6.4 `npm run verify` and `npm run build`: `verify-report` records exit 0 at 54690ef; PR "Verify and build" green (launch prompt).
- 7.1 prompts saved: dc714f7; `prompts/durante/13-slice-8-theme-control-segmented.md` and `prompts/20-slice-8-theme-override.md` on disk.
- 7.2 PR opened and merged: merge commit e2dca50 in `origin/main` history. The human approval for the push is an orchestrator-reported fact and is not verifiable from the repository.

Task 6.1 was already ticked. After reconciliation, `tasks.md` has no unchecked tasks.

## Contradictions and Clarifications

- **Verify commit**: `verify-report` observation #1120 states HEAD 54690ef; the launch prompt cites 5a61738. Both are consistent: verification ran at 54690ef and the report was committed in 5a61738 (confirmed in git log). Not a conflict.
- **Test count**: 455 web tests at verify time (#1120, 54690ef); 459 at close (launch prompt, after ab02add). The higher-ranked final-state figure (459) is used. This archive did not re-run the suite.
- **Diff size**: 1166 added lines at verify time (#1120); about 1250 changed lines at close (launch prompt). Both are reported; the launch figure is the final state.

## Engram Artifacts (Hybrid Mode Traceability)

| Artifact                                       | Observation ID  | Created             | Type         |
| ---------------------------------------------- | --------------- | ------------------- | ------------ |
| sdd/slice-8-page-entrance-theme/proposal       | #1114           | 2026-10-08 15:07:14 | architecture |
| sdd/slice-8-page-entrance-theme/spec           | #1115           | 2026-10-08 15:08:17 | architecture |
| sdd/slice-8-page-entrance-theme/design         | #1116           | 2026-10-08 15:11:16 | architecture |
| sdd/slice-8-page-entrance-theme/tasks          | #1118           | 2026-10-08 15:23:22 | architecture |
| sdd/slice-8-page-entrance-theme/verify-report  | #1120           | 2026-10-08 15:52:29 | architecture |
| sdd/slice-8-page-entrance-theme/archive-report | (this document) | 2026-10-08          | architecture |

`apply-progress` (#1119, referenced by `verify-report`) was not read by this archive.

## Mechanical Readback

- Spec copy (`cp` into `openspec/specs/page-entrance/spec.md` and `openspec/specs/theme-override/spec.md`): `diff -r` against the source delta, empty for both.
- Archive move (`git mv`): `diff -r` of the pre-move snapshot against `openspec/changes/archive/2026-10-08-slice-8-page-entrance-theme/`, empty (exit 0).
- Post-move edits are intentional and limited to: five `tasks.md` checkboxes (6.2, 6.3, 6.4, 7.1, 7.2) and the `theme-override` final-state paragraph.

## Follow-ups

Carried to `docs/backlog.md` under "Deferred from Slice 8":

- Theme sync across devices (existing entry).
- W4: optimistic-update and theme-change no-replay tests re-render only.
- W7: `animationend` clearing depends on `getAnimations`, stubbed in jsdom.
- Keyboard focus ring on the segmented theme control: browser check.

Not in the backlog (open in this report only): W3 (TDD evidence table), W5 (control reads applied theme vs. spec wording), W6 (design wording for `.desk` / `.page`), and suggestions S1 to S4.

## Verification Checklist

- [x] Main specs created: `openspec/specs/page-entrance/spec.md`, `openspec/specs/theme-override/spec.md`
- [x] Change folder moved to `openspec/changes/archive/2026-10-08-slice-8-page-entrance-theme/`
- [x] Archive contains all artifacts (proposal, specs, design, tasks, verify-report)
- [x] Archived `tasks.md` has no unchecked implementation tasks (reconciliation recorded above)
- [x] Active changes directory no longer has this change
- [x] Verbatim `diff -r` readbacks are empty
- [x] All Engram artifact observation IDs recorded
- [x] No CRITICAL issues in verify-report

## Archive Closure

The SDD cycle for slice-8-page-entrance-theme is complete. The change was planned (proposal, spec, design, tasks), implemented in one PR (6 work-unit commits plus fix and docs commits), verified (PASS WITH WARNINGS), smoke-tested by the maintainer with one fix, and archived.
