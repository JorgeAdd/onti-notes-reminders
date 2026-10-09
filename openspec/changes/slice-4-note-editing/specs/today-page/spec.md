# Delta for today-page

Slice 4 adds the undated set to `/today` and the `e` key. Behavior numbers: `docs/CONTRACT.md` (R19; C13, C14). Tags: `[PR1]` read side, `[PR2]` write side.

## MODIFIED Requirements

### Requirement: GET /today API

The API MUST expose `GET /today`, verify the JWT, and return the day page of the token subject only (R15). "Today" and every per-day grouping MUST use the profile timezone (R16) and the Clock port (R1). The response MUST conform to a shared schema validated on both sides. [PR1] It MUST also carry the undated set of `undated-list` (R19).
(Previously: no undated set in the response.)

#### Scenario: Wed 09:05 day page (C4)

- GIVEN Jorge's dataset and a clock at Wed 7 09:05 local
- WHEN he requests `/today`
- THEN carried, rail, open count and other-notes count equal C4 (R3, R4, R5)

#### Scenario: Done item stays (C3)

- GIVEN a clock at Tue 6 17:00 and N1 done at 17:00
- WHEN he requests `/today`
- THEN the page has 3 items, 2 open, and 12 other notes

#### Scenario: Auth and isolation

- GIVEN a missing or invalid token
- WHEN `/today` is requested
- THEN the response is `401`
- AND with Ana's token no item of Jorge appears (R15)

#### Scenario: Timezone

- GIVEN a profile timezone with a DST day (D1/D2)
- WHEN `/today` is requested on that day
- THEN the window is computed in local-day arithmetic (R1)

#### Scenario: Undated set [PR1]

- GIVEN Jorge's dataset at Wed 7 09:05
- WHEN he requests `/today`
- THEN the response carries the C13 undated count and leading items, and the page fields are unchanged

### Requirement: Statusline

A statusline fixed at the bottom MUST show the weekday, day, today/carried/total counts and the current time, matching boards 03/09; weekday and day name the viewed day. The mode label MUST show on desktop; MAY be hidden on narrow (mobile) layouts per board 05. While a tag filter is on, the mode label MUST read `FILTER · #{slug}` (`tag-filter`). On desktop it MUST show key hints only for keys that work in the current state (`c`, `j`/`k`, `x`, `z`, `s`, `esc`, and `[`/`]`, `t`, `#`, `tab`, `↵` per `day-navigation` and `tag-filter`, `/` for search, and `e` with a row focused [PR2]), and MUST NOT show hints for keys of unshipped features. Hint text MUST come from messages.
(Previously: no `e` hint.)

#### Scenario: Counts

- GIVEN the C4 state
- WHEN the page renders
- THEN the statusline shows 4 today, 2 carried, 15 notes, and the current local time

#### Scenario: Working hints only

- GIVEN a desktop viewport, today, no item focused and no filter
- WHEN the statusline renders
- THEN it hints `c`, `j`/`k`, `[`/`]`, `#` and `/`, and does not hint `x`, `z`, `s`, `t`, `tab`, `↵` or `e`; with an open item focused it adds `x` and `s`; with a done item focused, `z`

#### Scenario: Edit hint [PR2]

- GIVEN a desktop viewport and any Today row focused
- WHEN the statusline renders
- THEN it also hints `e`, and does not hint `d`

#### Scenario: Day and filter hints

- GIVEN a desktop viewport viewing Tue 6, with a filter on
- WHEN the statusline renders
- THEN it hints `t` and `esc`, and shows `FILTER · #{slug}`; with the tag bar open it also hints `tab` and `↵`

#### Scenario: Search hint, no unshipped hints

- GIVEN any state of the day page in which `/` works (no capture bar, tag bar or sheet open, no `s` armed, no page loading), including when there are no rows
- WHEN the statusline renders
- THEN `/` is hinted only in those states, and never while the tag bar is open or a page is loading

## ADDED Requirements

### Requirement: Edit key on a Today row [PR2]

`e` on a focused Today row MUST open the note view in edit mode (`note-editing`). It MUST do nothing with no focused row, inside text fields, or while the capture bar, tag bar or a sheet is open. Rows in "Other notes with #{tag}" and mobile sheets offer no `e`.

#### Scenario: Focused row

- GIVEN a focused rail row
- WHEN `e` is pressed
- THEN All notes opens on that note in edit mode

#### Scenario: Capture bar open

- GIVEN the capture bar is focused
- WHEN `e` is typed
- THEN the letter is typed and nothing opens

### Requirement: Undated list in the date column [PR1]

The date column MUST render the undated list and mobile link of `undated-list`, and the "Without a reminder" copy MUST come from messages. It MUST NOT change the other-notes count (R5).

#### Scenario: Coexistence (C13)

- GIVEN Wed 09:05
- WHEN Today renders
- THEN "Without a reminder · 9" and "11 other notes on the back of the pad" both show
