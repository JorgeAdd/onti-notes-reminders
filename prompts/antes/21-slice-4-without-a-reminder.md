# 21 — Plan the "Without a reminder" list for Slice 4

**Intent:** clean up the merged worktrees, then plan a Slice 4 feature
(docs only): a "Without a reminder" list in the date column, sources first
(CLAUDE.md rule 14).
**Outcome:** worktrees `landing` and `roadmap-assign` removed with their
merged branches. CONTRACT R19 with matrix rows C13 and C14 (own commit);
roadmap Slice 4 and backlog updated. The dataset gives N2–N15 the same
`created_at`, so R19 breaks ties by title, as R12 does; R19 also states the
list does not depend on the viewed day or a tag filter.

## Prompt

> Yes, remove both worktrees and delete the branches;
>
> Plan a new feature for Slice 4: "Without a reminder" list in the date column. Docs only; no code. Rule 14 applies (sources first), and ask before pushing.
>
> Decisions (final):
>
> - Shows only notes with no reminder (due_at is null), excluding done ones, newest first by created_at.
> - Desktop: below Sign out in the date column. Header "WITHOUT A REMINDER · {count}" (mono, muted, same style as "STILL OPEN FROM WED 7"). Up to 8 rows: title on one line with ellipsis, tags below in meta text. Then "+ {count − 8} more", only when count > 8, which opens All notes (slice 5, same as /).
> - Clicking a row opens All notes focused on that note (editing comes later in Slice 4).
> - Mobile (≤ 640 px): no list, only a link "{count} without a reminder" that opens All notes.
> - R5 text ("{n} other notes on the back of the pad") stays unchanged: it counts a different set.
> - Data: extend GET /today with `undated: { count, items[≤ 8] }` (id, title, tags, created_at). There are no extra requests, and the list follows the same refetch and optimistic updates as Today (e.g. capturing a note without a time adds it to the top).
> - Empty state: if count is 0, show nothing (no header).
> - Rules: tokens only (8), copy in messages (12), 44 px targets (11), no internal IDs (13).
>
> Do:
>
> 1. docs/CONTRACT.md: add rule R19 "Without a reminder" with an example on the scenario dataset (exact numbers from docs/product/scenario-dataset.md), in its own docs: commit.
> 2. docs/roadmap.md: add this feature to Slice 4.
> 3. docs/backlog.md: note it as planned for Slice 4.
>    Commit, show me the diff, and ask before pushing.
