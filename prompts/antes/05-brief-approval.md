# 05 — Brief approval with adjustments

**Intent:** approve the brief and tighten three decisions the AI had left
loose (markdown safety, snooze data, timezones).
**Outcome:** brief updated; Phase 2 (repo skeleton) started.

## Prompt

```
Approved, with these adjustments:

1. Markdown subset with code blocks: OK. Add to the brief that rendered
   markdown is always sanitized (no raw HTML) — this becomes a CONTRACT rule.
2. Snooze: in scope for v1, presets only (+1 h, tomorrow 9:00). It moves
   due_at, but we keep original_due_at and snooze_count so v2 "missed"
   metrics stay honest. Formal rule goes in CONTRACT.md in Phase 4.
3. Timezones: more than display. Store timestamps in UTC (timestamptz),
   store the user's IANA timezone in their profile, compute "today" and
   "overdue" boundaries in that timezone, and the scheduler fires at the
   UTC instant. Cover DST in tests. Details go in the ADRs in Phase 4.

Update the brief with these notes, show me only the changed sections,
then move to Phase 2.
```
