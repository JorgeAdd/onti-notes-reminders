# Notes-search Specification

## Purpose

The "All notes" view and text search (R13) over the signed-in user's notes, served by `GET /notes`. Behavior numbers live in `docs/CONTRACT.md` (R13, R15; C9, C11); this spec cites them and adds API surface, UI states and accessibility. Scenario data: `docs/product/scenario-dataset.md`. Copy: `apps/web/src/messages.ts` only. Matching uses the existing `notes.search` index (ADR-003 decision 6); no schema change.

## Requirements

### Requirement: GET /notes listing

The API MUST expose `GET /notes`, verify the JWT, and return only the token subject's notes (R15). Without `q` it MUST return all of them, newest first by creation time, including plain notes without a reminder time. The response MUST conform to a shared schema validated on both sides and MUST include the returned notes and the total number of the caller's notes (not narrowed by `q`). It MUST return at most 50 notes, with no pagination.

#### Scenario: All notes (C9 data)

- GIVEN Jorge's dataset (15 notes)
- WHEN he requests `GET /notes`
- THEN all 15 are returned newest first and the total is 15

#### Scenario: Cap

- GIVEN a user with 60 notes
- WHEN `GET /notes` is requested
- THEN 50 notes are returned, newest first, and the total is 60

### Requirement: Search matching

With `q`, the API MUST return notes whose title or body contains a word starting with each query word, case-insensitively (R13). Matching is word-prefix based; substring and highlight are not provided. Results MUST be newest first and capped as above, The total stays the caller's note count. Terms made only of characters the tokenizer ignores (for example `²`) match nothing and MUST return `200` with an empty list.

#### Scenario: Title and body (C9)

- GIVEN Jorge's dataset with bodies seeded
- WHEN he searches `staging`
- THEN 2 results (one title match, one title and body match) and total 15

#### Scenario: Body-only, prefix and case

- GIVEN a note whose body contains "Collaborators" and whose title does not
- WHEN searching `collab` or `COLLAB`
- THEN that note is returned

#### Scenario: No match

- GIVEN no note matches `zzzz`
- WHEN searching it
- THEN the response is 200 with no notes and total equal to the caller's note count

### Requirement: Query sanitization and validation

User input MUST be treated as plain words, never as query syntax. Quotes, operators (`&`, `|`, `!`, `<->`), parentheses, `:*` and other punctuation MUST NOT cause an error or change semantics. A `q` that is empty or only whitespace MUST behave as no `q`. Invalid parameters (for example a non-string or oversized `q`) MUST return `400`.

#### Scenario: Hostile input

- GIVEN `q` is `staging' | !:* (`
- WHEN requested
- THEN the response is 200, never 5xx

#### Scenario: Blank q

- GIVEN `q` is `   `
- WHEN requested
- THEN the result equals `GET /notes` without `q`

#### Scenario: Invalid parameter

- GIVEN an invalid parameter value
- WHEN requested
- THEN the response is `400`

### Requirement: Auth and isolation

Without a token or with an invalid one `GET /notes` MUST return `401` (C11). Another user's notes MUST NOT appear in listings or search results, for any `q` (R15, C11).

#### Scenario: Isolation

- GIVEN Jorge and Ana each have a note containing `staging`
- WHEN Ana searches `staging`
- THEN only her note is returned and the total counts only hers

#### Scenario: No token

- GIVEN no Authorization header
- WHEN `GET /notes` is requested
- THEN the response is `401`

### Requirement: All notes view

The view MUST replace the day page, keeping the date column, paper look, dock and statusline. It MUST list notes newest first, styled like board 04's "back of the pad". It MUST NOT use URL state: a refresh returns to today. Each row MUST show the title, tags, the due date/time if any, a strike when done, and a body excerpt of about 120 characters. The excerpt MUST be plain text and MUST NOT render HTML or markdown; titles and tags also render as plain text. Rows MUST be read-only: no `x`, `s`, `z` or action controls. No internal IDs (N1-N15) appear.

