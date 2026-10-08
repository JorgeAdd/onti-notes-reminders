# Delta for today-page

Slice 2 makes the page actionable. Behavior numbers live in `docs/CONTRACT.md`. Copy: `apps/web/src/messages.ts` only.

## MODIFIED Requirements

### Requirement: Page sections

The page MUST show, per boards 03/05 (light) and 09/11 (dark): date block (SG2, SG6), header count with R4 copy variants ("things today" / "left today"), a carried group per local day "Still open from {day}" with "late {duration}" oldest first (R3, R2, SG3), the hour rail with a NOW line and "in {duration}" (SG7, R6), done items struck through (SG12), and "{n} other notes on the back of the pad" (R5, SG8). Titles and tags MUST render as plain text. Open items MUST offer the actions of `reminder-actions`; done items MUST offer undo (`z`, or the mobile sheet) and no other action.
(Previously: done items were read-only with no actions.)

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

A statusline fixed at the bottom MUST show the weekday, day, today/carried/total counts and the current time, matching boards 03/09. The mode label MUST show on desktop; MAY be hidden on narrow (mobile) layouts per board 05. On desktop it MUST show key hints only for keys that work in the current state (`c`, `j`/`k`, `x`, `z`, `s`, `esc`), and MUST NOT show hints for keys of unshipped features. Hint text MUST come from messages.
(Previously: no key hints at all.)

#### Scenario: Counts

- GIVEN the C4 state
- WHEN the page renders
- THEN the statusline shows 4 today, 2 carried, 15 notes, and the current local time

#### Scenario: Working hints only

- GIVEN a desktop viewport and no item focused
- WHEN the statusline renders
- THEN it hints `c` and `j`/`k`, and does not hint `x`, `z` or `s`; with an open item focused it adds `x` and `s`; with a done item focused, `z`

#### Scenario: No search hint

- GIVEN any state
- WHEN the statusline renders
- THEN no hint for search, tag filter or day navigation shows

## Out of scope (replaces the slice-1 list)

Note edit/delete, manual reschedule (R8), markdown (R14), day navigation (`[ ]`), tag filter (R12), search (R13), all-notes view, "Pick…" time picker, Web Push and notification-click done, tear-off animation (SG15), onboarding, `?` help, theme override UI, timezone picker, undo of snooze.
