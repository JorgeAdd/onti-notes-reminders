# Day Navigation Specification

## Purpose

View the page of any local day, not only today, by keyboard and on mobile. Behavior numbers live in `docs/CONTRACT.md`; this spec cites them and adds API surface, UI flows and states. A new CONTRACT rule R18 for another day's page (called "R18" below) MUST be written in `docs/CONTRACT.md` first, together with the wording changes it forces in R4 (other-day header "{n} things on Wed 7") and R5 (other-notes count on other days and filtered views), with their tests in the same commit (CLAUDE.md rule 23). Scenario data: `docs/product/scenario-dataset.md` (Thu 8, 14:30 = C8). Copy: `apps/web/src/messages.ts` only. Product decision Q1 and Q3 are the source for non-today content and mobile controls.

## Requirements

### Requirement: GET /today with date

`GET /today` MUST accept an optional `date` (local calendar date `YYYY-MM-DD`, interpreted in the profile timezone, R16) and return the page of that day for the token subject only (R15). Without `date` and `tag` the response MUST be unchanged from today's behavior. A `date` equal to today MUST return today's page (R3). A malformed or impossible date MUST return `400`. Missing or invalid token MUST return `401`.

#### Scenario: No parameters

- GIVEN the C4 state
- WHEN `/today` is requested with no parameters
- THEN every existing field keeps its value (C4)

#### Scenario: Another day

- GIVEN Thu 8 14:30 and the dataset
- WHEN `/today?date=2026-10-07` is requested
- THEN the page holds only reminders due on Wed 7 and has no carried group (R18)

#### Scenario: Invalid date

- GIVEN any state
- WHEN `date` is `2026-02-30`, `07-10-2026` or empty
- THEN the response is `400`

#### Scenario: Isolation

- GIVEN Ana's token and Jorge's notes
- WHEN `/today?date=2026-10-07` is requested
- THEN no item of Jorge appears (R15)

### Requirement: Non-today page content

The page for a day other than today MUST contain only reminders (open or done) whose due time is inside that local day (R1), with no carried group and no NOW line (R18, Q1). Rows MUST show the time without a relative duration (no "in {duration}", no "late {duration}"); snoozed rows keep "{time} · was {original} · {count}×" (R7). The date block MUST show the viewed day. The header MUST count open items on the page; its wording MAY name the day instead of "today" (assumption, correctable; copy in messages). "{n} other notes on the back of the pad" follows R5 with the viewed page as the page.

#### Scenario: Past day

- GIVEN Thu 8 14:30 and the dataset
- WHEN Jorge views Tue 6
- THEN rows show times only, the done item is struck, and no row reads "late"

#### Scenario: Future day with nothing due

- GIVEN the dataset and no reminder on Fri 9
- WHEN Jorge views Fri 9
- THEN the layout renders with an empty rail and calm day-specific copy, no onboarding, and the other-notes line still shows

### Requirement: Keys

Outside text fields, with the capture bar and sheets closed: `[` MUST view the previous local day, `]` the next, and `t` today. `t` MUST do nothing on today. Stepping MUST start from the day in the URL state, not from loaded data, so rapid presses never skip or repeat a day; a response for a superseded day MUST NOT replace the current page. `[` before 2000-01-01 and `]` past 2099-12-31 MUST do nothing (no request, no `400`). While the tag bar is open (see `tag-filter`) these keys MUST do nothing. Focus MUST NOT remain on a row that left the page; on a day change focus resets to the first row of the new page. The statusline counts describe the viewed page (rail items on other days, the R3 page on today).

#### Scenario: Rapid presses

- GIVEN today is Thu 8 and the next day is still loading
- WHEN `]` is pressed twice quickly
- THEN Sat 10 is shown, and a late Fri 9 response is discarded

#### Scenario: Back to today

- GIVEN Jorge views Tue 6
- WHEN `t` is pressed
- THEN today's page shows, including its carried group (R3)

### Requirement: DST days

