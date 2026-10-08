# durante/10 — Slices 3 and 5 in parallel

**Intent:** archive slice 2, settle the roadmap, then plan and build slice 3
(day navigation and tag filter) and slice 5 (All notes and search) at the same
time, one in the main checkout and one in a git worktree.
**Outcome:** PR #12 (slice 2 archive) and PR #10 (theme override → slice 4
only; onboarding stays Unassigned pending a Slice 8 brief) merged. Slice 3 owns
`GET /today?date&tag`, slice 5 owns `GET /notes`; slice 3 merges first.
Product decisions Q1–Q8 recorded (Q3 amended: an outside tap only closes the
tag dock). Both designs failed or warned at independent validation and were
corrected once. Slice 3: 13 commits, verify PASS WITH WARNINGS after a
remediation round (mobile day controls test), smoke 12/12 with real key presses
and taps. Slice 5: real-Postgres test found an adapter that threw instead of
rejecting; real-browser smoke found `/` never reaching search (unstable keyboard
listeners), fixed test-first. Worktree `node_modules` symlink resolved
`@onti/shared` to the other checkout until it was rebuilt per entry. Attempt
ledger budgets now forecast + 30%.

## Prompts

> Do it, also, update PR #10 (branch docs/roadmap-assign-theme-onboarding, this
> worktree) so it only assigns the manual theme override. … ASK before pushing.

> Yes do it

> Perfect, merge 12, then 10 when green, probably we want to reuse the worktree
> for a next slice

> a

> Can we work on 2 slices at once? using the worktree

> Go with 3 + 5

> Keep the default

> Keep the default

> Keep the minimal default

> Keep R12

> a

> Keep default

> Keep the default

> Keep them

> Yes, it is ok to shipe them as one PR

> (a) is ok

> Do it

> Yes, run both resets and continue

> If there is another reset, approve it and continue until you have the PRs
