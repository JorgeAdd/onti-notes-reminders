# Reminder Actions Specification

## Purpose

Done, undo and snooze on reminders, by keyboard and mobile sheet. Math is R7 and R9 (R9 MUST be updated in `docs/CONTRACT.md` with its tests in the same commit, CLAUDE.md rule 23), computed on the server with the Clock port and the profile timezone (R16). Scenario data: `docs/product/scenario-dataset.md`. Copy: `apps/web/src/messages.ts` only.

## Requirements

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

### Requirement: Action API

The API MUST expose dedicated snooze (preset `hour` or `tomorrow` only), done and undo actions per note, for the token subject only (R15). Each MUST run under a row lock so concurrent calls cannot lose a snooze count. The response MUST carry the updated note.

| Case                                                                     | Result                              |
| ------------------------------------------------------------------------ | ----------------------------------- |
| Malformed body on any action endpoint, invalid payload or unknown preset | `400`                               |
| Another user's or unknown note (R15)                                     | `404`                               |
| Snooze on a done note, or on a note without reminder                     | `409`                               |
| Done on a note without a reminder                                        | `409`                               |
| Done on a done note                                                      | no-op success, first done time kept |
| Undo on an open note                                                     | no-op success                       |
| Missing or invalid token                                                 | `401`                               |

#### Scenario: Snooze +1 h (C5)

- GIVEN Wed 09:05 and the late item due Tue 18:00
- WHEN `hour` is requested
- THEN due is 10:05, count 1, original due unchanged, carried 1, header "4 things today"

#### Scenario: Tomorrow 9:00 (C6)

- GIVEN the same state
- WHEN `tomorrow` is requested
- THEN due is Thu 09:00, header "3 things today", 12 other notes (R3, R5)

#### Scenario: DST (D3, D4)

- GIVEN a New York profile at the D3 and D4 moments
- WHEN snoozed
- THEN due equals D3 and D4

#### Scenario: Done (C3)

- GIVEN Tue 17:00 and the open item due 17:00
- WHEN done is requested
- THEN done time is 17:00, due unchanged, header "2 left today" (R9)

#### Scenario: Conflicts and no-ops

- GIVEN a done note (done at T1), an open note, and a note without a reminder
- WHEN snooze hits the first, done hits the first again, undo hits the second, done hits the third
- THEN 409, then no-op with done time still T1 (the first done time is kept), then no-op, then 409

#### Scenario: Isolation (C11)

- GIVEN Ana's token and Jorge's note
- WHEN any action is called
- THEN `404`, and without a token `401`

### Requirement: Keyboard layer

On the page, outside text fields: `j`/`k` MUST move a visible 2 px ink focus line over rows (SG13); `x` marks the focused open item done; `z` reopens the focused done item at any time on the page (R9); `s` then `h` or `t` snoozes the focused open item; `esc` cancels a pending `s`. After `s`, a which-key menu MUST appear after a 200 ms hesitation showing each resulting time (SG11, SG15). Snooze MUST NOT be undoable. Keys with no valid target MUST do nothing. `+1 h` MAY move an item earlier than its current due.

#### Scenario: Snooze via keys

- GIVEN a focused open item
- WHEN `s` then `h` is pressed
- THEN it is snoozed as C5 and focus follows it

#### Scenario: Reopen

- GIVEN a focused struck item done earlier on the page
- WHEN `z` is pressed
- THEN it reopens and the header returns to "{n} things today" when none else is done (R4)

#### Scenario: No target

- GIVEN a focused done item
- WHEN `x` or `s` is pressed
- THEN nothing happens

#### Scenario: Earlier move

- GIVEN an item due 15:00 and now 09:05
- WHEN `s` `h` is pressed
- THEN due is 10:05 (R7)

### Requirement: Row display

A snoozed row MUST read "{time} · was {original} · {count}×" (R7). Done rows MUST stay struck with a 180 ms strike animation; under reduced motion the strike MUST appear at once and a snooze MUST re-place instantly (SG16). Rows MUST have an accessible name stating title, time and state.

#### Scenario: Snoozed label (C5)

- GIVEN C5 applied
- WHEN the row renders
- THEN it reads "10:05 · was Tue 18:00 · 1×"

#### Scenario: Reduced motion

- GIVEN reduced motion is on
- WHEN an item is marked done
- THEN no movement occurs; only opacity change, at most 150 ms

### Requirement: Mobile actions

On narrow screens, tapping a row MUST open an action sheet with Done (or Undo for done rows), "+1 h" and "Tomorrow 9:00", each showing its resulting time (SG14). Targets MUST be at least 44 px.

#### Scenario: Sheet

- GIVEN a narrow viewport and an open item
- WHEN the row is tapped
- THEN the sheet lists the actions, "+1 h" and "Tomorrow 9:00" show their resulting times, and applying one closes it

### Requirement: Optimistic updates and failure

Every action MUST update the viewed page immediately, on any day and with or without a tag filter, using the same day-page rules (R3, R4, R5, R12 and the another-day rule), then reconcile with the server. Counts, other notes and filter sections MUST stay consistent after the patch. [PR1] Capture without a time MUST also update the undated list optimistically: the pending note first, the count plus one, the row limit kept (R19, `undated-list`); settling swaps the pending row for the server note. On failure the previous page MUST be restored, the viewed page refetched, and one line from messages shown. A `401` on any mutation MUST end the session and show "session expired".

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