Stepping MUST move one local calendar day (R1), so a day of 23 h or 25 h (D1, D2) shows exactly the reminders due in it, and no date is skipped or repeated across the change.

#### Scenario: Spring forward and fall back

- GIVEN a New York profile
- WHEN Jorge steps `]` through Sat 7 Mar, Sun 8 Mar (D1) and Mon 9 Mar 2026
- THEN each reminder appears on exactly one day, and the same holds across Sun 1 Nov 2026 (D2)

### Requirement: URL state

The viewed day and tag MUST live in the URL as `?d=YYYY-MM-DD&tag=slug`, and survive refresh, back and forward. Each day or filter change MUST add a history entry. Absent `d` means today and MUST follow today across midnight; a `d` equal to today SHOULD be dropped. An invalid `d` MUST fall back to today with one calm message line from messages: the URL reader reuses the shared `dayQuerySchema`, so a syntactically invalid `d` never reaches the server, and a server `400` for the viewed key drops the offending param with `replaceState` (no history entry) and shows the same line.

#### Scenario: Refresh and back

- GIVEN Jorge views Tue 6 with `#client-a`
- WHEN he refreshes, then presses back after `]`
- THEN Tue 6 with `#client-a` shows each time

#### Scenario: Bad URL

- GIVEN the URL has `?d=garbage`
- WHEN the page loads
- THEN today's page shows and the URL drops `d`

### Requirement: Mobile controls

On narrow screens "‹" and "›" buttons MUST sit beside the date block, and a "Today" button MUST appear only when not viewing today (Q3). Each MUST be at least 44 px, have an accessible name from messages (not only a glyph), and show the focus outline (SG13). Controls MUST NOT overflow horizontally.

#### Scenario: Controls

- GIVEN a narrow viewport on Wed 7 while today is Thu 8
- WHEN the page renders
- THEN ‹, › and Today show; tapping Today returns to today, where Today hides

### Requirement: Loading, errors and consistency

While a day loads (previous data kept as placeholder), the date block, header and statusline day MUST come from the requested view date (or today), never from the previous data's window, with a loading indicator; row actions are disabled, but capture (`c`) stays allowed and MUST NOT cancel the viewed key's load. Midnight rollover is driven by the end of today's window computed from the clock and profile timezone, not by the viewed day's window, so a viewed past or future day neither refetches on every tick nor misses midnight. A failure MUST show the error state with retry; a `401` ends the session with "session expired" (today-page). After any action (reminder-actions) or capture, the viewed page MUST reflect the change by the same rules, and the page MUST refetch on window focus and at midnight.

#### Scenario: Snooze leaves the day

- GIVEN Jorge views Fri 9 and snoozes a row with "+1 h"
- WHEN the action succeeds
- THEN the row leaves Fri 9 and appears on today (R7)

#### Scenario: Midnight on another day

- GIVEN Jorge views a past day and the clock ticks each minute
- WHEN no midnight is crossed
- THEN no refetch happens; viewing tomorrow and crossing midnight refetches once

#### Scenario: Loading another day

- GIVEN Jorge views Thu 8 and presses `]`
- WHEN Fri 9 is still loading
- THEN the date block, header and statusline show Fri 9 with a loading indicator and `x` does nothing

#### Scenario: Day fetch fails

- GIVEN `/today?date=` returns 5xx
- WHEN Jorge steps `]`
- THEN the error state with retry shows for that day

### Requirement: Accessibility

Day changes SHOULD be announced politely (viewed day text) through one `aria-live="polite"` region owned by `TodayContainer` (also used for "{n} notes"). Hints for `[`, `]` and `t` MUST come from messages and `t` MUST show only off-today. The ‹, › and Today buttons MUST take their `aria-label` from messages, and the date block MUST carry `aria-current="date"` only when the viewed day is today.

#### Scenario: Announcement

- GIVEN a screen reader
- WHEN `]` is pressed
- THEN the new day's name is announced without moving focus out of the page
