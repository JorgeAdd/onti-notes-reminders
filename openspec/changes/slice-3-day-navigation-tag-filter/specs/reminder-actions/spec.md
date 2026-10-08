# Delta for reminder-actions

Actions work on whichever day or filtered view is shown. Math stays R7 and R9 with the Clock port; the viewed day never changes it.

## ADDED Requirements

### Requirement: Actions on any viewed day

Done, undo and snooze (keys and mobile sheet) MUST be available on rows of any viewed day (Q1). Snooze math uses now, not the viewed day (R7); done sets `done_at` to now and leaves due unchanged (R9). A row whose due time leaves the viewed day MUST leave the page and focus MUST move to a neighbor row or none. Rows in "Other notes with #{tag}" offer no actions (`tag-filter`).

#### Scenario: Done on a past day

- GIVEN Thu 8 14:30 and Tue 6 viewed with an open row
- WHEN `x` is pressed
- THEN it is struck on Tue 6, still due Tue 6, done at now (R9)

#### Scenario: Snooze from a future day

- GIVEN Fri 9 viewed and a row due Fri 10:00
- WHEN `s` `h` is pressed at Thu 14:30
- THEN due is Thu 15:30, the row leaves Fri 9 and appears on Thu 8 (R7)

#### Scenario: Undo on another day

- GIVEN a struck row on a viewed past day
- WHEN `z` is pressed
- THEN it reopens on that day with no relative label

## MODIFIED Requirements

### Requirement: Optimistic updates and failure

Every action MUST update the viewed page immediately, on any day and with or without a tag filter, using the same day-page rules (R3, R4, R5, R12 and the another-day rule), then reconcile with the server. Counts, other notes and filter sections MUST stay consistent after the patch. On failure the previous page MUST be restored, the viewed page refetched, and one line from messages shown. A `401` on any mutation MUST end the session and show "session expired".
(Previously: the update and refetch applied only to today's page.)

#### Scenario: Failure rollback

- GIVEN `x` on an open item and the server returns 5xx
- WHEN the response arrives
- THEN the item is open again with one message

#### Scenario: Filtered optimistic

- GIVEN `#client-a` is on and a row is snoozed to another day
- WHEN the patch applies
- THEN the row moves to "Other notes with #client-a" with its date, and the header counts are unchanged (R12)

#### Scenario: Failure on another day

- GIVEN Tue 6 is viewed and an action returns 5xx
- WHEN the response arrives
- THEN Tue 6 is restored and refetched with one message

#### Scenario: Expiry

- GIVEN the token expired
- WHEN any action returns `401`
- THEN the user returns to sign-in with "session expired"
