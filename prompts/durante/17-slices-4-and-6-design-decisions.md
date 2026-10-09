# 17 — Slices 4 and 6: proposals, specs, designs and their decisions

**Intent:** run the sources-first updates and both proposals, then specs and
designs in parallel, and settle what the designs flagged.
**Outcome:** sources committed on both branches (R8 reopens a done note,
SG10 `e`/`d`, ADR-004 with the rule 18 exception, C15). An engram export was
blocked by a memory naming a secret-like env var; the memory was reworded,
not bypassed. Proposals, specs and designs written for both slices.
Decisions: fewer PRs with `size:exception` (slice 4: 2, slice 6: 3);
subscribe reassigns another user's endpoint with one owner-role statement
(ADR-001 amended); `/push-actions/*` errors aligned with R15 (401, 404, 409
only for a changed `due_at`); the open-the-app fallback is guarded by the
note's current `due_at` (ADR-004 sentence); nine smaller defaults kept (R20
for editing, empty body allowed, SG20 before the read-side PR, deploy order,
mobile control slot, 2 s sign-out wait, manifest hex colors, backfill before
the VAPID deploy).

## Prompts

> Yes, go ahead with the sources and both proposals

> Yes, run spec and design for both

> Fewer PRs please

> Yes, amend ADR-001 and reassign it

> Yes, align the error codes with R15

> Yes, guard the fallback and update ADR-004

> Yes, keep all nine defaults
