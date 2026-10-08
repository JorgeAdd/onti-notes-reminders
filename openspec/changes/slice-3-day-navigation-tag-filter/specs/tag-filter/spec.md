# Tag Filter Specification

## Purpose

Show only notes with one tag, on any viewed day, by keyboard and on mobile. Rule is R12 (matrix C8, with R3, R5, R6 and R15); this spec adds API surface, UI flows and states. R12 clarifications (carried items filtered, the "Other notes" section, counts independent of the viewed day, what makes a tag "known") MUST be written in `docs/CONTRACT.md` first, with tests in the same commit (CLAUDE.md rule 23). Scenario data: `docs/product/scenario-dataset.md` (Thu 8, 14:30 = C8). Copy: `apps/web/src/messages.ts` only. Product decisions Q2, Q3 and Q4 are the source.

## Requirements

### Requirement: GET /today with tag

`GET /today` MUST accept an optional `tag` (slug), combinable with `date`. The response MUST contain the filtered page (R3 or the another-day rule), the matching notes not on that page with their dates where they have one, the match count and the hidden count (R12), and enough data to offer every tag of the token subject. A tag is "known" only if it appears on at least one of the subject's own notes (as listed by `listOwn`). A malformed slug, or any slug that is not known (a typo, another user's tag, or a tag row that has no notes), MUST return `400` (R15, so existence does not leak). A known tag therefore always yields at least one match.

#### Scenario: Client B at Thu 14:30 (C8)

- GIVEN Thu 8 14:30 and the dataset
- WHEN `/today?tag=client-b` is requested
- THEN one timed item is on the rail "in 30 min" and four notes are listed below, per C8 (R12, R6)

#### Scenario: Invalid and unknown tag

- GIVEN any state
- WHEN `tag` is `Client B!`, or `nope` (not a tag of the user), or another user's tag, or a tag of the user that is on no note
- THEN the response is `400`

#### Scenario: Isolation

- GIVEN Ana's token
- WHEN `/today?tag=client-b` is requested
- THEN no note of Jorge appears (R15)

### Requirement: Filter scope

The filter MUST apply to carried items and the rail, and the page MUST NOT show non-matching items. All other matching notes (undated, or due on other days) MUST appear in a section labelled "Other notes with #{tag}" (never "no date", SG8), each timed one showing its date and time and each undated one showing no date text at all (title and tags only), in a stable order (assumption: not specified by Q2). Those rows are read-only (assumption, correctable): no focus line, no actions. The filter MUST persist while the day changes; the section recomputes for each viewed day.

#### Scenario: Carried filtered

- GIVEN Wed 7 09:05 and filter `#client-a`
- WHEN the page renders
- THEN the carried group holds only Client A items and no Client C item shows

#### Scenario: Persists across days

- GIVEN `#client-b` on Thu 8
- WHEN Jorge presses `]`
- THEN the rail is empty, the timed item due Thu 8 moves to "Other notes with #client-b" with its date, and the filter stays

### Requirement: Header and statusline

The header MUST read "{n} notes" with the side note "{total − n} notes hidden" (R12, Q4); `n` and the hidden count MUST NOT change when the viewed day changes. Board 04's title and "N on today's page" line are not adopted. While a filter is on, the statusline mode label MUST read `FILTER · #{slug}` (Q4); the deviation from board 04 MUST be recorded in `docs/design/style-guide-decisions.md`. On narrow screens, where the mode label MAY be hidden, the header side note MUST still show the filter state and MUST name the tag ("{hiddenCount} notes hidden · #{slug}", copy in messages). The statusline counts describe the viewed page (R3 on today, the day's items elsewhere) and are not affected by the filter beyond the page content.

#### Scenario: Header

- GIVEN `#client-b` at Thu 8 14:30
- WHEN the page renders
- THEN the header and side note equal C8 and the statusline shows `FILTER · #client-b`

### Requirement: Tag bar and keys

