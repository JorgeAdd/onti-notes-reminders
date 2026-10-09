# 16 — Slices 4 and 6 in parallel: setup and product decisions

**Intent:** start slice 4 (note editing, markdown, R8, R19) and slice 6 (Web
Push) at the same time, slice 4 in the main checkout and slice 6 in the
`slice-6` worktree, and settle the product questions before any proposal.
**Outcome:** branches `feat/slice-4-note-editing` and `feat/slice-6-web-push`
from `352893b`. Both explorations ran in parallel. Slice 4 owns the note wire
type (`createdAt`), `/notes/:id`, `GET /today` (undated), `DateColumn` and
markdown, and merges its first PR first; slice 6 stays in new files. Slice 4:
2 PRs (read, write); slice 6: 3 PRs (backend, endpoints, web). Decisions:
notification actions use a signed action token (ADR-004, rule 18 exception)
with "open the app" as fallback; rescheduling a done note reopens it (R8);
"+1 h" in the notification (row C15); a backfill migration prevents the
first-tick burst; editing lives in the All notes note view plus `e` on Today
rows; delete is an inline confirm with a hard delete; ten smaller defaults
kept.

## Prompts

> Merged #18, start slice 4 and 6 in parallel

> Go with b, with c as fallback

> Yes, reopen it and update R8

> Yes, include +1 h and add C15

> Yes, add the backfill migration

> Yes, the note view plus e on Today rows

> Yes, inline confirm with a hard delete

> Yes, keep all ten defaults
