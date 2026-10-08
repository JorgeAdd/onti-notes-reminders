# Delta for today-page

Slice 3 makes day navigation and the tag filter part of the page. Their rules live in `day-navigation` and `tag-filter`; this delta changes only the statements that forbade them.

## MODIFIED Requirements

### Requirement: Page sections

On today's page the page MUST show, per boards 03/05 (light) and 09/11 (dark): date block (SG2, SG6), header count with R4 copy variants ("things today" / "left today"), a carried group per local day "Still open from {day}" with "late {duration}" oldest first (R3, R2, SG3), the hour rail with a NOW line and "in {duration}" (SG7, R6), done items struck through (SG12), and "{n} other notes on the back of the pad" (R5, SG8). Titles and tags MUST render as plain text. Open items MUST offer the actions of `reminder-actions`; done items MUST offer undo (`z`, or the mobile sheet) and no other action. Other days and filtered views follow `day-navigation` and `tag-filter`.
(Previously: the sections applied to the page without distinguishing today from other days or filtered views.)

#### Scenario: Morning page (C4)

- GIVEN the C4 state
- WHEN the page renders
- THEN header "4 things today", carried "Still open from Tue 6" with "late 15h05"/"late 14h35", N4 "in 25 min", N5 on the rail, "11 other notes on the back of the pad"

#### Scenario: Done header (C3)

- GIVEN an item due today is done
- WHEN the page renders
- THEN the header reads "{n} left today", the item is struck and offers undo only

#### Scenario: Late label (C7)

- GIVEN N4 open and the clock at 09:31
- WHEN the minute ticks
- THEN N4 reads "late 1 min" without a push having occurred

#### Scenario: Many timed items

- GIVEN more than 6 timed items
- WHEN the page renders
- THEN the rail collapses to a compact time list (SG7)

### Requirement: Statusline

A statusline fixed at the bottom MUST show the weekday, day, today/carried/total counts and the current time, matching boards 03/09; weekday and day name the viewed day. The mode label MUST show on desktop; MAY be hidden on narrow (mobile) layouts per board 05. While a tag filter is on, the mode label MUST read `FILTER · #{slug}` (`tag-filter`). On desktop it MUST show key hints only for keys that work in the current state (`c`, `j`/`k`, `x`, `z`, `s`, `esc`, and `[`/`]`, `t`, `#`, `tab`, `↵` per `day-navigation` and `tag-filter`), and MUST NOT show hints for keys of unshipped features (search). Hint text MUST come from messages.
(Previously: hints covered `c`, `j`/`k`, `x`, `z`, `s`, `esc` only, and none for day navigation or tag filter.)

#### Scenario: Counts

- GIVEN the C4 state
- WHEN the page renders
- THEN the statusline shows 4 today, 2 carried, 15 notes, and the current local time

#### Scenario: Working hints only

- GIVEN a desktop viewport, today, no item focused and no filter
- WHEN the statusline renders
- THEN it hints `c`, `j`/`k`, `[`/`]` and `#`, and does not hint `x`, `z`, `s`, `t`, `tab` or `↵`; with an open item focused it adds `x` and `s`; with a done item focused, `z`

#### Scenario: Day and filter hints

- GIVEN a desktop viewport viewing Tue 6, with a filter on
- WHEN the statusline renders
- THEN it hints `t` and `esc`, and shows `FILTER · #{slug}`; with the tag bar open it also hints `tab` and `↵`

#### Scenario: No search hint

- GIVEN any state
- WHEN the statusline renders
- THEN no hint for search shows

### Requirement: Out of scope

Note edit/delete, manual reschedule (R8), markdown (R14), search (R13), all-notes view, "Pick…" time picker, Web Push and notification-click done, tear-off animation (SG15), onboarding, `?` help, theme override UI, timezone picker, undo of snooze.
(Previously: also listed day navigation (`[ ]`) and tag filter (R12), which slice 3 ships.)

#### Scenario: Not shipped

- GIVEN slice 3 is applied
- WHEN the page renders
- THEN no search, all-notes view or help hint shows
