# Delta for today-page

## MODIFIED Requirements

### Requirement: Statusline

A statusline fixed at the bottom MUST show the weekday, day, today/carried/total counts and the current time, matching boards 03/09. The mode label MUST show on desktop; MAY be hidden on narrow (mobile) layouts per board 05. On desktop it MUST show key hints only for keys that work in the current state (`c`, `j`/`k`, `x`, `z`, `s`, `esc`, and `/` for search), and MUST NOT show hints for keys of unshipped features. Hint text MUST come from messages.
(Previously: no search hint; `/` was not a working key.)

#### Scenario: Counts

- GIVEN the C4 state
- WHEN the page renders
- THEN the statusline shows 4 today, 2 carried, 15 notes, and the current local time

#### Scenario: Working hints only

- GIVEN a desktop viewport and no item focused
- WHEN the statusline renders
- THEN it hints `c`, `j`/`k` and `/`, and does not hint `x`, `z` or `s`; with an open item focused it adds `x` and `s`; with a done item focused, `z`

#### Scenario: Search hint, no unshipped hints

- GIVEN any state of the day page in which `/` works (no capture bar or sheet open, no `s` armed), including when there are no rows
- WHEN the statusline renders
- THEN `/` is hinted, and no hint for tag filter or day navigation shows unless that feature has shipped

### Requirement: Layout and theme

Desktop MUST follow board 03/09. At mobile width it MUST follow board 05/11 minus action controls (SG14), plus a "Search" button in the bottom bar next to "+ Capture" that opens the All notes view (`notes-search`). Light/dark follows the system by default with manual override (SG18); only semantic tokens change; vermilion only on the date block; no animation without reduced-motion fallback (SG16); all rules per CLAUDE.md 8-13.
(Previously: mobile bar had no Search button.)

#### Scenario: Themes and mobile

- GIVEN a system dark preference and a narrow viewport
- WHEN the page renders
- THEN it matches board 11 content with no horizontal scroll

#### Scenario: Mobile Search button

- GIVEN a narrow viewport on the day page
- WHEN the bottom bar renders and Search is tapped
- THEN the button is at least 44 px, copy comes from messages, and the All notes view opens

## Out of scope (replaces the previous list)

Note edit/delete, manual reschedule (R8), markdown (R14), day navigation (`[ ]`), tag filter on the day page (R12, slice 3), "Pick…" time picker, Web Push and notification-click done, tear-off animation (SG15), onboarding, `?` help, theme override UI, timezone picker, undo of snooze. Search (R13) and the All notes view ship in `notes-search`.
