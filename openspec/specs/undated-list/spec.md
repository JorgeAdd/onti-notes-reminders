# Undated-list Specification

## Purpose

The "Without a reminder" list on Today (R19; C13, C14). Membership, order, limits and copy are defined by R19 and cited here, not restated. Scenario data: `docs/product/scenario-dataset.md`. Copy: `apps/web/src/messages.ts` only. Tags: `[PR1]` read side, `[PR2]` write side.

## Requirements

### Requirement: Undated set in GET /today [PR1]

`GET /today` MUST return the R19 set: its total count and the leading items, each with id, title, tags and creation time. The set MUST NOT depend on the viewed day or on a tag filter. Another user's notes MUST NOT appear (R15). The order and tie-break MUST be deterministic.

#### Scenario: Wed 09:05 (C13)

- GIVEN Jorge's dataset at Wed 7 09:05
- WHEN `/today` is requested
- THEN the count and the leading titles equal C13 and "other notes" stays as in C13 (R5)

#### Scenario: Independence

- GIVEN a tag filter and another viewed day
- WHEN `/today` is requested
- THEN the undated count and items are unchanged

### Requirement: Desktop list [PR1]

On desktop the date column MUST show the list per R19: header, rows (title on one line, tags below as plain text), "+ {n} more" only when over the limit, nothing at all at zero. A row MUST open All notes on that note (`note-view`); "+ {n} more" MUST open All notes as `/` does. Rows MUST be at least 44 px with a visible focus ring.

#### Scenario: Rows and more (C13)

- GIVEN 9 undated notes
- WHEN Today renders
- THEN the header reads "Without a reminder · 9", the C13 rows show in order, then "+ 1 more"

#### Scenario: Empty

- GIVEN no undated notes
- WHEN Today renders
- THEN neither header nor rows show

#### Scenario: Row and more open All notes

- GIVEN the list
- WHEN a row is activated; separately, "+ 1 more"
- THEN the note view opens on that note; All notes opens with search focused

### Requirement: Mobile link [PR1]

On mobile there MUST be no list, only "{n} without a reminder" (R19), which opens All notes. It MUST be at least 44 px and hidden at zero.

#### Scenario: Mobile (C13)

- GIVEN a narrow viewport and 9 undated notes
- WHEN Today renders and the link is tapped
- THEN it reads "9 without a reminder" and All notes opens

### Requirement: Optimistic parity [PR1]

Capture without a time MUST insert the pending note at the top, raise the count by one and keep only the limit of rows, then settle with the server note (R19, R11). The optimistic list MUST equal the next refetch. On failure the list MUST roll back and refetch.

#### Scenario: Capture (C14)

- GIVEN C13 and a capture `Export format questions #client-b`
- WHEN the pending row shows
- THEN the new note is first, the count is 10, the rows are C14's and "+ 2 more"; after settling, the refetch is identical

#### Scenario: Failure

- GIVEN the capture returns 5xx
- WHEN the response arrives
- THEN the list and count are as before

### Requirement: Reminder changes move notes [PR2]

Setting a reminder on an undated note MUST remove it from the list; removing a reminder MUST put it back (R8, R19). Today MUST reflect either on its next load.

#### Scenario: Set and remove

- GIVEN an undated note edited to have a time, then edited to have none
- WHEN Today loads after each
- THEN the note is absent, then present at its created-at position