#### Scenario: Row content

- GIVEN a done note with a tag, a due time and a long body
- WHEN the view renders
- THEN its row shows title, tag, due date/time, strike, and an excerpt of about 120 characters

#### Scenario: Body as text

- GIVEN a body containing `<img src=x onerror=alert(1)>` or `**bold**`
- WHEN the excerpt renders
- THEN it shows literally and no element is created

#### Scenario: Plain notes visible

- GIVEN a plain note from slice 2 with no time
- WHEN All notes renders
- THEN it appears in the list

#### Scenario: Read-only

- GIVEN the notes view
- WHEN `x`, `s` or `z` is pressed outside the search input
- THEN nothing happens: no row changes and no request is sent

### Requirement: Search interaction

Pressing `/` on the day page MUST open the view with the search input focused. Results MUST update server-side as the user types, with in-flight responses for stale terms discarded. `esc` or a "Back to today" control MUST return to the day page. The statusline MUST show `SEARCH · {term} · {n} of {total}` while a term is set, and hints only for keys that work in this view. A mobile "Search" button (SG14) MUST open the same view.

#### Scenario: Open and return

- GIVEN the day page on desktop
- WHEN `/` is pressed, then `esc`
- THEN the view opens with focus in the input, then the day page returns

#### Scenario: Typing

- GIVEN the view is open
- WHEN the user types `stag`
- THEN results update and the statusline reads `SEARCH · stag · 2 of 15` for the dataset

#### Scenario: Capped count

- GIVEN 70 notes of which 60 match `q`
- WHEN the statusline renders
- THEN it reads `50 of 70`

#### Scenario: Mobile

- GIVEN a narrow viewport
- WHEN the Search button is tapped
- THEN the view opens, its targets are at least 44 px, and "Back to today" is reachable

### Requirement: Empty, loading and error states

With no notes the view MUST show calm copy and no onboarding. With a term and no matches it MUST show a distinct "no matches" message that includes the term as plain text. Loading MUST show a loading state; failure MUST show an error state with retry; `401` MUST end the session and return to sign-in with "session expired" (as `today-page`).

#### Scenario: States

- GIVEN an account with no notes; a term with no match; a 5xx; a 401
- WHEN the view handles each
- THEN: empty copy; "no matches"; error with retry; sign-in with "session expired"

### Requirement: Accessibility and theme

The view MUST have landmarks and one h1, a search input with an accessible name taken from messages, and results announced politely (count changes). Focus MUST be visible and targets at least 44 px (SG13). Semantic tokens only; vermilion only on the date block; animations need reduced-motion fallbacks (CLAUDE.md 8-13).

#### Scenario: Screen reader

- GIVEN results change after typing
- WHEN the count updates
- THEN a polite live region announces it

### Requirement: Tag filter in All notes (last step)

This step MUST ship last, after slice 3 merges, reusing its `#` tag bar and tag filter. With a tag selected, All notes and search MUST list only notes with that tag (R12 semantics), and the first `esc` MUST clear the tag (and close the bar); the next `esc` leaves the view. The filter MUST apply before the 50-row cap; an unknown tag MUST give an empty list (200), never an error. The statusline MUST show `#slug` and the `#` hint; a phone MUST get a Tags control reusing the same chips. `#` also opens the bar from the search input (search ignores punctuation). Status: implemented in commit 9; proven by `notes-container.test.tsx`, `notes-view.test.tsx`, `search-notes.test.ts`, `search-route.test.ts` and `search.pg.test.ts`.

#### Scenario: Filter combined with search

- GIVEN All notes with tag `client-b` selected
- WHEN searching `staging`
- THEN only notes with that tag and a match are listed

## Out of scope

Markdown rendering (slice 4), highlighting, pagination, URL state, row actions, `GET /notes/:id`, fuzzy or substring matching.
