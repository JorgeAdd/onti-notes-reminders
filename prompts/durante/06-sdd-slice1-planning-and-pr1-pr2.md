# durante/06 — Slice 1 with SDD: planning, PR 1, PR 2

**Intent:** run slice 1 (read-only Today page) through SDD: proposal →
spec + design → tasks → apply, with the human approving each phase.
**Outcome:** product questions answered one at a time (read-only scope, demo
seed included, calm empty state); a phase validator caught design gaps
(401 flow, statusline counts) that were fixed before tasks; 6 chained PRs
in a feature-branch chain. PR 1 (`GET /today`) and PR 2 (demo seed) shipped
as approved size exceptions; the seed was run against the real database and
`GET /today` returned exactly CONTRACT C4. The validator for PR 2 found that
re-seeding kept a stale snooze count; fixed test-first.

## Prompts

> This is correct, start with no actions, we can work them on next slices

> Yes that's ok, add the script

> Yes, left B for later

> Yes, continue

> Yes, approve and run the tasks phase

> Yes, push it, open the draft PR and start PR 1

> A, accept PR 1 as a size exception

> Yes, push it, open PR 1 and continue with PR 2

> A, keep accepting for the current PRs the size exceptions
