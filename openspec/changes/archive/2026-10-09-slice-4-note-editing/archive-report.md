# Archive Report: Slice 4 — Note editing and markdown

**Change**: slice-4-note-editing
**Archived**: 2026-10-09
**Mode**: Hybrid (OpenSpec + Engram)
**Status**: Archived with carried warnings. Both manual smokes are PENDING.
**Merge commits (origin/main)**: PR #19 (read side) c3462cb; PR #21 (write side) 061ff8a

## Pending Before Final Acceptance

**The manual smoke tests for PR1 (task 1.9.2) and PR2 (task 2.9.2) have not been run. The maintainer has not run them yet (2026-10-09).** They are left unticked in the archived `tasks.md`, annotated as pending. This archive is an intentional partial close: the code shipped and passed automated verification, and the human-owned smoke is carried as an open item. Record the smoke results in the backlog entry "Manual smoke of PR1 and PR2 (pending)" when they run.

## Overview

Slice 4 adds the rest of the note lifecycle. The read side (PR #19) adds `createdAt` on notes, the `GET /notes/:id` endpoint with the C11 `404`, a lazily loaded markdown body with a raw-HTML-as-text allowlist (R14, C10), a read-only note view in All notes, excerpts that lose their markdown markers, and the "Without a reminder" undated list in the date column (R19, C13, C14). The write side (PR #21) adds `PATCH` and `DELETE` on `/notes/:id` (R20, R8), an edit mode in the note view with manual reschedule and reminder removal, an inline delete confirm, and the `e` key on a focused Today row. No migration.

## Final State (at close)

Final-state facts below follow the Final-State Authority ranking. Snapshot claims from `verify-report` are attributed to their source and time.

- **PR #19 (read side)** merged as c3462cb. Ancestry confirmed in `origin/main`. "Verify and build" green (launch-prompt fact).
- **PR #21 (write side)** merged as 061ff8a. Ancestry confirmed in `origin/main`. "Verify and build" green (launch-prompt fact).
- **SG20 amended** in c2d1557 (`docs: SG20 note view buttons sit in the header at every width`): Edit, Delete and Back sit in the note view header at every width. At verify time the backlog had misquoted SG20 as a bottom bar (per `verify-report-pr2`, WARNING 2). The backlog entry now carries the corrected wording.
- **SG20 Save** is a button only (fa0d692, `docs: SG20 saves with the button only`).
- **CONTRACT rows proven**: R8 (rescheduling a done note reopens it), R19, R20, C10, C11 (`404`), C13, C14. Launch-prompt fact, corroborated by the verification status rows in `docs/CONTRACT.md`.
- **Manual smokes**: PR1 (1.9.2) and PR2 (2.9.2) are PENDING (see the top of this report).
- **Verify verdicts**: PR1 and PR2 were both PASS WITH WARNINGS for the human verdict, with 0 CRITICAL (launch-prompt fact, matching the human verdict in each report). The machine envelope of both reports is `verdict: fail`, `blockers: 1`, `critical_findings: 0`. The envelope is recorded because it is the validator output. In the PR1 report the blocker is the pending manual smoke, and PARTIAL scenarios keep the validator from accepting a passing verdict. In the PR2 report the blocker is the three PARTIAL scenarios, and the pending smoke is noted there as well. Neither envelope shows a code defect.
- **Open warnings (carried)**: see the Warning Disposition table below.
- **Bundle size**: the main chunk grew +0.92 kB gzip at PR1 verify time (per `verify-report`, observation #1150). The launch prompt records a further growth of +0.80 kB gzip. The spec sentence "main chunk unchanged" was reworded in the merged main spec to "within the bundle budget" (see Specs Merged). The archived delta keeps the original wording.
- **pg tests**: the `[pg]` suites are not in CI. They were run on a throwaway database by the orchestrator (33/33 for PR2 per apply-progress; passed per the orchestrator for PR1). They were not re-run by this archive.
- **Deploy order**: Railway before Vercel (both verify reports). Vercel deploys `main` on push. The PATCH and DELETE routes and the createdAt and undated wire fields need Railway first. The repository does not record how the human sequenced the two merges.

## Verification Snapshot

`verify-report` PR1 (observation #1150, written 2026-10-08 23:09, at HEAD a23bdb4): human verdict PASS WITH WARNINGS, 0 CRITICAL, 7 WARNING, 5 SUGGESTION. Intermediate snapshot.

`verify-report-pr2` (observation #1154, written 2026-10-09 07:07, at HEAD 95f6b5e): human verdict PASS WITH WARNINGS, 0 CRITICAL, 7 WARNING, 4 SUGGESTION. Intermediate snapshot.

Both snapshots are attributed here by their observation IDs. Their "pending", "PARTIAL" and "open" claims are valid only at their write time. The status at close is in the table below.

### Warning Disposition

| Warning                                                                                             | Verify-time status | Status at close           | Source / resolution                                                                                           |
| --------------------------------------------------------------------------------------------------- | ------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| PR1 W1: manual smoke 1.9.2 pending                                                                  | Open               | **Open, pending (human)** | Smoke not yet run (2026-10-09). Backlog: "Manual smoke of PR1 and PR2 (pending)"                              |
| PR1 W1: task 1.9.3 (open PR1)                                                                       | Open               | Resolved                  | PR #19 merged as c3462cb (launch-prompt fact; task ticked)                                                    |
| PR1 W2: main chunk "unchanged" vs +0.92 kB gzip                                                     | Open               | Resolved in spec wording  | Merged main `markdown-rendering` spec reads "within the bundle budget". Archived delta unchanged              |
| PR1 W3: "Old undated note" and "Refresh" PARTIAL                                                    | Open               | Open, carried             | Backlog: "App-level test for an old undated note from Today and refresh"                                      |
| PR1 W4: apply-progress lacks Triangulate and Safety Net columns                                     | Open               | Open, not carried         | Historical evidence-format gap; not in backlog (see Follow-ups)                                               |
| PR1 W5: about 2,970 changed lines vs 1,825 forecast                                                 | Open               | Accepted                  | Delivered with `size:exception`                                                                               |
| PR1 W6: pg tests not in CI                                                                          | Open               | Open, carried             | See Follow-ups (not in backlog)                                                                               |
| PR1 W7: note-open-flow 20 s timeout (flake risk)                                                    | Open               | Open, carried             | Backlog: "Capture-flow and note-open-flow timing flake"                                                       |
| PR2 W1: three PARTIAL consistency scenarios (Today counts after reschedule, delete, set and remove) | Open               | Open, carried             | Backlog: "App-level test for Today after a write" (invalidation asserted by spies, not by re-rendering Today) |
| PR2 W2: SG20 versus header buttons, backlog misquote                                                | Open               | Resolved                  | c2d1557 (SG20 amended to header at every width); backlog entry carries corrected wording                      |
| PR2 W3: manual smoke 2.9.2 pending                                                                  | Open               | **Open, pending (human)** | Smoke not yet run (2026-10-09). Backlog: "Manual smoke of PR1 and PR2 (pending)"                              |
| PR2 W4: PR2 size about 3,370 lines                                                                  | Open               | Accepted                  | Delivered with `size:exception`                                                                               |
| PR2 W5: pg tests not in CI                                                                          | Open               | Open, carried             | See Follow-ups (not in backlog)                                                                               |
| PR2 W6: branch diff inflated by merge of origin/main                                                | Open               | Accepted                  | Repository hygiene note; no effect on the merged content                                                      |
| PR2 W7: note-open-flow 20 s timeout                                                                 | Open               | Open, carried             | Backlog: "Capture-flow and note-open-flow timing flake"                                                       |

Suggestions from both reports were not addressed in this slice and are not carried into the backlog by this archive. The PR2 suggestion "Today-after-write App test" is covered by the carried backlog entry.

## Specs Merged

| Domain             | Action  | Details                                                                                                                                                                                                                                                                    |
| ------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| note-view          | Created | Full spec copied from `specs/note-view/spec.md` (no existing main spec)                                                                                                                                                                                                    |
| note-editing       | Created | Full spec copied from `specs/note-editing/spec.md` (no existing main spec)                                                                                                                                                                                                 |
| markdown-rendering | Created | Full spec copied from `specs/markdown-rendering/spec.md`. One wording change in the merged copy: the `[build]` scenario reads "the main chunk stays within the bundle budget" (was "is unchanged"), per `verify-report` PR1 WARNING 2                                      |
| undated-list       | Created | Full spec copied from `specs/undated-list/spec.md` (no existing main spec)                                                                                                                                                                                                 |
| today-page         | Updated | MODIFIED "GET /today API" and "Statusline" replaced. ADDED "Edit key on a Today row [PR2]" and "Undated list in the date column [PR1]", inserted before "Out of scope". The `(Previously: …)` notes were not carried into the main spec                                    |
| notes-search       | Updated | ADDED "Search matches the raw body [PR1]" appended to the Requirements section. MODIFIED "All notes view" replaced. REMOVED block applied by hand to the "Out of scope" section: "Markdown rendering (slice 4)" and "`GET /notes/:id`" removed. No requirement was deleted |
| reminder-actions   | Updated | MODIFIED "Optimistic updates and failure" replaced (adds the undated parity scenario). No requirement was removed                                                                                                                                                          |

**Merge method**: the delta requirement blocks were spliced into the main specs with awk, not retyped. Each merged requirement was read back by extracting it from the main spec and comparing it with the delta block (empty diff, see Mechanical Readback).

**Requirement deletions**: none. The one REMOVED block targets the "Out of scope" section, which is not a requirement, and its two items are removed from the section by hand as the orchestrator instructed.

**Stale text not changed by this archive**: the "Out of scope" section of the main `today-page` spec still lists "Note edit/delete, manual reschedule (R8), markdown (R14)". Those items ship in this slice. The delta does not REMOVE them, so the section was left as-is. It needs a follow-up edit.

**Pre-existing main-spec headers**: `openspec/specs/today-page/spec.md` still opens with "# Delta for today-page" and "## ADDED Requirements (Slice 1)" from an earlier archive. That header is not part of this slice and was not changed.

**Source of Truth Updated**:

- `openspec/specs/note-view/spec.md` (new)
- `openspec/specs/note-editing/spec.md` (new)
- `openspec/specs/markdown-rendering/spec.md` (new)
- `openspec/specs/undated-list/spec.md` (new)
- `openspec/specs/today-page/spec.md` (updated)
- `openspec/specs/notes-search/spec.md` (updated)
- `openspec/specs/reminder-actions/spec.md` (updated)

## Archive Contents

- proposal.md
- specs/ (note-view, note-editing, markdown-rendering, undated-list, today-page, notes-search, reminder-actions delta specs)
- design.md
- tasks.md (see Task Reconciliation: two unchecked, both pending manual smokes)
- verify-report-pr1.md
- verify-report-pr2.md
- archive-report.md (this file)

## Task Reconciliation (Task Completion Gate)

The Task Completion Gate normally blocks archive while implementation tasks are unchecked. This archive proceeds on an explicit instruction from the orchestrator and the human, which makes it an intentional partial archive with warnings:

- **1.9.2 and 2.9.2 (manual smokes) left UNTICKED**, annotated "pending: the maintainer has not run the manual smoke yet (2026-10-09)". These are genuinely incomplete, not stale checkboxes. No apply-progress or verify-report proves them complete, so they are not reconciled.
- **1.9.3 ticked**: PR #19 opened and merged (c3462cb). Ticked by the orchestrator's instruction.
- **2.9.3 ticked**: PR #21 opened and merged (061ff8a). Ticked by the orchestrator's instruction.

All other tasks were already ticked at the time of archive. Git HEAD of the change folder is the only comparison base for the tasks.md edits (see Mechanical Readback).

## Contradictions and Clarifications

- **Machine envelope vs human verdict (both PRs)**: the verify reports carry `verdict: fail` and `blockers: 1` in the machine envelope, and "PASS WITH WARNINGS" as the human verdict. Both sources are recorded. The human verdict and the launch-prompt facts are the higher-ranked account of the close state. The envelope's blockers are the pending smoke (PR1) and the PARTIAL scenarios (PR2). Not resolved silently. No re-verify run is recorded in the repository after either report.
- **Bundle growth**: +0.92 kB gzip at PR1 verify time (`verify-report`, #1150). The launch prompt records +0.80 kB gzip as a further growth. The final figure is not re-measured by this archive. Both are reported.
- **SG20 wording**: `verify-report-pr2` (#1154) quotes the backlog's bottom-bar wording as a misquote of SG20. The launch prompt and c2d1557 record header buttons at every width. The final state is the header placement.

## Engram Artifacts (Hybrid Mode Traceability)

| Artifact                                     | Observation ID  | Created             | Type                                              |
| -------------------------------------------- | --------------- | ------------------- | ------------------------------------------------- |
| sdd/slice-4-note-editing/proposal            | #1135           | 2026-10-08 18:04:21 | architecture                                      |
| sdd/slice-4-note-editing/spec                | #1138           | 2026-10-08 18:08:24 | architecture                                      |
| sdd/slice-4-note-editing/design              | #1140           | 2026-10-08 18:17:22 | architecture                                      |
| sdd/slice-4-note-editing/tasks               | #1144           | 2026-10-08 18:42:45 | architecture                                      |
| sdd/slice-4-note-editing/verify-report (PR1) | #1150           | 2026-10-08 23:09:21 | architecture                                      |
| sdd/slice-4-note-editing/verify-report-pr2   | #1154           | 2026-10-09 07:07:04 | architecture                                      |
| sdd/slice-4-note-editing/apply-progress      | #1149           | 2026-10-08 19:44:04 | architecture (located by mem_search; not fetched) |
| sdd/slice-4-note-editing/archive-report      | (this document) | 2026-10-09          | architecture                                      |

Related decisions (located by mem_search, not required artifacts): #1131 (R8: rescheduling a done note reopens it), #1145 (R20 and SG20 landed; SDD artifacts corrected).

The observations for proposal, spec, tasks, verify-report and verify-report-pr2 were fetched with `mem_get_observation` and matched the openspec files. The design observation was located but its full text was not fetched. The openspec files are the content source in hybrid mode.

## Mechanical Readback

All copies and moves used `cp`, `awk` splicing, and `git mv`. No artifact content was retyped by the model.

- Archive move (`git mv`): `diff -r` of the pre-move snapshot against `openspec/changes/archive/2026-10-09-slice-4-note-editing/`, empty (exit 0).
- New capability specs (`cp`): `diff -r` against the archived delta sources, empty for note-view, note-editing, undated-list. markdown-rendering differs only by the intentional bundle-budget wording (see Specs Merged).
- MODIFIED and ADDED requirements (awk splice): each merged requirement extracted from the main spec and compared with the delta block, empty for all four blocks.
- Archived folder vs git HEAD originals: every file identical except `tasks.md`.
- `tasks.md`: the only changed lines are 1.9.2, 1.9.3, 2.9.2 and 2.9.3 (annotations and two ticks).

## Follow-ups

Carried to `docs/backlog.md` under "Deferred from Slice 4":

- Manual smoke of PR1 and PR2 (pending).
- App-level test for Today after a write (PR2 W1).
- App-level test for an old undated note from Today and refresh (PR1 W3).
- Capture-flow and note-open-flow timing flake (PR1 W7, PR2 W7).
- Deep link to a note (`?note=`), kept as deferred.
- Note view header buttons, phone reach check (kept as one entry).
- `esc` after `e` from Today lands in the All notes list.

Not in the backlog (open in this report only):

- `[pg]` tests not in CI (PR1 W6, PR2 W5). Also see the existing "CI Postgres job for search" entry under slices 3 and 5.
- apply-progress lacks the Triangulate and Safety Net columns (PR1 W4).
- Main `today-page` spec "Out of scope" section still lists shipped items (see Specs Merged).
- Deploy order: Railway before Vercel for both PRs. The sequencing decision is the human's and is not recorded in the repository; it is listed here for the production deploy record.
- Verify re-run: the PR2 report asked for one App-level test or the 2.9.2 smoke, then a re-verify for a `pass_with_warnings` envelope. No such re-verify is recorded in the repository or Engram. The machine envelope therefore stays `fail` in the archived reports.

## Verification Checklist

- [x] Main specs created: `openspec/specs/note-view/spec.md`, `openspec/specs/note-editing/spec.md`, `openspec/specs/markdown-rendering/spec.md`, `openspec/specs/undated-list/spec.md`
- [x] Main specs updated: `openspec/specs/today-page/spec.md`, `openspec/specs/notes-search/spec.md`, `openspec/specs/reminder-actions/spec.md`
- [x] Change folder moved to `openspec/changes/archive/2026-10-09-slice-4-note-editing/`
- [x] Archive contains all artifacts (proposal, specs, design, tasks, verify-reports)
- [ ] Archived `tasks.md` has no unchecked implementation tasks: NOT MET. 1.9.2 and 2.9.2 are pending manual smokes, left unchecked on the orchestrator's instruction (intentional partial archive)
- [x] Active changes directory no longer has this change
- [x] Verbatim `diff -r` readbacks recorded above
- [x] All Engram artifact observation IDs recorded
- [x] No CRITICAL issues in either verify report

## Archive Closure

The slice-4-note-editing change is archived as an intentional partial close with carried warnings. The code shipped in two PRs (#19 and #21) and passed automated verification. The two manual smokes, the Today-after-write test, and the old-undated-note tests remain open and are tracked in `docs/backlog.md` under "Deferred from Slice 4".
