# Delta for today-page

Read-only day page for the signed-in user. Behavior numbers live in `docs/CONTRACT.md`; this spec cites them and adds only API surface, UI states and accessibility. Scenario data: `docs/product/scenario-dataset.md` (Wed 7, 09:05 = C4). Copy: `apps/web/src/messages.ts` only.

## ADDED Requirements (Slice 1)

### Requirement: GET /today API

The API MUST expose `GET /today`, verify the JWT, and return the day page of the token subject only (R15). "Today" and every per-day grouping MUST use the profile timezone (R16) and the Clock port (R1). The response MUST conform to a shared schema validated on both sides.

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

### Requirement: Page sections

On today's page the page MUST show, per boards 03/05 (light) and 09/11 (dark): date block (SG2, SG6), header count with R4 copy variants ("things today" / "left today"), a carried group per local day "Still open from {day}" with "late {duration}" oldest first (R3, R2, SG3), the hour rail with a NOW line and "in {duration}" (SG7, R6), done items struck through (SG12), and "{n} other notes on the back of the pad" (R5, SG8). Titles and tags MUST render as plain text. Open items MUST offer the actions of `reminder-actions`; done items MUST offer undo (`z`, or the mobile sheet) and no other action. Other days and filtered views follow `day-navigation` and `tag-filter`.

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

A statusline fixed at the bottom MUST show the weekday, day, today/carried/total counts and the current time, matching boards 03/09; weekday and day name the viewed day. The mode label MUST show on desktop; MAY be hidden on narrow (mobile) layouts per board 05. While a tag filter is on, the mode label MUST read `FILTER · #{slug}` (`tag-filter`). On desktop it MUST show key hints only for keys that work in the current state (`c`, `j`/`k`, `x`, `z`, `s`, `esc`, and `[`/`]`, `t`, `#`, `tab`, `↵` per `day-navigation` and `tag-filter`, and `/` for search), and MUST NOT show hints for keys of unshipped features. Hint text MUST come from messages.

#### Scenario: Counts

- GIVEN the C4 state
- WHEN the page renders
- THEN the statusline shows 4 today, 2 carried, 15 notes, and the current local time

#### Scenario: Working hints only

- GIVEN a desktop viewport, today, no item focused and no filter
- WHEN the statusline renders
- THEN it hints `c`, `j`/`k`, `[`/`]`, `#` and `/`, and does not hint `x`, `z`, `s`, `t`, `tab` or `↵`; with an open item focused it adds `x` and `s`; with a done item focused, `z`

#### Scenario: Day and filter hints

- GIVEN a desktop viewport viewing Tue 6, with a filter on
- WHEN the statusline renders
- THEN it hints `t` and `esc`, and shows `FILTER · #{slug}`; with the tag bar open it also hints `tab` and `↵`

#### Scenario: Search hint, no unshipped hints

- GIVEN any state of the day page in which `/` works (no capture bar, tag bar or sheet open, no `s` armed, no page loading), including when there are no rows
- WHEN the statusline renders
- THEN `/` is hinted only in those states, and never while the tag bar is open or a page is loading

### Requirement: Live labels and refresh

(Assumption, correctable.) The NOW line, durations and clock MUST update every minute without animation (SG15). The page MUST refetch on window focus and at local midnight; after midnight the carried group and header reflect the new day (R1).

#### Scenario: Minute tick

- GIVEN the page is open at 09:05
- WHEN the clock reaches 09:06
- THEN "in 25 min" reads "in 24 min" and the NOW line steps once

#### Scenario: Midnight

- GIVEN the page is open across local midnight
- WHEN midnight passes
- THEN the page refetches and shows the new day

### Requirement: Empty, loading and error states

With no items the page MUST render the same layout with an empty rail and calm copy, and MUST NOT show onboarding. While loading it MUST show a loading state; on API failure an error state with retry. A `401` MUST end the session and return to sign-in with a "session expired" message.

#### Scenario: Empty

- GIVEN an account with no notes
- WHEN the page renders
- THEN the header, date block and statusline show and the rail is empty with calm copy

#### Scenario: Failure and expiry

- GIVEN `/today` fails with 5xx, or with 401
- WHEN the page handles it
- THEN 5xx shows the error state with retry; 401 returns to sign-in with "session expired"

### Requirement: Layout and theme

Desktop MUST follow board 03/09. At mobile width it MUST follow board 05/11 minus action controls (SG14), plus a "Search" button in the bottom bar next to "+ Capture" that opens the All notes view (`notes-search`). Light/dark follows the system by default with manual override (SG18); only semantic tokens change; vermilion only on the date block; no animation without reduced-motion fallback (SG16); all rules per CLAUDE.md 8-13.

#### Scenario: Themes and mobile

- GIVEN a system dark preference and a narrow viewport
- WHEN the page renders
- THEN it matches board 11 content with no horizontal scroll

#### Scenario: Mobile Search button

- GIVEN a narrow viewport on the day page
- WHEN the bottom bar renders and Search is tapped
- THEN the button is at least 44 px, copy comes from messages, and the All notes view opens

### Requirement: Accessibility

The page MUST have landmarks (main, header, statusline) and one h1. Times MUST be readable by screen readers ("late 15h05" announced as text, not only a glyph). Any focusable element MUST show a 2 px ink outline and be at least 44 px (SG13). No internal IDs (N1-N15) in the UI.

#### Scenario: Keyboard focus

- GIVEN any focusable element
- WHEN it receives focus
- THEN a visible ink outline shows and its target is at least 44 px

## Out of scope (replaces the slice-1 list)

Note edit/delete, manual reschedule (R8), markdown (R14), "Pick…" time picker, Web Push and notification-click done, tear-off animation (SG15), onboarding, `?` help, theme override UI, timezone picker, undo of snooze. Search (R13) and the All notes view ship in `notes-search`.
