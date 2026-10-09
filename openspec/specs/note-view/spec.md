# Note-view Specification

## Purpose

A single note opened inside All notes: fetch by id, entry points, esc behavior. Behavior numbers live in `docs/CONTRACT.md` (R14, R15, R19; C10, C11); this spec cites them. Scenario data: `docs/product/scenario-dataset.md`. Copy: `apps/web/src/messages.ts` only. Tests are vitest + jsdom (web), Fastify inject (API) or shared pure tests unless labeled `[manual]`. Tags: `[PR1]` read side, `[PR2]` write side.

## Requirements

### Requirement: GET /notes/:id [PR1]

The API MUST expose `GET /notes/:id`, verify the JWT, and return one note of the token subject with title, body, tags (slug and name), reminder fields, done state and creation time. The response MUST conform to a shared schema validated on both sides.

| Case                                    | Result |
| --------------------------------------- | ------ |
| Own note                                | `200`  |
| Another user's note (R15, C11)          | `404`  |
| Unknown id, or an id that is not a UUID | `404`  |
| Missing or invalid token (C11)          | `401`  |

#### Scenario: Own note

- GIVEN Jorge's dataset
- WHEN he requests a note with a body and a tag
- THEN `200` with title, body, tag name and creation time

#### Scenario: Another user (C11)

- GIVEN Ana's token and Jorge's note id
- WHEN `GET /notes/:id` is called
- THEN `404`, and without a token `401`

#### Scenario: Malformed id

- GIVEN the id `not-a-uuid`
- WHEN it is requested with a valid token
- THEN `404`, never `500`

### Requirement: Entry points [PR1]

The note view MUST open from a row of All notes and from a "Without a reminder" row (`undated-list`). It MUST load the note by id, so a note outside the newest rows of the list still opens. The view replaces the list area inside All notes, keeping the date column and statusline. It MUST NOT use URL state: a refresh returns to today.

#### Scenario: Row opens the view

- GIVEN All notes with a listed note
- WHEN its row is activated (click, or `↵` on desktop)
- THEN the note view shows that note's title, tags and rendered body

#### Scenario: Old undated note

- GIVEN an undated note older than the newest rows of All notes
- WHEN its "Without a reminder" row is activated on Today
- THEN All notes opens on that note, loaded by id

#### Scenario: Refresh

- GIVEN the note view is open
- WHEN the page reloads
- THEN Today is shown (no deep link)

### Requirement: Read-only content [PR1]

The view MUST show title, tags, the due date and time or "no reminder", the done state (struck title), the creation time, and the body through `markdown-rendering`. It MUST NOT offer `x`, `s`, `z` or action controls; those keys do nothing. Titles and tags render as plain text. No internal IDs appear.

#### Scenario: Content

- GIVEN a done note with a tag, a due time and a markdown body
- WHEN the view opens
- THEN title (struck), tag, due time and the rendered body show

#### Scenario: Read-only keys

- GIVEN the note view
- WHEN `x`, `s` or `z` is pressed
- THEN nothing happens and no request is sent

### Requirement: esc and return [PR1]

`esc` MUST close the note view first and show All notes as it was left (search term and tag filter kept). A further `esc` MUST leave All notes for Today (`notes-search`). A visible Back control MUST do the first step. During edit mode or a pending delete confirm `esc` follows `note-editing`.

#### Scenario: Two steps

- GIVEN the view opened from a row of a searched list
- WHEN `esc` is pressed twice
- THEN the first shows the same search results, the second shows Today

### Requirement: Loading, not found and error states [PR1]

While loading the view MUST show a loading state. A `404` (for example a note deleted elsewhere) MUST show calm "not found" copy with Back. A 5xx MUST show an error with retry. A `401` MUST end the session with "session expired".

#### Scenario: States

- GIVEN a pending request; a `404`; a 5xx; a `401`
- WHEN the view handles each
- THEN: loading; "not found" with Back; error with retry; sign-in with "session expired"

### Requirement: Accessibility and theme [PR1]

On open, focus MUST move into the view (its heading). The view MUST have landmarks and one h1. Targets MUST be at least 44 px with a visible focus ring (SG13). Semantic tokens only; vermilion only on the date block. The statusline MUST hint only keys that work in the view (`esc`; `e` and `d` only once they ship).

#### Scenario: Focus and hints

- GIVEN the view opens
- WHEN it renders
- THEN focus is inside it and the statusline hints `esc` only (PR1)

#### Scenario: Look on both viewports `[manual]`

- GIVEN light, dark, desktop and mobile
- WHEN the view is open
- THEN it matches the All notes frame with no horizontal scroll
