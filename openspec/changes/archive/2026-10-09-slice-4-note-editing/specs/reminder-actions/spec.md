# Delta for reminder-actions

Manual reschedule and removal are specified in `note-editing` (R8). This delta covers optimistic parity for the undated list. Tags: `[PR1]` read side.

## MODIFIED Requirements

### Requirement: Optimistic updates and failure

Every action MUST update the viewed page immediately, on any day and with or without a tag filter, using the same day-page rules (R3, R4, R5, R12 and the another-day rule), then reconcile with the server. Counts, other notes and filter sections MUST stay consistent after the patch. [PR1] Capture without a time MUST also update the undated list optimistically: the pending note first, the count plus one, the row limit kept (R19, `undated-list`); settling swaps the pending row for the server note. On failure the previous page MUST be restored, the viewed page refetched, and one line from messages shown. A `401` on any mutation MUST end the session and show "session expired".
(Previously: the optimistic page had no undated list.)

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

#### Scenario: Undated parity [PR1]

- GIVEN C13 and a capture without a time (C14)
- WHEN the optimistic page is computed
- THEN its undated count and rows equal the next `GET /today`; the snooze, done and undo actions leave the undated list unchanged
