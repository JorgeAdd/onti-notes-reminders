# Delta for notes-search

Excerpts lose their markdown markers and rows open the note view. Search itself is unchanged: it matches the raw body (R13). Tags: `[PR1]` read side.

## ADDED Requirements

### Requirement: Search matches the raw body [PR1]

Search MUST keep matching title and body text as stored, so a word inside markdown markers (for example `**staging**`) is found by its word prefix (R13). Stripping applies to the excerpt display only.

#### Scenario: Marked word

- GIVEN a body `Deploy **staging** today`
- WHEN searching `stag`
- THEN the note is returned

## MODIFIED Requirements

### Requirement: All notes view

The view MUST replace the day page, keeping the date column, paper look, dock and statusline. It MUST list notes newest first, styled like board 04's "back of the pad". It MUST NOT use URL state: a refresh returns to today. Each row MUST show the title, tags, the due date/time if any, a strike when done, and a body excerpt of about 120 characters. The excerpt MUST be plain text with markdown markers removed (`markdown-rendering`) and MUST NOT render HTML or markdown; titles and tags also render as plain text. Activating a row MUST open the note view (`note-view`). Rows MUST NOT offer `x`, `s`, `z` or action controls. No internal IDs (N1-N15) appear.
(Previously: excerpt showed markers literally; rows were not activatable.)

#### Scenario: Row content

- GIVEN a done note with a tag, a due time and a long body
- WHEN the view renders
- THEN its row shows title, tag, due date/time, strike, and an excerpt of about 120 characters

#### Scenario: Markers stripped [PR1]

- GIVEN a body `**bold** and [link](https://x.y)`
- WHEN the excerpt renders
- THEN it reads `bold and link` with no element created

#### Scenario: HTML as text

- GIVEN a body containing `<img src=x onerror=alert(1)>`
- WHEN the excerpt renders
- THEN it shows literally and no element is created

#### Scenario: Plain notes visible

- GIVEN a plain note from slice 2 with no time
- WHEN All notes renders
- THEN it appears in the list

#### Scenario: Rows stay action-free

- GIVEN the notes view
- WHEN `x`, `s` or `z` is pressed outside the search input
- THEN nothing happens: no row changes and no request is sent

#### Scenario: Row opens note [PR1]

- GIVEN a listed note
- WHEN its row is activated
- THEN the note view opens for it

## REMOVED Requirements

### Requirement: Out of scope entries for markdown and `GET /notes/:id`

(Reason: the "Out of scope" section listed markdown rendering and `GET /notes/:id`; slice 4 ships both in `markdown-rendering` and `note-view`. Row actions, highlighting, pagination, URL state and fuzzy matching stay out of scope.)
(Migration: None; drop those two items from the section at archive.)
