# CONTRACT — behavior rules

This is the behavioral source of truth. The rules (R1–R19) are general and
apply to any user and any data. The matrix below proves them with the
scenario in `docs/product/scenario-dataset.md` (Jorge, `America/Mexico_City`,
Tue 6 – Thu 8 Oct 2026). Acceptance tests assert every row with an
injected clock.

Notation: `now` is the injected clock; "local" means in the user's profile
timezone; `start(d)` is local midnight of day `d`.

## Rules

### Time and the day page

- **R1 · Day window.** For any local calendar date `d`,
  `day(d) = [start(d), start(d + 1))`; today is `day(local date of now)`, so
  `today = [start(now), start(now + 1 local day))`. Dates move by calendar
  arithmetic (`2026-03-07 + 1 = 2026-03-08`), never by "+24 h", and the
  window is computed from local midnights, so it is 23 h or 25 h on DST days.
  Navigable dates run from 2000-01-01 to 2099-12-31.
- **R2 · Overdue / late.** A reminder is overdue when `due_at < now` and
  `done_at is null`. It shows "late {duration}" (`now − due_at`).
- **R3 · Today's page.** It contains every reminder that is either
  open with `due_at < end of today`, or done with `due_at` inside today.
  - **Carried group** ("Still open from {day}"): open with
    `due_at < start(now)`, grouped by local day, oldest first.
  - **Rail**: `due_at` inside today, in time order; done items stay,
    struck through.
- **R4 · Page header.** Counts the open items on the viewed page.
  Copy on today: "{n} things today"; once any item due today is done,
  "{n} left today". On another day: "{n} things on Wed 7" (never "left").
- **R5 · Other notes.** "{n} other notes on the back of the pad", where
  `n = total notes − items on the viewed page`, on today and on any other
  day. Under a tag filter the other notes are the matching notes not on the
  page (R12). They are not "undated": some have reminders on other days.
- **R6 · Durations.** Under 1 h → "{m} min"; whole hours → "{h} h";
  otherwise "{h}h{mm}" (e.g. "15h05", "5h48"). Upcoming: "in {duration}";
  overdue: "late {duration}". Minutes are truncated, never rounded up. At exactly the due time an item is not late yet (R2 is strict) and
  reads "in 0 min".

### Reminder lifecycle

- **R7 · Snooze** (open reminders only, presets only):
  - "+1 h" → `due_at := now + 1 h` (truncated to the minute).
  - "Tomorrow 9:00" → `due_at := start(now + 1 local day) + 9 h`.
  - Both: `snooze_count += 1`; `original_due_at` unchanged;
    `done_at` stays null. Shown as "{time} · was {original} · {count}×".
- **R8 · Manual reschedule.** Setting a due time by hand sets `due_at` and
  `original_due_at` to the new value and `snooze_count := 0`. Removing the
  reminder clears all reminder fields.
- **R9 · Done / undo.** Done: `done_at := now`. Done on an already-done
  note keeps the first `done_at`. Done on a note without a reminder is a
  conflict (an error, `409` over HTTP). Undo: `done_at := null`; undo on an
  open note changes nothing. Done never touches `due_at`.
- **R10 · Notification.** Sent once per `due_at` value, when
  `due_at <= now`, `done_at is null` and
  `notified_due_at is distinct from due_at`; then
  `notified_due_at := due_at`. Delivered within one scheduler tick (30 s).
  With no subscription or permission denied, nothing is sent and the item
  still appears on today's page (R3): notifications are an extra channel,
  never the only one.
- **R11 · Capture parsing.** In the command bar:
  - `#slug` tokens become tags (created if missing; display name derived
    from the slug, "client-a" → "Client A").
  - `HH:MM` → today at that time if it is still ahead of `now`, otherwise
    tomorrow at that time. `today HH:MM` is accepted even when that time
    has already passed (the note is then overdue). `tomorrow HH:MM`,
    `+{n}h` and `+{n}m` are also accepted; relative times are truncated to
    the minute.
  - The remaining text, trimmed, is the title (1–200 chars).
  - Until ↵, the parse is shown as an italic preview; nothing is saved.
  - Mobile presets produce the same values (R7 math for "+1 h" and
    "Tomorrow 9:00").

### Views and safety

