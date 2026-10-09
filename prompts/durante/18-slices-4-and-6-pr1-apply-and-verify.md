# 18 — Slices 4 and 6: PR1 apply, verify and push

**Intent:** build slice 4 PR1 (read side) and slice 6 PR1 (backend core) in
parallel with strict TDD, verify both, fix what verify found, log the day and
push both PRs.
**Outcome:** slice 4 PR1: 9 commits, ~2,970 changed lines, verify PASS WITH
WARNINGS (C10, C11 404, R19, C13, C14 proven). Slice 6 PR1: 9 commits,
~2,370 lines, verify PASS WITH WARNINGS (C2, C5, C7 proven). Both attempt
ledgers went over their caps and were reset by the maintainer. The backfill
pg test asserted a global row count and failed next to the search pg test;
now scoped to its own rows (`0251486`). Time logged for 2026-10-08 (4 h).

## Prompts

> Yes, apply both PR1s in parallel with those defaults

> Nightly time-log check for onti-notes-reminders: ask the user how many hours they spent on the project today (one short question, then stop). …

> Yes, reset both and run verify on both

> Fix the backfill pg test, then push both PR1s; today I spent about 4 hours
