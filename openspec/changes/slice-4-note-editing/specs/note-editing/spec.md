# Note-editing Specification

## Purpose

Edit, reschedule, clear the reminder of, and delete a note, from the note view (`note-view`). Behavior numbers live in `docs/CONTRACT.md` (R20 for title, body, tags and delete; R8 for the reminder; R11, R15, R19; C11); title and body limits come from R20 and `docs/db/schema.md`. Copy: `apps/web/src/messages.ts` only. All tags are `[PR2]`. The design step (SG20, `docs/design/style-guide-decisions.md`) has landed; it decides the form layout and the reminder control, not the behavior below.

## Requirements

### Requirement: PATCH /notes/:id [PR2]

The API MUST expose `PATCH /notes/:id` for the token subject only (R15). It MUST accept any of: title, body, tags (a list of slugs), and reminder (a new due time, or none). Omitted fields MUST stay unchanged. The response MUST carry the updated note. An empty body is a valid edit (R20); only an empty title is rejected. Concurrent edits: the last write wins (R20); there is no version or conflict check.

| Case                                                                                      | Result |
| ----------------------------------------------------------------------------------------- | ------ |
| Valid change                                                                              | `200`  |
| Empty request object, empty or over-limit title, over-limit body, invalid slug (R11, R20) | `400`  |
| Another user's, unknown or non-UUID id (R15, C11)                                         | `404`  |
| Missing or invalid token                                                                  | `401`  |

#### Scenario: Title and body

- GIVEN an own note
- WHEN title and body are patched
- THEN `200`, both changed, tags and reminder untouched

#### Scenario: Validation

- GIVEN a blank title, a title over the limit, or a body over the limit (R20)
- WHEN patched
- THEN `400` and the note is unchanged

#### Scenario: Empty body

- GIVEN an own note with a body
- WHEN patched with an empty body
- THEN `200` and the body is empty (R20)

#### Scenario: Isolation (C11)

- GIVEN Ana's token and Jorge's note
- WHEN `PATCH` is called
- THEN `404`; with no token `401`

#### Scenario: Last write wins

- GIVEN two patches of the same title in sequence
- WHEN both succeed
- THEN the note holds the second title

### Requirement: Tag editing [PR2]

A patch with tags MUST replace the note's tag set. Slugs follow the capture grammar and display names are derived on the server (R11, R20); a client-sent name MUST be ignored. A slug that does not exist MUST be created. A removed tag MUST disappear from the note and, when no note has it, from tag lists and filters (R12, R20).

#### Scenario: Replace tags

- GIVEN a note tagged `client-a`
- WHEN patched with `client-b` only
- THEN the note shows "Client B" only and `client-a` no longer lists it

#### Scenario: New slug

- GIVEN a slug no note has
- WHEN patched in
- THEN the note carries a tag named from the slug (R11)

### Requirement: Reschedule and remove reminder [PR2]

Setting a due time MUST apply R8: due and original due take the new value, snooze count resets, and a done note reopens. Removing the reminder MUST clear all reminder fields (R8). A changed due time MUST allow a new notification (R10).

#### Scenario: Reschedule an open snoozed note

- GIVEN a note snoozed twice
- WHEN patched with a new due time
- THEN due equals original due, count 0

#### Scenario: Reschedule a done note

- GIVEN a done note with a reminder
- WHEN patched with a new due time
- THEN it is open again (R8)

#### Scenario: Remove

- GIVEN a note with a reminder
- WHEN the reminder is removed
- THEN no reminder field remains and the note is undated (R19)

### Requirement: Edit mode [PR2]

In the note view, `e` or an Edit button (the only way on touch) MUST switch to edit mode with title, body (raw markdown), tags and reminder fields. Save MUST send one patch, return to the read view and show the result. `esc` or Cancel MUST leave edit mode without saving. An empty title or an over-limit field MUST block Save with an inline message; an empty body MUST NOT (R20). While saving, Save MUST be disabled. On a 5xx the edits MUST stay with one message; on `401` the session ends with "session expired".

#### Scenario: Edit and save

- GIVEN the read view
- WHEN `e` is pressed, the title changed and Save activated
- THEN one `PATCH` is sent and the read view shows the new title

#### Scenario: Cancel

- GIVEN edit mode with changed fields
- WHEN `esc` is pressed
- THEN no request is sent and the read view shows the old values

#### Scenario: Blocked save

- GIVEN a blank title
- WHEN Save is activated
- THEN no request is sent and an inline message shows

#### Scenario: Failure

- GIVEN the patch returns 5xx
- WHEN the response arrives
- THEN edit mode keeps the typed values and shows one message

### Requirement: Delete [PR2]

The API MUST expose `DELETE /notes/:id`, a permanent delete for the token subject only (R20, R15): `204` on success; `404` for another user's, unknown or non-UUID id; `401` without a token. A later `GET` of it MUST return `404`. In the note view, `d` or a Delete button MUST show the inline confirm "Delete? ↵ confirm · esc cancel" (no modal); `↵` confirms and `esc` cancels without closing the view. On success the view closes to All notes. `d` MUST do nothing outside the note view.

#### Scenario: Confirm

- GIVEN the read view
- WHEN `d` then `↵`
- THEN `DELETE` is sent, the view closes and the note is gone from All notes and Today

#### Scenario: Cancel

- GIVEN the confirm is showing
- WHEN `esc` is pressed
- THEN nothing is sent and the view stays open

#### Scenario: API (C11)

- GIVEN Ana's token and Jorge's note
- WHEN `DELETE` is called
- THEN `404`, the note still exists; own note gives `204` then `404` on `GET`

#### Scenario: `d` elsewhere

- GIVEN All notes list or Today with a focused row
- WHEN `d` is pressed
- THEN nothing happens

### Requirement: Keys [PR2]

`e` and `d` MUST work only outside text fields. On a focused Today row (open or done), `e` MUST open All notes on that note directly in edit mode; with no focused row it MUST do nothing. The statusline MUST hint `e` and `d` only where they work.

#### Scenario: `e` on Today

- GIVEN a focused Today row
- WHEN `e` is pressed
- THEN the note view opens in edit mode for that note

#### Scenario: Typing

- GIVEN focus is in the title field
- WHEN `e` or `d` is typed
- THEN the letter is inserted and no mode changes

### Requirement: Consistency after writes [PR2]

After a successful save or delete, Today, All notes and the undated list MUST show the new state on next display without a manual refresh; counts MUST agree (R4, R5, R19). A failed write MUST leave displayed data unchanged.

#### Scenario: Reschedule onto today

- GIVEN an undated note edited to a time later today
- WHEN Today shows
- THEN it is on the rail, the undated count dropped by one, and the header count rose by one

#### Scenario: Delete

- GIVEN a deleted note that was on Today
- WHEN Today shows
- THEN it is absent and counts agree