- **R12 · Tag filter.** `#slug` shows notes with that tag: timed items of
  the viewed day on the rail (carried items are filtered too), the rest
  listed below under "Other notes with #slug", ordered by due time with
  undated notes last (then title). Dated rows show date and time; undated
  rows show no date text. Header "{n} notes" (`n` = page + other notes);
  side note "{total − matching} notes hidden"; `esc` clears. The filter
  persists across day navigation. The slug must be on at least one of the
  user's own notes; any other slug is a validation error (R15: no
  existence leak). In All notes (R13) the same filter narrows the list: only
  notes with that tag, combined with the search text, applied before the
  50-note cap. There an unknown slug is an empty list, not an error (a list
  never confirms or denies a tag); `#` opens the tag bar, the first `esc`
  clears the tag and closes the bar, the next `esc` leaves the view.
- **R13 · Search.** Case-insensitive full-text match on title + body over
  all of the user's notes. Matching is by word prefix: every word typed
  must start a word of the title or body (`stag` finds "Staging"), and
  punctuation in the query is ignored, never read as query syntax. Results
  are the user's notes, newest first, at most 50, with no pagination and no
  highlighting; the total shown beside them is always the user's whole note
  count.
- **R14 · Markdown safety.** Note bodies render the basic markdown subset
  (bold, italic, lists, links, inline code, code blocks). Raw HTML is never
  rendered; it shows as text. Links are `http`, `https` or `mailto` only
  and open with `rel="noopener noreferrer"`.
- **R15 · Ownership.** Every read and write is scoped to the JWT subject.
  Another user's note returns `404` (never `403`, to not leak existence).
  Missing or invalid token → `401`.
- **R16 · Time storage.** Instants are stored in UTC; everything shown or
  computed "per day" uses the profile timezone. A nonexistent local time
  (DST gap) resolves to the first valid instant after it (02:30 on
  2026-03-08 in America/New_York is 03:00 EDT). An ambiguous local time
  (DST fall-back overlap) resolves to its first occurrence (01:30 on
  2026-11-01 in America/New_York is 01:30 EDT, 05:30Z).
- **R17 · Missed (v2, documented now).** A reminder is missed when
  `done_at is null` and `now >= original_due_at + 24 h`. Snoozing does not
  reset it; that is why `original_due_at` exists.

- **R18 · Page of another day.** The page for a day other than today holds
  the items due inside that day's window, open or done (done stay struck).
  It has no carried group, no NOW line and no relative durations: rows show
  the time only (no "late", no "in"). The date block shows the viewed day.
  Done, snooze and undo work as on today (R7, R9); `t` returns to today.

- **R19 · Without a reminder (slice 4, documented now).** The notes with
  `due_at is null` and `done_at is null`, newest first by `created_at`,
  ties by title. The set does not depend on the viewed day or on a tag
  filter. Header "Without a reminder · {n}"; at most 8 rows (title on one
  line, tags below), then "+ {n − 8} more" only when `n > 8`. When `n = 0`
  nothing is shown, not even the header. A row opens All notes (R13) on
  that note; "+ {n − 8} more" opens All notes as `/` does. On mobile there
  is no list, only "{n} without a reminder", which opens All notes. Capture
  without a time (R11) adds the note at the top; setting a reminder (R8,
  R11) takes it out, removing one (R8) puts it back. R5 is unchanged: it
  counts the notes not on the viewed page, a different set.

## Matrix — EVENT → STATE BEFORE → CHANGE → STATE AFTER

Times are local (`America/Mexico_City`, UTC−6). IDs refer to the dataset
and never appear in the UI.

