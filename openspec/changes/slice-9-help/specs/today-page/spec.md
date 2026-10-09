# Delta for today-page

Slice 9 adds the help entry points to Today only. All notes and the note view keep their own statuslines and do not open help. Dialog behavior: `help-dialog`. Copy: `messages.ts` only.

## ADDED Requirements

### Requirement: Help key and button

On the Today page, `?` MUST open help (`help-dialog`) unless a text field, the capture bar, the tag bar or a sheet has focus or is open, in which case it MUST do nothing special. The statusline MUST include a visible "?" button of at least 44 px at every width, labelled from messages, with the ink focus ring. `?` MUST NOT work on All notes or the note view.

#### Scenario: Key opens help

- GIVEN Today with no field focused
- WHEN `?` is pressed
- THEN help opens

#### Scenario: Typing `?`

- GIVEN the capture bar is focused
- WHEN `?` is typed
- THEN the character is typed and help does not open

#### Scenario: Button

- GIVEN any width
- WHEN the statusline renders and "?" is clicked
- THEN the button is >= 44 px [static], help opens, and focus returns to it on close

#### Scenario: Out of scope views

- GIVEN All notes or a note view
- WHEN `?` is pressed
- THEN nothing opens

## MODIFIED Requirements

### Requirement: Statusline

A statusline fixed at the bottom MUST show the weekday, day, today/carried/total counts and the current time, matching boards 03/09; weekday and day name the viewed day. The mode label MUST show on desktop; MAY be hidden on narrow (mobile) layouts per board 05. While a tag filter is on, the mode label MUST read `FILTER · #{slug}` (`tag-filter`). On desktop it MUST show key hints only for keys that work in the current state (`c`, `j`/`k`, `x`, `z`, `s`, `esc`, and `[`/`]`, `t`, `#`, `tab`, `↵` per `day-navigation` and `tag-filter`, `/` for search, and `e` with a row focused [PR2]), and MUST NOT show hints for keys of unshipped features. Hint text MUST come from messages. It MUST also hold the "?" help button (see "Help key and button"); the button is not a key hint and is always visible.
(Previously: no help button.)

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

#### Scenario: Help button present

- GIVEN any state of Today
- WHEN the statusline renders
- THEN the "?" button shows alongside the hints

### Requirement: Empty, loading and error states

With no items the page MUST render the same layout with an empty rail and calm copy, and MUST NOT show onboarding or open help. The empty state MUST show the hint "Press ? to see how it works" on desktop and "Tap ? to see how it works" on mobile (<= 640 px), from messages. While loading it MUST show a loading state; on API failure an error state with retry. A `401` MUST end the session and return to sign-in with a "session expired" message.
(Previously: no help hint in the empty state.)

#### Scenario: Empty

- GIVEN an account with no notes
- WHEN the page renders
- THEN the header, date block and statusline show and the rail is empty with calm copy

#### Scenario: Hint wording by width

- GIVEN an account with no notes
- WHEN Today renders on desktop, then at 640 px or less
- THEN it reads "Press ? to see how it works", then "Tap ? to see how it works"; help stays closed

#### Scenario: Failure and expiry

- GIVEN `/today` fails with 5xx, or with 401
- WHEN the page handles it
- THEN 5xx shows the error state with retry; 401 returns to sign-in with "session expired"

## Out of scope (amends the list)

`?` help is no longer out of scope for Today. Onboarding, tours and help on All notes or the note view stay out.
