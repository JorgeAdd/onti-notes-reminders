# durante/09 — Slice 2: plan, apply and local DB checks

**Intent:** plan slice 2 (timezone, capture, snooze, done/undo) through SDD
and implement it test-first on one branch.
**Outcome:** explore → proposal → specs → design (validated, one correction
round) → tasks; product decisions Q1–Q9, DST overlap = first occurrence,
mobile bar "+ Capture" only, one PR with `size:exception`. PR #9 (slice 1
archive + roadmap) merged first so the `today-page` spec was on `main`.
Implemented in 13 commits on `feat/slice-2-capture-snooze`; an independent
validator caught a DST bug at local midnight (America/Havana) that was fixed
test-first. CONTRACT R9, R11, R16 updated with their tests. Manual DB checks
(timezone, row lock, tag upsert/rollback) passed 13/13 on a throwaway local
Postgres 16 with Supabase stand-ins (no Docker available). PR #10 reassigned
two roadmap items (docs only). The attempt ledger needed three maintainer
resets because the line budgets did not count tests.

## Prompts

> Should we run a full investigation for the slice proposals?

> A

> Yes, a

> Yes, without pick

> Go ahead

> Keep one PR

> Go with A

> A

> Yes, push it and open the PR

> Yes, merge it and start slice 2

> Yes, run the reset and continue

> Yes, run the reset and continue

> I want to reassign two roadmap items. This is a documentation-only change;
> do not touch any code. (theme override → slice 4, onboarding → slice 3,
> on a new branch from main with a PR)

> Go for it and work on 6 and 7 please, tell me when they are done, do you
> have some questions about these commits?

> Keep both defaults, run the DB checks locally