| #   | Event                                                                                                           | State before                                                                             | Change                                                                                                                                                | State after                                                                                                                                                                        | Rules                  |
| --- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| C1  | **Tue 6 11:12** — Jorge types `Notify Ana: move repo permissions from me to Luis #client-a 17:00` and presses ↵ | 14 notes. Today's page: 2 (N2 18:00, N3 18:30). Header "2 things today". 12 other notes. | Insert N1: `due_at` = `original_due_at` = Tue 17:00 (23:00Z), `snooze_count` 0, tag Client A. Preview before ↵: "→ Client A · today 17:00 · in 5h48". | 15 notes. Today's page: 3. Header "3 things today". 12 other notes.                                                                                                                | R3, R4, R5, R6, R11    |
| C2  | **Tue 6 17:00** — scheduler tick                                                                                | N1 open, `due_at` 17:00, `notified_due_at` null.                                         | Push "17:00 · Notify Ana: move repo permissions from me to Luis" with body + tag. `notified_due_at := 17:00`.                                         | Next tick picks 0 reminders.                                                                                                                                                       | R10                    |
| C3  | **Tue 6 17:00** — Jorge clicks Done in the notification                                                         | Header "3 things today".                                                                 | N1 `done_at := 17:00`.                                                                                                                                | Header "2 left today". N1 struck on the rail. Today's page still 3 items; 12 other notes.                                                                                          | R3, R4, R9             |
| C4  | **Wed 7 09:05** — Jorge opens the app (day rollover)                                                            | (Tue) N2, N3 open, due Tue.                                                              | None: time passed.                                                                                                                                    | Carried "Still open from Tue 6": N2 "late 15h05", N3 "late 14h35". Rail: N4 09:30 "in 25 min", N5 16:00. Header "4 things today". 11 other notes. N1 not shown (done Tuesday).     | R1, R2, R3, R4, R5, R6 |
| C5  | **Wed 7 09:05** — `s → h` on N2                                                                                 | N2 `due_at` Tue 18:00, `original_due_at` Tue 18:00, `snooze_count` 0; carried 2.         | `due_at := Wed 10:05`; `snooze_count := 1`.                                                                                                           | N2 on the rail at 10:05, "10:05 · was Tue 18:00 · 1×". Carried 1 (N3), rail 3 open. Header "4 things today". 11 other notes. Notification re-armed for 10:05.                      | R7, R10                |
| C6  | **Wed 7 09:05** — `s → t` on N2 (instead of C5)                                                                 | Same as C5.                                                                              | `due_at := Thu 8 09:00`; `snooze_count := 1`.                                                                                                         | Today's page 3 (N3 carried, N4, N5). Header "3 things today". 12 other notes.                                                                                                      | R7, R3, R5             |
| C7  | **Wed 7 09:30** — N4 is due; Jorge denied notification permission                                               | No push subscription. N4 open, 09:30.                                                    | No push sent.                                                                                                                                         | N4 still on today's page; at 09:31 it reads "late 1 min".                                                                                                                          | R10, R2, R6            |
| C8  | **Thu 8 14:30** — `#client-b`                                                                                   | 15 notes.                                                                                | Filter on.                                                                                                                                            | 5 notes: N6 on the rail at 15:00 "in 30 min"; N7–N10 listed below. "10 notes hidden".                                                                                              | R12, R6                |
| C9  | **Any time** — search `staging`                                                                                 | 15 notes.                                                                                | Query.                                                                                                                                                | 2 results: N2 (title), N8 (title + body).                                                                                                                                          | R13                    |
| C10 | **Any time** — a body contains `<img src=x onerror=alert(1)>`                                                   | —                                                                                        | Render.                                                                                                                                               | Shown as literal text; no element is created; no script runs.                                                                                                                      | R14                    |
| C11 | **Any time** — Ana (another user) requests N1                                                                   | N1 belongs to Jorge.                                                                     | `GET /notes/{N1}` with Ana's token.                                                                                                                   | `404`. Listing returns 0 of Jorge's notes. Without a token: `401`.                                                                                                                 | R15                    |
| C12 | **Missed (v2)** — Thu 8 09:05, N3 still open                                                                    | N3 `original_due_at` Tue 18:30.                                                          | —                                                                                                                                                     | Missed (38h35 past the original due time), even if it had been snoozed.                                                                                                            | R17                    |
| C13 | **Wed 7 09:05** — Jorge opens the app (desktop)                                                                 | 15 notes; N1–N6 have reminders, N7–N15 have none (all created Thu 1 10:00).              | None.                                                                                                                                                 | "Without a reminder · 9". 8 rows by title (same `created_at`): N15, N7, N10, N12, N11, N14, N9, N13; then "+ 1 more" (N8). Mobile: "9 without a reminder". Still "11 other notes". | R19, R5                |
| C14 | **Wed 7 09:05** — Jorge captures `Export format questions #client-b` (no time)                                  | As C13.                                                                                  | Insert a note with no reminder, `created_at` Wed 09:05, tag Client B.                                                                                 | 16 notes. "Without a reminder · 10": the new note first, then N15, N7, N10, N12, N11, N14, N9; "+ 2 more". Header "4 things today". 12 other notes.                                | R19, R11, R4, R5       |