Outside text fields, with the capture bar and sheets closed, `#` MUST open the tag bar listing every tag of the user (not only those on the page). `tab` and `shift+tab` MUST move the highlighted chip, wrapping; `↵` MUST apply it and close the bar; `#` with a filter on MUST highlight the active tag. While the bar is open other layer keys (`j`, `k`, `x`, `z`, `s`, `[`, `]`, `t`) MUST do nothing. `esc` MUST act on one level per press, in this order: disarm a pending snooze menu; close the open tag bar without changing the filter; clear the filter. Hints (`#`, `tab`, `↵`, `esc`) MUST show only when they work, text from messages.

#### Scenario: Apply

- GIVEN no filter
- WHEN `#`, `tab`, `↵` are pressed
- THEN the highlighted tag is applied, the bar closes and the URL has `tag`

#### Scenario: Esc order

- GIVEN a filter on, the bar open, and a snooze menu armed
- WHEN `esc` is pressed three times
- THEN the menu disarms, then the bar closes with the filter kept, then the filter clears

#### Scenario: Bar closed

- GIVEN a filter on and no bar
- WHEN `esc` is pressed
- THEN the filter clears and the full page returns (R12)

### Requirement: Empty and error states

The "0 notes" state is reachable only on the client, when optimistic actions or settled writes remove the last note carrying the active tag while the filter is on (the server answers `400` for a tag on no note). It MUST show header "0 notes", every note hidden, calm copy, and `esc` still clears; it is produced by the shared `buildDayResponse` and patch. A filtered day with no matching timed items MUST show an empty rail with calm copy and still show the "Other notes" section when it has rows. A URL `tag` answered with `400` (unknown, or on no note) MUST be dropped with `replaceState`, one calm message line from messages, and the unfiltered page shown. The URL reader MUST reuse the shared `dayQuerySchema`, so a syntactically invalid `tag` never reaches the server. Failure and loading follow `day-navigation`.

#### Scenario: Last tagged note removed

- GIVEN `#client-b` is on and its only remaining note is removed by an action
- WHEN the patch settles on the page
- THEN "0 notes" and calm copy show, nothing else is listed, and `esc` clears

#### Scenario: Unknown tag in the URL

- GIVEN the URL has `?tag=nope` and the server answers `400`
- WHEN the page loads
- THEN the URL drops `tag` (replace, no history entry), one message line explains it, and the unfiltered page shows

#### Scenario: Invalid tag syntax in the URL

- GIVEN the URL has `?tag=Client%20B!`
- WHEN the page loads
- THEN no request carries that tag, the URL drops it and the unfiltered page shows

### Requirement: Mobile filter

The bottom bar MUST offer a "Tags" button (at least 44 px) that opens tag chips in the dock (Q3; Search belongs to a later slice). Tapping a chip applies it and closes the dock. With a filter on, the dock MUST include a "Clear #{tag}" chip that clears it; a tap outside the open dock MUST close it and MUST NOT clear the filter (Q3, matching `esc` order and the command bar). A tap that dismisses the dock MUST NOT also open a row sheet: rows open on `click`, so a `pointerdown` close alone is not enough; while the dock is open a transparent backdrop MUST consume the outside tap (close, `preventDefault`, no pass-through to rows). Chips MUST be at least 44 px with visible focus.

#### Scenario: Apply and clear

- GIVEN a narrow viewport
- WHEN Jorge taps Tags, then a chip, then Tags, then "Clear #client-b"
- THEN the filter applies, then clears, and the URL drops `tag`

#### Scenario: Outside tap keeps the filter

- GIVEN a narrow viewport, the filter on `#client-b` and the tag chips open
- WHEN Jorge taps outside the dock
- THEN the dock closes, the filter stays on and no row sheet opens

### Requirement: Accessibility

Chips MUST expose the highlighted or active state in text or semantics, not only color (`aria-pressed` on the applied chip, `aria-current="true"` on the highlighted candidate). Filter changes SHOULD be announced politely ("{n} notes") through the single `aria-live="polite"` region owned by `TodayContainer`, shared with day changes.

#### Scenario: Active chip

- GIVEN a filter on
- WHEN the tag bar opens
- THEN a screen reader identifies the active chip
