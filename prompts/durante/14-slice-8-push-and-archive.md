# 14 — Slice 8: push, PR and archive

**Intent:** push slice 8 and open its PR, then archive the change once
PR #16 is merged.
**Outcome:** PR #16 opened with `size:exception` (the active `gh` account
could not create PRs, so the owner token was used for that command only)
and merged as `e2dca50` with CI green. The first archive request came
before the merge and was paused until `main` had it. The archive moves the
change to `openspec/changes/archive/2026-10-08-slice-8-page-entrance-theme/`,
adds the `page-entrance` and `theme-override` main specs, marks Slice 8
Done and records the verify follow-ups in the backlog.

## Prompts

> Push them

> Merged #16, archive slice 8

> Merged now, archive slice 8
