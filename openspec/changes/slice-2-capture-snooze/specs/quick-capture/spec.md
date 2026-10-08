# Quick Capture Specification

## Purpose

Create a note from one line (desktop) or from presets (mobile). Parsing, title limits and tag-name derivation are R11. Scenario data: `docs/product/scenario-dataset.md`. Copy: `apps/web/src/messages.ts` only. UI rules: CLAUDE.md 8-13, SG9, SG14-SG16.

## Requirements

### Requirement: Command bar

Pressing `c` outside a text field MUST open a one-line command bar with focus in its input. While typing, an italic preview of the parse MUST show (R11) in the C1 format, and nothing is saved until ↵ (R11). `esc` MUST close the bar and discard input. The bar MUST also close without saving from a visible cancel control or a tap outside it, so touch users are never trapped. The preview MUST come from the shared parser, with the display clock. While the bar is open, page keys MUST NOT fire. The preview MUST fade in with a reduced-motion fallback (SG15, SG16).

#### Scenario: Preview (C1)

- GIVEN Tue 11:12 and the C1 text typed
- WHEN the parse updates
- THEN the preview shows tag Client A, "today 17:00" and "in 5h48"; no request is sent

#### Scenario: Cancel

- GIVEN the bar has text
- WHEN `esc` is pressed
- THEN the bar closes, the text is discarded and nothing is created

#### Scenario: Cancel on touch

- GIVEN the bar has text, on a touch device with no keyboard
- WHEN the cancel control is tapped, or a pointer goes down outside the bar
- THEN the bar closes, the text is discarded and nothing is created
- AND the control MUST be at least `--size-target` with a visible `--focus-ring` and a name from the messages module
- AND a pointer down inside the bar (input, preset chips, tag chips) MUST NOT close it, and `esc` MUST still close it

#### Scenario: Keys while typing

- GIVEN the bar is open
- WHEN `x`, `z`, `j` or `s` is typed
- THEN the characters enter the input and no row action runs

### Requirement: Submit rules

↵ MUST be disabled with the parsed title empty (metadata only) or over 200 characters (R11). On ↵ the note MUST appear on the page before the server answers (optimistic), the bar MUST close, and the preview line MUST turn solid (SG9). Time forms MUST follow R11 and MUST include `+Nm` and `today HH:MM`: bare `HH:MM` rolls to tomorrow when past; an explicit `today HH:MM` already past MUST be accepted and shown late (R2).

#### Scenario: Create with time (C1)

- GIVEN C1 state and ↵ pressed
- WHEN the request succeeds
- THEN the page has 3 items, header "3 things today", 12 other notes (R3, R4, R5)

#### Scenario: Past explicit time

- GIVEN 10:00 and `Call bank today 09:00`
- WHEN ↵ is pressed
- THEN the item is saved at 09:00 today and reads "late 1h"

#### Scenario: Relative minutes

- GIVEN 10:00 and `Call bank +30m`
- WHEN ↵ is pressed
- THEN due is 10:30 today (R11)

#### Scenario: Bare time rolls

- GIVEN 10:00 and `Call bank 09:00`
- WHEN ↵ is pressed
- THEN due is tomorrow 09:00 (R11)

#### Scenario: Empty title

- GIVEN input `#client-a 17:00` only
- WHEN ↵ is pressed
- THEN nothing is created and the bar stays open with a one-line hint

### Requirement: Capture without a time

Input without a time MUST create a plain note with no reminder. It MUST count under "other notes" (R5) and is not visible as an item until all-notes ships.

#### Scenario: Plain note

- GIVEN `Buy cable #home`
- WHEN ↵ is pressed
- THEN 1 note is added, today's page is unchanged and the other-notes count rises by 1

### Requirement: POST /notes

The API MUST accept a structured payload (title, tag slugs, due instant or null) for the token subject (R15). Invalid payload (empty or over-200 title, malformed or over-length slug, unparsable due) MUST return `400` and write nothing. Tag display names MUST be derived server-side (R11), never taken from the client. Note, tags and links MUST be written in one transaction. A slug matching an existing tag MUST reuse it and keep its name. Due and original due MUST be equal, snooze count 0.

#### Scenario: Tag reuse

- GIVEN Jorge has tag "Client A"
- WHEN `#client-a` is captured
- THEN no second tag exists and its name is still "Client A"

#### Scenario: Atomicity

- GIVEN the link insert fails
- WHEN the request is processed
- THEN no note and no new tag remain

#### Scenario: Invalid

- GIVEN a 201-character title
- WHEN submitted
- THEN `400` and nothing stored

### Requirement: Capture across DST

Capture times MUST be resolved in the profile timezone (R16). A wall-clock time that occurs twice (fall-back overlap) MUST resolve to its FIRST occurrence (the earlier instant, before the clocks go back). Tests for these cases MUST exist before any fix to the time helper. Because this slice fixes the R11 forms and the R16 overlap rule, `docs/CONTRACT.md` R11 and R16 (and R9 for done/undo, see `reminder-actions`) MUST be updated first, in the same commit as their tests (CLAUDE.md rule 23).

#### Scenario: DST gap

- GIVEN a New York profile on the D1 day and `02:30` typed explicitly for that day
- WHEN the parse resolves
- THEN due is 03:00 EDT, the first valid instant after the gap (R16), not 03:30

#### Scenario: Fall-back overlap

- GIVEN a New York profile on the D2 day (e.g. 01:30 on 2026-11-01, America/New_York) and `01:30` typed for that day
- WHEN the parse resolves
- THEN due is the first occurrence (01:30 EDT), the same instant in the preview and in the saved note (R16)

### Requirement: Mobile capture

On narrow screens a bottom bar MUST offer only "+ Capture" in this slice (SG14); Search and Tags MUST NOT appear until the slices that build them ship, consistent with `today-page` (no hints for unshipped features). "+ Capture" MUST open presets Today 17:00, +1 h, Tomorrow 9:00 and tag chips. "Pick…" MUST NOT appear. Presets MUST produce R7 values (R11). Targets MUST be at least 44 px.

#### Scenario: Preset

- GIVEN a title and the "Tomorrow 9:00" preset on a DST day (D4)
- WHEN confirmed
- THEN due equals the D4 instant

### Requirement: Capture failure

A failed create MUST remove the optimistic note, reopen the bar with the text kept, and show one line from messages. A `401` MUST reach the session-expired flow.

#### Scenario: Server error

- GIVEN the request returns 5xx
- WHEN the page handles it
- THEN the note disappears, the text is restored and one message shows
