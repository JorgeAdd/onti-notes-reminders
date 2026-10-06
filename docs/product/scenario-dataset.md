# Scenario dataset — Jorge's week

Concrete data behind the key moments in `brief.md`. Used by the design
boards (`docs/design/chosen/`), the dev seed script, and the acceptance
tests. IDs (N1…N15) exist only in this document, the seed and the tests;
they are never shown in the UI.
Every count in the brief must be derivable from this table.

- User: Jorge, timezone `America/Mexico_City`.
- Days: Tue 6, Wed 7 and Thu 8 October 2026 (local time). Mexico City
  has no DST since 2022, so these days are a constant UTC−6. DST cases
  are covered by separate tests with another timezone.
- Assumption (from the brief): no notes are created between Tue 11:12
  and Wed 9:05, and none before the Thu 14:30 moment either.

## Notes (15 in total)

| ID  | Title                                              | Tag      | Reminder (local) | State at Wed 9:05      |
|-----|----------------------------------------------------|----------|------------------|------------------------|
| N1  | Notify Ana: move repo permissions from me to Luis  | Client A | Tue 17:00        | done (Tue 17:00)       |
| N2  | Reply to Marta about the staging deploy window     | Client A | Tue 18:00        | overdue                |
| N3  | Update the estimate for the onboarding epic        | Client C | Tue 18:30        | overdue                |
| N4  | Standup: mention the flaky checkout e2e test       | Client A | Wed 09:30        | due today              |
| N5  | Send rate-limit numbers to the infra team          | Client C | Wed 16:00        | due today              |
| N6  | Prep demo of search filters for the review         | Client B | Thu 15:00        | upcoming               |
| N7  | API keys rotate every 90 days                      | Client B | —                | note                   |
| N8  | Staging URL and test accounts                      | Client B | —                | note                   |
| N9  | Review agenda: search, exports, roles              | Client B | —                | note                   |
| N10 | Diego prefers async updates on Slack               | Client B | —                | note                   |
| N11 | PR review checklist                                | Client A | —                | note                   |
| N12 | Domain glossary                                    | Client C | —                | note                   |
| N13 | Shortcut cheat sheet for the team                  | Personal | —                | note                   |
| N14 | Read: Postgres partial indexes                     | Personal | —                | note                   |
| N15 | 1:1 with manager: topics                           | Personal | —                | note                   |

N1 is the note captured in Moment 1 (Tue 11:12). It is listed first
because it is the protagonist; all other notes already existed.

## How each moment's numbers come out of this table

| Moment          | Rule applied                                   | Result |
|-----------------|------------------------------------------------|--------|
| 1. Tue 11:12    | Notes total; reminders due Tuesday             | 15 notes; 3 due today (N1, N2, N3) |
| 2. Tue 17:00    | N1 fires and is marked done                    | 2 remain for today (N2, N3) |
| 3. Wed 09:05    | Today = overdue + due today, not done          | 4 items: 2 overdue (N2, N3), 2 due today (N4, N5); 11 others (N1, N6–N15) |
| 4. Thu 14:30    | Filter tag = Client B                          | 5 notes (N6–N10); 1 with reminder at 15:00 (N6) |

## Body examples (basic markdown)

N1:

```markdown
Ana needs to move **admin** permissions on `client-a/web` from me to Luis
before Friday's release.
- Repo settings → Collaborators
- Keep me as *maintainer* until the handoff
```

N8:

```markdown
Staging: https://staging.client-b.example
- `qa-admin` / see 1Password
- `qa-viewer` / see 1Password
```

## Derived values shown in the UI

| Moment       | Value                     | Rule (formalized in CONTRACT.md)                    |
|--------------|---------------------------|-----------------------------------------------------|
| Tue 11:12    | "in 5h48" (N1 preview)    | Time until `due_at`, from now (CONTRACT R6).        |
| Tue 11:12    | "+1 h · 12:12" preset     | +1 h is always **now + 1 h**.                       |
| Tue 11:12    | "12 other notes"          | Notes not on today's page: 14 − 2.                  |
| Tue 17:00    | "12 other notes"          | 15 − 3 (N1 stays on the page, struck through).      |
| Wed 09:05    | "late 15h05" (N2)         | Time since `due_at` for a not-done item.            |
| Wed 09:05    | "late 14h35" (N3)         | Same rule.                                          |
| Wed 09:05    | "in 25 min" (N4)          | Time until `due_at`.                                |
| Wed 09:05    | "11 other notes"          | 15 − 4. Not "undated": N1 and N6 have dates.        |
| Wed 09:05    | Snooze N2 +1 h → 10:05    | Now + 1 h; `original_due_at` stays Tue 18:00, `snooze_count` = 1 ("was Tue 18:00 · 1×"). |
| Wed 09:05    | Snooze N2 tomorrow → Thu 09:00 | Next local day at 09:00.                       |
| Thu 14:30    | "in 30 min" (N6)          | Time until `due_at`.                                |
| Thu 14:30    | "10 notes hidden"         | Filter on: 15 − 5.                                  |

