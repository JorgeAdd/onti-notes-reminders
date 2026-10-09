# Help Dialog Specification

## Purpose

A "How it works" help for the keyboard-first Today page: four sections (Capture, Days, On a note, Find), a desktop modal and a mobile bottom sheet. Serves roadmap Slice 9, R11 (capture grammar), SG10, SG13-SG16, SG20. Web only. Scenario clock values: `docs/product/scenario-dataset.md` (Tue 6 11:12). Copy lives in `apps/web/src/messages.ts` only. Tests: vitest + jsdom unless tagged [static] or [manual].

## Requirements

### Requirement: Opening and closing

Help MUST open only from a user action: the `?` key or the statusline "?" button on the Today page (`today-page`). It MUST NOT open on load, sign-in, empty state, a timer or a first visit. It MUST close with `esc` or a close button of at least 44 px (SG13). `?` while open MUST NOT stack a second dialog.

#### Scenario: Never on its own

- GIVEN a fresh render of Today, with and without notes
- WHEN no key is pressed and no button is clicked
- THEN no dialog exists in the document

#### Scenario: Open and close

- GIVEN help is closed
- WHEN `?` is pressed, then `esc`
- THEN one dialog opens, then closes; the close button (>= 44 px) closes it too [static for size]

#### Scenario: `?` while open

- GIVEN help is open
- WHEN `?` is pressed again
- THEN exactly one dialog remains

### Requirement: Presentation by width

On desktop it MUST be a modal dialog. At <= 640 px it MUST be a bottom sheet inside the existing bottom dock and MUST replace the dock's bars while open; the bars MUST return on close.

#### Scenario: Desktop modal

- GIVEN a viewport wider than 640 px
- WHEN help opens
- THEN a modal dialog shows over the page and the page content stays

#### Scenario: Mobile sheet in the dock

- GIVEN a viewport of 640 px or less
- WHEN help opens
- THEN the sheet renders inside the dock, the capture and bottom bars are not rendered, and they return on close

### Requirement: Sections and content

Help MUST show four sections with exactly this content (copy from messages).

| Section   | Content                                                                                                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capture   | `c`; `HH:MM` (today, or tomorrow if past); `today HH:MM` (accepted if past, shown late); `tomorrow HH:MM`; `+Nm` / `+Nh`; `#tag`; no time = note without a reminder; `esc` cancels |
| Days      | `[` `]` previous/next day; `t` back to today                                                                                                                                       |
| On a note | `j`/`k` move; `x` done; `z` undo; `s` then `h` (+1 h) or `t` (tomorrow); `e` edit; `d` delete (`↵` confirms, `esc` cancels)                                                        |
| Find      | `/` all notes and search; `#` filter by tag; `esc` clears the filter                                                                                                               |

On narrow (<= 640 px) the touch equivalents (presets, action sheet, Search and Tags buttons) MUST replace the keys.

#### Scenario: Desktop content

- GIVEN a desktop viewport
- WHEN help opens
- THEN it shows the four sections with every row above and no touch wording

#### Scenario: Mobile content

- GIVEN a viewport of 640 px or less
- WHEN help opens
- THEN each section shows presets, action sheet, Search and Tags buttons instead of keys

### Requirement: One source of truth

Key rows MUST derive from `KeyHint` in `keys.ts` and `messages.ts` `statusline.keys`. A coverage test MUST fail when a command key handled in `keys.ts`, the `/` and `#` layers, or the note view `e`/`d` has no help entry.

#### Scenario: Coverage

- GIVEN every `KeyHint` id, every `KeyCommand` key, `/`, `#`, `e` and `d`
- WHEN the help model is built
- THEN each has an entry; removing one makes the test fail

### Requirement: Capture examples match R11

Every capture example MUST be run through the shared R11 parser and MUST yield what the help says; no new CONTRACT numbers.

#### Scenario: Examples at Tue 6 11:12

- GIVEN the clock at Tue 6 11:12
- WHEN each example is parsed
- THEN `17:00` is today 17:00; `09:00` is tomorrow 09:00; `today 09:00` is today 09:00 (late); `tomorrow 09:00` is tomorrow 09:00; `+15m` and `+2h` are now plus that, to the minute; `#client-a` is tag `client-a`; no time gives no reminder (R11)

### Requirement: Dialog accessibility

The container MUST have `role="dialog"`, `aria-modal="true"` and a title that labels it. Focus MUST move inside on open, stay trapped (Tab and Shift+Tab wrap), and return to the trigger on close. Every control MUST be >= 44 px with a visible focus ring.

#### Scenario: Focus lifecycle

- GIVEN the `?` button has focus
- WHEN help opens, Tab is pressed past the last control, then help closes
- THEN focus starts inside, wraps to the first control, and returns to the `?` button

#### Scenario: Labelled dialog

- GIVEN help is open
- WHEN queried by role
- THEN `dialog` is found by its title name with `aria-modal="true"`

### Requirement: Page keys inert while open

While help is open, the Today key layer, capture `c`, `/`, `#`, `j`/`k`, `[`/`]`, `x`, `z`, `s`, `e` MUST NOT fire.

#### Scenario: Keys blocked

- GIVEN help is open over Today with rows
- WHEN `c`, `/`, `j` and `]` are pressed
- THEN no capture bar, search, focus move or day change occurs

### Requirement: Motion and style

Open and close MUST use only a fade of at most 150 ms with `--motion-*` and `--ease-paper`, and reduced motion MUST follow the global token block (SG15, SG16). Styles MUST use semantic tokens only [static]. The UI MUST show no internal IDs.

#### Scenario: Static checks [static]

- GIVEN the help CSS modules and components
- WHEN scanned
- THEN no `--core-*`, raw hex, px font size or raw duration appears, no animation travels, and no N1-N15 appears

### Requirement: Copy in messages

All help text MUST come from `messages.ts`.

#### Scenario: No literals

- GIVEN the help components
- WHEN scanned [static]
- THEN no user-facing string literal is outside messages