### DST cases (timezone `America/New_York`)

| #   | Event                                     | Change                                 | State after                                                                        | Rules   |
| --- | ----------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------- | ------- |
| D1  | Sun 8 Mar 2026 (spring forward)           | Today window.                          | 23 h long: `[05:00Z, 04:00Z next day)`.                                            | R1      |
| D2  | Sun 1 Nov 2026 (fall back)                | Today window.                          | 25 h long.                                                                         | R1      |
| D3  | Sun 8 Mar 2026 01:30 EST, "+1 h"          | `due_at := now + 1 h`.                 | 03:30 EDT (07:30Z).                                                                | R7, R16 |
| D4  | Sat 7 Mar 2026 22:00 EST, "Tomorrow 9:00" | `due_at := start(Sun 8) + 9 h` local.  | Sun 8 Mar 09:00 EDT = 13:00Z (not 14:00Z).                                         | R7, R16 |
| D5  | Navigate Sat 7 → Sun 8 → Mon 9 Mar 2026   | Day window of each date.               | Sun 8 is 23 h; no day skipped or repeated; each window ends where the next starts. | R1, R18 |
| D6  | Navigate to Sun 1 Nov 2026 and Mon 2 Nov  | Day window; item at 04:59Z and 05:00Z. | Sun 1 is 25 h; 04:59Z belongs to Sun 1, 05:00Z to Mon 2.                           | R1, R18 |

## Verification status

Automated in `packages/shared/test/contract.test.ts` (one `describe` per
row, injected clock, dataset fixture in `test/fixtures/jorge-week.ts`):
C1–C8, C12 and D1–D4. Edge cases of the rules are in `rules.test.ts`.
Both run in `npm run verify` (pre-commit hook and CI).

Page-level proof (slice 1, the Today page):

| Rows            | Proven by                                                                                                                                                                                                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1, C3, C4, C7  | `apps/api/test/today.test.ts`: `getToday` with an injected `Clock` and a fake repository built from the dataset (membership, counts, N1 absent, 09:31 still on the page).                                                                                                                                       |
| C3, C4, C7      | `apps/web/test/day-page.test.tsx`, `hour-rail.test.tsx`, `rail-model.test.ts`: the page at Wed 09:05 (header, carried group, rail with the now line between the 09 hour and the 09:30 item, statusline counts), the done strike, and the minute tick (`in 25 min` to `in 24 min`, now line `09:05` to `09:06`). |
| C4 on real data | The demo seed plus `GET /today` returns the C4 page for Jorge's account; the seed plan is unit-tested in `apps/api/test/seed-plan.test.ts` and `seed-demo.test.ts`.                                                                                                                                             |

Slice 2 (capture, snooze, done and undo) adds the write-side proof:

| Rows               | Proven by                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1 (capture)       | `apps/web/test/capture-preview.test.ts`: the preview "→ Client A · today 17:00 · in 5h48" at Tue 6 11:12. `apps/api/test/capture-note.test.ts` and `server.test.ts` (`POST /notes`): what the preview parses is what is saved (3 items, 12 other notes). `apps/web/test/capture-flow.test.tsx`: `c`, pending row, swap for the server note, rollback, plain note.                     |
| C3 (done mutation) | `apps/api/test/reminder-actions.test.ts` and `server.test.ts` (`POST /notes/:id/done`): `done_at` stamped by the clock. `packages/shared/test/today-patch.test.ts`: the optimistic page equals the next `GET /today`. `apps/web/test/keyboard.test.tsx` (`x`, `z`) and `reminder-actions.test.tsx`: optimistic done, rollback and refetch. `mobile-flow.test.tsx`: Done in the sheet. |
| C5 (`s h`)         | `apps/api/test/reminder-actions.test.ts` and `server.test.ts`: +1 h from 09:05 is 10:05, count 1, original due unchanged. `apps/web/test/keyboard.test.tsx` (`s h`), `which-key.test.tsx` and `action-sheet.test.tsx`: the resulting time shown is the one saved.                                                                                                                     |
| C6 (`s t`)         | `apps/api/test/reminder-actions.test.ts` and `server.test.ts`: Tomorrow 9:00 is Thu 09:00, count 1. `packages/shared/test/dst.test.ts` (D4): the same rule across DST. `apps/web/test/keyboard.test.tsx` (`s t`): the item leaves the page and joins the other notes.                                                                                                                 |

