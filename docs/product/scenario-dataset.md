# Scenario dataset — Jorge's week

Concrete data behind the key moments in `brief.md`. Used by the design
reference sheets, the dev seed script, and the acceptance tests.
Every count in the brief must be derivable from this table.

- User: Jorge, timezone `America/Mexico_City`.
- Days: Tuesday, Wednesday, Thursday of the same week (local time).
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
