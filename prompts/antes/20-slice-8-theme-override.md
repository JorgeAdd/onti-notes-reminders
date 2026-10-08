# 20 — Slice 8: theme override, docs, then implement end to end

**Intent:** reset the `landing` worktree onto `origin/main`, add the theme
override decisions to the landing brief, update the roadmap (Slice 8, theme
moved from Slice 4, Slice 2 done) and the backlog, add SG19, then plan,
apply and verify `slice-8-page-entrance-theme` with SDD and strict TDD,
stopping before any push.
**Outcome:** branch `feat/slice-8-page-entrance-theme` from `origin/main`
(slices 3 and 5 already merged). Brief gains "Theme override"
(decisions 22–30) and its Definition of done.

## Prompt

> Can we reset the worktree and start the 8 slice?
> Slice 8: finish the docs, then implement everything. Work end to end.
>
> Override for this task: skip CLAUDE.md rule 1. Do not stop between phases and do not ask questions; all decisions are final. Stop only (a) before any push (rule 6), or (b) if verify fails twice or a decision contradicts a source of truth (rule 14). In that case, report it and stop.
>
> Facts: tokens.css:175-176 already honors `data-theme` on <html>; only the toggle UI is missing (slice 1 design decision 14, SG18). It's currently assigned to Slice 4.
>
> Theme decisions:
>
> - Persist the choice in localStorage and apply it before first paint with a tiny inline script in index.html (no flash during the entrance). Cross-device sync goes to the backlog.
> - 3-state control: system / light / dark. "System" removes data-theme.
> - Placement: one shared component, next to Sign out in the date column (Today) and on the sign-in card.
> - No keyboard shortcut.
> - Instant swap, with no theme transition animation.
> - If localStorage is unavailable or throws: follow the system and never crash.
>
> Steps:
>
> 1. Docs: add a "Theme override" section with these decisions and its Definition of done (no flash, falls back to system, 44 px target, visible focus, copy in messages) to landing-brief.md. Roadmap: add Slice 8 (entrance + theme), remove theme from Slice 4 and welcome from Unassigned, mark Slice 2 Done. Backlog: note the move and add theme sync. Then one docs: commit, including prompts 17–20.
> 2. SDD style guide: add SG19 to style-guide-decisions.md, in its own docs: commit.
> 3. git fetch and rebase onto origin/main. Slices 3 and 5 touch App.tsx, DayPage.tsx and TodayContainer.tsx, so check whether they are merged. If slice 5 (feat/slice-5-all-notes-search) is not merged yet, continue anyway and note the expected conflicts in the PR description.
> 4. SDD: run the change slice-8-page-entrance-theme from proposal through tasks, using landing-brief.md as binding input. Set the changed-line budget to include tests (strict TDD roughly doubles lines).
> 5. Apply with strict TDD, then run sdd-verify. npm run verify must pass on every commit; never use --no-verify.
> 6. Open nothing yet: push and PR need my approval. Show me the commit list, the verify report summary, the added CSS/JS size in gzip vs the 3 kB budget, and the manual smoke checklist I must run (light, dark, system, reduced motion; desktop and mobile; no flash on reload with each stored theme).

## Follow-up: header rule

The design phase found that brief decision 8.4 animates a header rule that
does not exist (no rule in `PageHeader`, none on board 03). Recommendation:
drop the rule animation and its two tokens instead of adding a new visible
element; keep the mobile capture bar's "fades in last" delay as
`--entrance-delay-bar`.

> Yes go with it
