# 19 — Review the landing brief before approval

**Intent:** move the landing work to its own worktree and branch, resolve
three conflicts in `docs/design/landing-brief.md` (SG15 animated lists,
first paint vs `getSession()`, duplicate paper easing), confirm the subtle
entrance, then prototype 2–3 variants in a Design artifact before any
approval.
**Outcome:** worktree `landing` on `design/page-entrance`. Brief revised:
subtle entrance confirmed, no row stagger (SG15 untouched), desk-only
while pending with `TodayStatus` after ~400 ms, `--ease-paper` instead of
new curves, and travel/delay tokens so reduced motion removes all travel.
Three prototypes built; Variant A ("Drawn off the pad") chosen.

## Prompt

> Review of docs/design/landing-brief.md before approval. Do NOT approve, commit to the roadmap, or implement yet. Work in phases and stop after each one (CLAUDE.md rules 1–2: one question at a time).
>
> Phase 0 — Move the work off the wrong branch
> The brief and prompts 17/18 were created in the main checkout, on docs/archive-slice-2, which also has an uncommitted change to openspec/changes/slice-2-capture-snooze/tasks.md. Do not touch tasks.md or that branch.
> Create a worktree at ~/Projects/onti-notes-reminders-worktrees/landing on a new branch design/page-entrance from origin/main (do NOT symlink node_modules; run npm install there). Move these 3 untracked files into it and delete them from the main checkout:
> - docs/design/landing-brief.md
> - prompts/antes/17-install-grill-me.md
> - prompts/antes/18-landing-screen-grill.md
> Verify with git status in both places, then stop.
>
> Phase 1 — Resolve 3 conflicts in the brief (ask me one question at a time, each with your recommendation)
> 1. SG15 conflict: docs/design/style-guide-decisions.md:22 rejects "Animated lists, bouncing or looping motion". Decision 5.5 staggers rows, which is an animated list. Either drop the row stagger (only the sheet, date block and header rule animate), or make SG19 explicitly amend SG15 and justify it.
> 2. First-paint conflict: decision 4 says the entrance starts at first paint and overlaps getSession(), but apps/web/src/App.tsx:60 returns null until the session is ready. Either add a decision to render the desk/sheet shell before the session resolves (and say how it hands off to AuthContainer/TodayContainer without layout shift), or drop the overlap claim.
> 3. Duplicate easing: tokens.css:99 already has --ease-paper: cubic-bezier(0.2, 0.7, 0.2, 1) ("paper moves like paper", SG15). SG19 adds --ease-enter for the same purpose. Decide which one the entrance uses; do not keep two curves with the same meaning. --ease-exit only stays if something actually exits.
> Also confirm with me that the subtle ≤ 500 ms entrance (instead of the original "notebook opening / sheet sliding" idea) is what I want.
> Update the brief with the answers, then stop.
>
> Phase 2 — Prototypes (before any approval)
> Using the frontend-design skill, build one Design artifact with 2–3 variants of the entrance from the updated brief, side by side, using the real colors and tokens from apps/web/src/styles/tokens.css. Each variant needs: a replay button, a light/dark toggle, a reduced-motion toggle, and a mobile-width preview. Do not modify apps/web. Give me the link and stop.
>
> Save this prompt as prompts/antes/19-landing-brief-review.md.

## Follow-ups in the same review

> No need to open it; here's what it is. roadmap-assign is PR #10 (still open, not merged). It moves "Welcome / onboarding" to Slice 3 and "Manual theme override UI" to Slice 4. That conflicts with the brief's Slice 8.
>
> Plan: I'll update PR #10 so it only assigns the theme override to Slice 4 and leaves the welcome line untouched; Slice 8 will be added by the brief's own roadmap commit after approval. Treat origin/main's roadmap as the baseline and assume the welcome line ends up removed by the Slice 8 commit.
>
> Start Phase 1 now, one question at a time.

> Verified the brief against the files; all four changes and both follow-on edits are approved.
>
> One fix before Phase 2: decision 18 is internally inconsistent. Remapping only --motion-entrance and --motion-entrance-detail shortens the animation but does NOT remove the 12 px rise, the clip-path reveal or the rule draw — they would still travel, just faster. Also, the 12 px / 8 px rises are raw px values, which CLAUDE.md rule 8 forbids in components.
>
> Fix: add semantic tokens for the travel itself, e.g. --entrance-rise (12 px desktop / 8 px mobile via existing space tokens), --entrance-clip-start (the initial clip-path inset) and --entrance-rule-start (initial scaleX). In the global reduced-motion block, map them to no travel (rise 0, no clip, scaleX 1) so only opacity remains, ≤ 150 ms. Keep "no component-level media queries". Add this to SG19's token list and to the Definition of done (test: under reduced motion, the computed transform/clip-path at the first frame equals the final state).
>
> Update the brief, show me the diff of decisions 15–18, then start Phase 2.

> A looks great

> Do it
