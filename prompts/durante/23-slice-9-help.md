# 23 — Slice 9: "How it works" help, end to end

**Intent:** add a web-only help opened with `?` or a statusline button
(modal on desktop, sheet in the dock on phones) with Capture, Days, On a note
and Find sections built from the existing key hints, and run it end to end
(roadmap, SDD, strict TDD apply, verify), stopping only before a push.
**Outcome:** worktree `slice-9` on `feat/slice-9-help` from `914fa61` (slice
4 merged, so `e`/`d` exist). The `.env` copy was denied by a local rule; tests
don't need it. `?` was free and already promised by SG10. 9 implementation
commits, web tests 693 → 777, help in a lazy chunk (1.76 kB JS + 0.74 kB CSS
gzip, main JS +0.83 kB). A mutation run proved the coverage test fails when a
row is missing. Verify PASS WITH WARNINGS; the spec's example clock and close
behavior were aligned with the code. SG10's unimplemented `↵` open/fold body
is recorded in the backlog.

## Prompt

> New Slice 9 — "How it works" help. Web only: no API, DB or CONTRACT changes. Work end to end. (Override: skip CLAUDE.md rule 1; stop only before a push or if verify fails twice. Precondition: slice 4 merged. Setup: worktree `slice-9` on `feat/slice-9-help`, real npm install, copy the two `.env` files.) Decisions: `?` and a 44 px statusline button, never on its own, empty-state hint; desktop modal, phone sheet in the dock; Capture / Days / On a note / Find sections; touch equivalents on mobile; rows from KeyHint and messages with a coverage test and an R11 parser test; dialog accessibility; ≤ 150 ms token fade. Steps: roadmap commit, SDD proposal to tasks, strict TDD apply, sdd-verify, then show commits, verify summary and smoke checklist and ask before pushing.
