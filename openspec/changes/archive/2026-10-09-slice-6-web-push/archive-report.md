# Archive Report: Slice 6 — Web Push notifications

**Change**: slice-6-web-push
**Archived**: 2026-10-09
**Mode**: Hybrid (OpenSpec + Engram)
**Status**: Archived as an intentional partial close with carried warnings. **Push is NOT live yet.**
**Merge commits (origin/main)**: PR #20 (backend core) 88f30ef; PR #22 (endpoints) 9d83214; PR #24 (web) ce314f2

## Pending Before Final Acceptance

**Push is NOT live yet.** The code is merged and passed automated verification, but no notification is sent until the HUMAN steps below are done, in this order:

1. Generate the VAPID keys: `npx web-push generate-vapid-keys` (H1).
2. Apply `supabase/migrations/20261008180000_backfill_notified_due_at.sql` to Supabase, BEFORE the Railway deploy that sets the VAPID config (H2).
3. Set the Railway variables on the API: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_ACTION_SECRET` (>= 32 chars), `API_PUBLIC_URL`; `CORS_ORIGINS` includes the Vercel origin (H3).
4. Run a single, non-sleeping Railway API instance (H4).
5. Set `VITE_VAPID_PUBLIC_KEY` on Vercel, then redeploy. Add the same line to `apps/web/.env.example` by hand: the agent could not edit `.env*` files (a local deny rule), and verify PR3 W2 recorded that the file was not updated (H5).
6. Run the manual smokes:
   - 9.2 (local): API with push config logs ticks; without it, no scheduler.
   - 13.2: `curl` subscribe twice with two users (one row, new owner); action with a forged token gives 401.
   - 20.2: the four phone bar targets at 375 px without horizontal scroll; if not, move the phone control to the date column only.
   - 20.3 (after deploy): delivery within 30 s with the app closed; Done and "+1 h" from the notification; a second tap opens Today and changes nothing; denied copy; sign-out removes the row; iOS installed PWA best effort.

Unchecked in the archived `tasks.md`, each annotated "pending: not done yet (2026-10-09)": 9.2, 13.2, 20.2, 20.3, H1, H2, H3, H4, H5. H6 is ticked (pushes and merges approved; PRs #20, #22 and #24 merged). These items are not stale checkboxes: none of them has been done. The steps and the smokes are in `docs/backlog.md` under "Deferred from Slice 6".

This archive is an intentional partial close. It proceeds on the human's explicit instruction, which the Task Completion Gate requires; the reason is recorded in "Task Reconciliation" below.

## Overview

Slice 6 adds Web Push notifications, one push per `due_at` (R10), with Done and "+1 h" actions on the notification (C3, C15). It has three parts: a backend core (scheduler, claim, dispatch, sender, config, backfill migration, token codec), subscription and action endpoints (ADR-004 signed action tokens), and the web layer (service worker, manifest, opt-in permission control, guarded open-the-app fallback, sign-out unsubscribe). Shipped as three PRs, each labelled `size:exception`.

## Final State (at close)

Final-state facts follow the Final-State Authority ranking (launch-prompt facts first, then repository evidence, then intermediate snapshots). Snapshot claims are attributed to their source and time.

- **PR #20 (backend core)** merged as 88f30ef. Ancestry confirmed in `origin/main`. "Verify and build" green (launch-prompt fact).
- **PR #22 (endpoints)** merged as 9d83214. Ancestry confirmed. "Verify and build" green (launch-prompt fact).
- **PR #24 (web)** merged as ce314f2. Ancestry confirmed. "Verify and build" green (launch-prompt fact).
- **Verify verdicts**: PR1, PR2 and PR3 are each PASS WITH WARNINGS with 0 CRITICAL. The machine envelope in each report's frontmatter matches the human verdict (`verdict: pass_with_warnings`, `critical_findings: 0`; PR1 `blockers: 0`).
- **PR1 verify W1 fixed**: the backfill pg test asserted a global row count and failed when `search.pg` ran in parallel on the same database. Fixed in 0251486, "test(api): scope the backfill pg test to its own notes" (launch-prompt fact, ancestry confirmed). The pg test now checks only its own rows.
- **PR3 verify W2 (SG14) fixed**: SG14 in `docs/design/style-guide-decisions.md` now says the phone bar holds the notification control and wraps to a second row on narrow phones instead of scrolling. Fixed in e171c1a, "docs: SG14 bottom bar holds the notification control" (launch-prompt fact, ancestry confirmed; line 21 read back).
- **PR3 verify W6 fixed**: the bridge's no-mutation tests in `push-bridge.test.tsx` asserted after a single microtask tick. They now wait for a macrotask. Fixed in 195eaa9, "test(web): settle the bridge before its no-mutation checks" (launch-prompt fact, ancestry confirmed). The launch prompt states the fix was proven by breaking the `due_at` guard; that proof is not in the repository and is recorded as the launch-prompt claim.
- **PR3 verify W5, SG14 part, fixed**: "SG14 still says three bar buttons" is no longer true (see e171c1a above). The other W5 deviations remain (see Carried Warnings).
- **CONTRACT rows proven** (`docs/CONTRACT.md`, Slice 6 table, read back): C2 (dispatch-due and push-payload tests, `[pg]` evidence), C3 (from the notification, push-actions and push-routes tests), C5 (re-arm row), C7 (no subscription: marked, nothing sent), C15 (push-actions and push-routes tests). Launch-prompt fact, corroborated by the repository.
- **ADR and rule changes in place**: ADR-004 (signed action tokens, guarded fallback, error codes 401/404/409) in `docs/adr/ADR-004-signed-action-tokens.md`; ADR-001 amendment for subscription reassignment (one owner-role statement) in `docs/adr/ADR-001-supabase-auth-own-api.md`, commit d5f4276; CLAUDE.md rule 18 exception for `POST /push-actions/*` (read back).
- **Manual smokes**: 9.2, 13.2, 20.2 and 20.3 are PENDING (see the top of this report). The PR2 verify report notes that the agent's `curl` run covered the forged token (401), subscribe without JWT (401), a valid snooze (200) and a replay (409), but not the two-user subscribe, which needs a real Supabase JWT.
- **Deploy order**: the backfill migration must be applied before the Railway deploy that sets the VAPID config. Railway runs a single non-sleeping instance. Vercel gets `VITE_VAPID_PUBLIC_KEY` and a redeploy after that.

## Verification Snapshots

Intermediate snapshots, attributed by observation ID and write time. Their "pending", "open" and "warning" claims were valid only when written. The status at close is in the table below.

| Report                 | Observation | Written             | Verdict (human)    | Critical | Warnings / Suggestions |
| ---------------------- | ----------- | ------------------- | ------------------ | -------- | ---------------------- |
| `verify-report-pr1.md` | #1151       | 2026-10-08 23:09:41 | PASS WITH WARNINGS | 0        | 4 / 6                  |
| `verify-report-pr2.md` | #1155       | 2026-10-09 07:08:00 | PASS WITH WARNINGS | 0        | 5 / 4                  |
| `verify-report-pr3.md` | #1159       | 2026-10-09 08:28:40 | PASS WITH WARNINGS | 0        | 6 / 6                  |

### Warning Disposition

| Warning                                                        | Verify-time status | Status at close                                   | Source / resolution                                              |
| -------------------------------------------------------------- | ------------------ | ------------------------------------------------- | ---------------------------------------------------------------- |
| PR1 W1: backfill pg test global row count                      | Open               | Resolved                                          | 0251486 (launch-prompt fact, ancestry confirmed)                 |
| PR1 W2: manual smoke 9.2 pending, real delivery                | Open               | **Open, pending (human)**                         | Backlog "Manual smoke of Slice 6"                                |
| PR1 W3: apply-progress TDD evidence is prose                   | Open               | Open, not carried                                 | Evidence-format gap; see Follow-ups                              |
| PR1 W4: about 2,368 lines vs 1,370 forecast                    | Open               | Accepted                                          | `size:exception` on PR #20                                       |
| PR2 W1: about 1,148 lines vs 800 budget                        | Open               | Accepted                                          | `size:exception` on PR #22 (launch: about 1,150)                 |
| PR2 W2: manual smoke 13.2 pending                              | Open               | **Open, pending (human)**                         | Backlog "Manual smoke of Slice 6"                                |
| PR2 W3: apply-progress TDD evidence is bullets                 | Open               | Open, not carried                                 | Evidence-format gap; see Follow-ups                              |
| PR2 W4: no PR2 prompt in `prompts/durante/` (rule 7)           | Open               | Open, not carried                                 | See Follow-ups                                                   |
| PR2 W5: malformed JSON on `/push-actions/*` gives 400, not 401 | Open               | **Open, carried**                                 | Backlog "Malformed JSON on `/push-actions` returns 400, not 401" |
| PR3 W1: about 1,900 added lines vs 1,080 forecast              | Open               | Accepted                                          | `size:exception` on PR #24                                       |
| PR3 W2: 20.2, 20.3, Vercel key, `.env.example` line            | Open               | **Open, pending (human)**                         | Backlog "Turn push on" and "Manual smokes"                       |
| PR3 W3: apply-progress TDD evidence is bullets                 | Open               | Open, not carried                                 | Evidence-format gap; see Follow-ups                              |
| PR3 W4: no PR3 prompt in `prompts/durante/` (rule 7)           | Open               | Open, not carried                                 | See Follow-ups                                                   |
| PR3 W5: undeclared design deviations                           | Open               | **Open, carried** (SG14 part resolved in e171c1a) | Backlog "PR3 small deviations from design"                       |
| PR3 W6: weak negative assertions in bridge tests               | Open               | Resolved                                          | 195eaa9 (launch-prompt fact, ancestry confirmed)                 |

### Verify Suggestions

Not addressed in this slice and not carried into the backlog by this archive, except where noted: PR1 (main.ts wiring has no automated test; the `standins.sql` script hardcodes a database name; a claimed reminder is lost if the subscription lookup throws, by design); PR2 (S1 assert the C15 re-arm in tests; S2 route test for an invalid JSON body and content type; S3 a sturdier no-DB proof; S4 confirm `.engram` chunks belong in the diff); PR3 (S1 SW tests for 409 with no window and a throw with an open window; S2 App-level no-prompt-on-sign-in test; S3 separate turn-off failure copy; S4 `readStatus` inside `enable` catch can leave an unhandled rejection; S5 `.engram` chunk expected under rule 21; S6 record the 375 px result in SG14 or an SG note).

## Specs Merged

| Domain                  | Action  | Details                                                                                                                                                                                  |
| ----------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| push-scheduler          | Created | Full spec copied from `specs/push-scheduler/spec.md` (7 requirements)                                                                                                                    |
| push-subscriptions      | Created | Full spec copied from `specs/push-subscriptions/spec.md` (5 requirements)                                                                                                                |
| push-actions            | Created | Full spec copied from `specs/push-actions/spec.md` (4 requirements)                                                                                                                      |
| notification-permission | Created | Full spec copied from `specs/notification-permission/spec.md` (7 requirements)                                                                                                           |
| reminder-actions        | Updated | ADDED "+1 h from a notification (C15)" with its three scenarios, appended after "Optimistic updates and failure". The delta has no MODIFIED or REMOVED block. No requirement was removed |

**Merge method**: the four new specs were copied with `cp`. The reminder-actions block was spliced with `cat` and `sed -n '5,$p'` (the delta's ADDED block), not retyped. Each step has a readback (see Mechanical Readback).

**Delta header**: the copied specs keep the delta file layout (`# <Domain> Specification`, `## Purpose`, `## Requirements`), as the slice 4 precedent does for new specs.

**Stale text not changed by this archive**: none found in the merged specs. The `# Delta` header is not present in the `reminder-actions` main spec and was not added.

**Source of Truth Updated**:

- `openspec/specs/push-scheduler/spec.md` (new)
- `openspec/specs/push-subscriptions/spec.md` (new)
- `openspec/specs/push-actions/spec.md` (new)
- `openspec/specs/notification-permission/spec.md` (new)
- `openspec/specs/reminder-actions/spec.md` (updated)

## Archive Contents

- proposal.md
- specs/ (push-scheduler, push-subscriptions, push-actions, notification-permission, reminder-actions delta)
- design.md
- tasks.md (9 unchecked, all annotated pending; see Task Reconciliation)
- verify-report-pr1.md, verify-report-pr2.md, verify-report-pr3.md
- archive-report.md (this file)

## Task Reconciliation (Task Completion Gate)

The Task Completion Gate normally blocks archive while implementation tasks are unchecked. This archive proceeds on the human's explicit instruction, which makes it an intentional partial archive with warnings.

- **Left UNTICKED, annotated "pending: not done yet (2026-10-09)"**: 9.2, 13.2, 20.2, 20.3, H1, H2, H3, H4, H5. These are genuinely incomplete, not stale checkboxes. No apply-progress or verify-report proves them complete.
- **H6 ticked**: "approve each push and merge (rule 6)". Pushes and merges approved; PRs #20, #22 and #24 merged.
- **No PR-open task was unchecked**: no task in the source `tasks.md` still says "open the PR" in unchecked form, so none was ticked.
- Every other task was already ticked in HEAD. The only changed lines in `tasks.md` are the nine annotations and the H6 tick (see Mechanical Readback).

## Contradictions and Clarifications

- **Engram tasks mirror is stale**: observation #1146 (2026-10-08) predates the ticks and the archive annotations. The file `tasks.md` is the content source in hybrid mode, and the archived copy is the authoritative version now.
- **Engram spec count drift**: observation #1137 says notification-permission has 6 requirements. The file has 7 `### Requirement` headers. The file was copied as-is; the count above is the file's.
- **PR2 malformed-JSON edge**: the launch prompt says malformed JSON on `/push-actions/*` returns 400, not 401, with no leak. Repository evidence agrees. `apps/api/src/infrastructure/http/server.ts` (around line 124) maps Fastify's own 4xx to `400 validation_error`. The 401 tests in `apps/api/test/push-routes.test.ts` (around line 252) use a malformed token string, not malformed JSON. The JSON case is untested, as PR2 verify W5 says. Both sources agree; no contradiction remains.
- **Sizes**: the launch prompt gives PR1 about 2,370, PR2 about 1,150 and PR3 about 1,900 lines. The verify reports give 2,368, 1,148 and about 1,900 added (46 deleted). The gap is rounding and was not re-measured by this archive.
- **Verify envelope vs human verdict**: no conflict. The machine envelope and the human verdict agree in all three reports.

## Engram Artifacts (Hybrid Mode Traceability)

| Artifact                                 | Observation ID  | Created             | Type         | How read                                   |
| ---------------------------------------- | --------------- | ------------------- | ------------ | ------------------------------------------ |
| sdd/slice-6-web-push/proposal            | #1136           | 2026-10-08 18:05:18 | architecture | fetched (`mem_get_observation`)            |
| sdd/slice-6-web-push/spec                | #1137           | 2026-10-08 18:08:10 | architecture | fetched                                    |
| sdd/slice-6-web-push/design              | #1139           | 2026-10-08 18:16:18 | architecture | fetched                                    |
| sdd/slice-6-web-push/tasks               | #1146           | 2026-10-08 18:44:15 | architecture | fetched (stale mirror, see Contradictions) |
| sdd/slice-6-web-push/apply-progress      | #1148           | 2026-10-08 19:26:43 | architecture | located by `mem_search`, not fetched       |
| sdd/slice-6-web-push/verify-report (PR1) | #1151           | 2026-10-08 23:09:41 | architecture | fetched                                    |
| sdd/slice-6-web-push/verify-report-pr2   | #1155           | 2026-10-09 07:08:00 | architecture | fetched                                    |
| sdd/slice-6-web-push/verify-report-pr3   | #1159           | 2026-10-09 08:28:40 | architecture | fetched                                    |
| sdd/slice-6-web-push/archive-report      | (this document) | 2026-10-09          | architecture | written                                    |

Related decisions (located by `mem_search`, not required artifacts): #1128 (explore), #1130 (Q1: signed action token), #1132 (Q3: backfill before scheduler), #1142 (ADR-001 subscription reassignment).

The openspec files are the content source in hybrid mode.

## Mechanical Readback

All copies and moves used `cp`, `sed`/`cat` splicing, `git mv` and `sed -i` for the nine annotations and the H6 tick. No artifact content was retyped by the model. The verbatim `diff -r` output is in the phase result.

- New specs (`cp`): `diff -r` of each source delta against the main copy, empty for push-scheduler, push-subscriptions, push-actions and notification-permission.
- reminder-actions (splice): the original 167 lines are a prefix of the new file (empty diff); the appended block equals the delta's ADDED block, lines 5 to 31 (empty diff). `git diff --stat`: 28 insertions.
- Archive move (`git mv`): `diff -r` of the pre-move snapshot against `openspec/changes/archive/2026-10-09-slice-6-web-push/`, empty.
- `tasks.md`: `git show HEAD:` original against the archived copy. The changed lines are exactly the nine annotations and the H6 tick.
- Prettier: run on every touched file (see the phase result for the final check).

## Follow-ups

Carried to `docs/backlog.md` under "Deferred from Slice 6" (and the existing "CI Postgres job for search and push" entry under "Deferred from Slices 3 and 5"):

- Turn push on: HUMAN setup, in order (H1 to H5, plus the `.env.example` line).
- Manual smokes 9.2, 13.2, 20.2 and 20.3.
- CI Postgres job for search and push (the push pg suites are not in CI; merged into the existing entry).
- Malformed JSON on `/push-actions` returns 400, not 401.
- PR3 small deviations from design.

Not in the backlog (open in this report only):

- Apply-progress TDD evidence is prose or bullets, not the table (PR1 W3, PR2 W3, PR3 W3).
- No prompts saved under `prompts/durante/` for PR2 and PR3 (PR2 W4, PR3 W4; rule 7).
- Size exceptions: PR1 about 2,370, PR2 about 1,150, PR3 about 1,900 lines (all `size:exception`).
- At-most-once delivery by design: a claimed reminder is marked before send, so a crash after claim loses that push (accepted, C7 and R10).
- The verify suggestions listed above.

## Verification Checklist

- [x] Main specs created: `openspec/specs/push-scheduler/spec.md`, `openspec/specs/push-subscriptions/spec.md`, `openspec/specs/push-actions/spec.md`, `openspec/specs/notification-permission/spec.md`
- [x] Main spec updated: `openspec/specs/reminder-actions/spec.md` (C15 requirement appended)
- [x] Change folder moved to `openspec/changes/archive/2026-10-09-slice-6-web-push/`
- [x] Archive contains all artifacts (proposal, specs, design, tasks, verify-reports)
- [ ] Archived `tasks.md` has no unchecked implementation tasks: NOT MET. 9.2, 13.2, 20.2, 20.3 and H1 to H5 are pending human or manual steps, left unchecked on the human's instruction (intentional partial archive)
- [x] Active changes directory no longer has this change
- [x] Verbatim `diff -r` readbacks recorded (phase result)
- [x] All Engram artifact observation IDs recorded
- [x] No CRITICAL issues in any verify report

## Archive Closure

The slice-6-web-push change is archived as an intentional partial close with carried warnings. The code shipped in three PRs (#20, #22, #24) and passed automated verification. **Push is not live**: the VAPID setup, the backfill migration, the Railway and Vercel variables, and the four manual smokes remain human steps, listed at the top of this report and in `docs/backlog.md` under "Deferred from Slice 6".