Slice 3 (day navigation and tag filter) adds the read-side proof:

| Rows    | Proven by                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C8, R12 | `packages/shared/test/contract.test.ts`, `day-response.test.ts` and `other-notes.test.ts`: 1 rail row, 4 other notes, 10 hidden. `apps/api/test/today.test.ts` (`GET /today?tag`). `apps/web/test/tag-filter.test.tsx` and `filtered-page.test.tsx`: `#` and the tag bar, "5 notes", "10 notes hidden", the other-notes section. `apps/web/test/mobile-tags.test.tsx`: Tags button, chips, Clear chip, outside tap keeps the filter. |
| R18     | `packages/shared/test/day-page.test.ts` and `apps/api/test/today.test.ts`: a past day has no carried group and no now line, done items stay. `apps/web/test/day-navigation.test.tsx`: time-only rows, viewed-day date block, header and statusline, per-day empty state.                                                                                                                                                             |
| D5, D6  | `packages/shared/test/calendar-date.test.ts` (`dayWindow`): Sun 8 Mar is 23 h, Sun 1 Nov is 25 h, windows tile with no day skipped or repeated, 04:59Z and 05:00Z fall on Sun 1 and Mon 2. `apps/web/test/day-navigation.test.tsx`: `[` `]` `t` step through the days.                                                                                                                                                               |

Manual smoke (viewport 1280x720 and 375x667) is recorded in the pull request
of slice 3: Thu 8 14:30 `#client-b`, `[` to Wed 7, `t`, reload and back keep
the view, `s t` then `]`, 2 Nov and 8 Mar with a New York profile, light and
dark, reduced motion, no horizontal scroll.

Slice 5 (all notes and search) adds the read-side proof. The `it.todo` markers
for these rows stay in `packages/shared/test/contract.test.ts`; the rows are
asserted where the feature lives:

| Rows                    | Proven by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C9 (search)             | `apps/api/test/search-notes.test.ts` (use case over the fake) and `apps/api/test/postgres/search.pg.test.ts` (real Postgres, run with `ONTI_TEST_DATABASE_URL`, not in CI): `staging` gives N2 (title) and N8 (title and body); a word only in the body of N1 finds N1; word prefix, case, AND, newest first, at most 50, total never narrowed. `apps/api/test/search-route.test.ts`: `GET /notes?q=`.                                                                                                                                                       |
| R12 in All notes        | `packages/shared/test/notes-list.test.ts` (`tag` is a slug), `apps/api/test/search-notes.test.ts` (tag alone, with a term, before the 50 cap, unknown and other users' tags give an empty list), `search-route.test.ts` (`GET /notes?q=&tag=`, 400 for a malformed or repeated tag), `postgres/search.pg.test.ts` (SQL `exists`, 5 tagged notes among 55 newer ones, Ana's same-slug tag). `apps/web/test/notes-container.test.tsx` and `notes-view.test.tsx`: `#` bar, tag applied, statusline `· #slug`, two-step `esc`, phone Tags button and Clear chip. |
| C11 (listing and `401`) | `apps/api/test/search-route.test.ts`: no token and a forged token give `401`; Ana lists 0 of Jorge's notes. `search-notes.test.ts` and `search.pg.test.ts`: Ana's search never sees his notes (explicit `user_id` plus RLS).                                                                                                                                                                                                                                                                                                                                 |

Still `todo`: C10 (markdown rendering, web), the `404` half of C11
(`GET /notes/{id}` for another user's note, API; slice 4 owns note detail),
and R19 with C13 and C14 (the "Without a reminder" list; slice 4 adds the
rule and its tests together, CLAUDE.md rule 23).
C11's `401` part is also covered in `apps/api/test/server.test.ts`; RLS
isolation was verified with SQL on the migration (see `docs/db/schema.md`).
