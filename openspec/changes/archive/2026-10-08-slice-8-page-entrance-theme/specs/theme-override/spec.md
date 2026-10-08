# Theme-override Specification

## Purpose

The manual theme override (SG18, three-state): System, Light, Dark, persisted per device and applied before first paint. Decisions are cited from `docs/design/landing-brief.md` (22-30, binding). Existing token rules already honor `data-theme` on `<html>`; no new color tokens. Tests are vitest + jsdom unless labeled `[static]`, `[build]` or `[manual]`. Storage is stubbed in tests. The storage key and values are defined once in the theme storage module and mirrored by the inline script; the key is `onti.theme`.

## Requirements

### Requirement: Three states (decisions 22, 23)

The theme MUST have three states. System MUST remove `data-theme` from `<html>` and remove the key from `localStorage`. Light MUST set `data-theme="light"` and store `light`. Dark MUST set `data-theme="dark"` and store `dark`. Any other stored value MUST be read as System.

#### Scenario: Choose Dark

- GIVEN System is active
- WHEN the user selects Dark
- THEN `<html data-theme="dark">` and the key holds `dark`

#### Scenario: Choose Light

- GIVEN Dark is active
- WHEN the user selects Light
- THEN `<html data-theme="light">` and the key holds `light`

#### Scenario: Choose System

- GIVEN Dark is stored and applied
- WHEN the user selects System
- THEN `data-theme` is absent from `<html>` and the key is removed

#### Scenario: Invalid stored value

- GIVEN the key holds `purple`, an empty string or `"Dark"`
- WHEN the module reads it or the page loads
- THEN the state is System and no `data-theme` is set

### Requirement: Applied before first paint (decision 24)

A tiny inline script in the `<head>` of `apps/web/index.html` MUST read the key and set or remove `data-theme` synchronously, before the body paints. It MUST be a classic (non-module, non-deferred) script. React MUST read and write the same key through one storage module and MUST NOT re-implement the inline logic differently.

#### Scenario: Stored values `[script test]`

- GIVEN the script text extracted from `index.html` and executed against stubbed storage
- WHEN the stored value is `light`, `dark` or absent
- THEN `data-theme` is `light`, `dark` or absent respectively

#### Scenario: Placement `[static]`

- GIVEN `index.html`
- WHEN parsed
- THEN the inline script is inside `<head>`, has no `type="module"`, `async` or `defer`, and precedes the app entry script

#### Scenario: Shared key `[static]`

- GIVEN the inline script and the storage module
- WHEN the key literal is compared
- THEN both use the key `onti.theme` and the same two stored values

#### Scenario: Control reflects stored theme

- GIVEN the key holds `dark`
- WHEN `ThemeControl` mounts
- THEN Dark is the selected option

#### Scenario: No flash `[manual]`

- GIVEN each stored theme on desktop and mobile
- WHEN the page is reloaded
- THEN the desk and the entrance never show the wrong theme

### Requirement: Storage failures never crash (decision 25)

If `localStorage` is unavailable or a read throws, the page MUST follow the system (System). If a write throws, the choice MUST still apply to the open page, and the next load follows the system. The inline script MUST wrap its storage access in `try/catch`. Nothing MUST throw to the user or to the React tree.

#### Scenario: Storage unavailable

- GIVEN accessing `window.localStorage` throws or it is undefined
- WHEN the inline script runs and `ThemeControl` mounts
- THEN neither throws, no `data-theme` is set and System is selected

#### Scenario: Read throws

- GIVEN `getItem` throws
- WHEN the script or the module reads
- THEN the result is System and nothing is thrown

#### Scenario: Write throws

- GIVEN `setItem` throws
- WHEN the user selects Dark
- THEN `data-theme="dark"` is applied to the open page, the control shows Dark, and nothing is thrown

#### Scenario: Remove throws

- GIVEN `removeItem` throws
- WHEN the user selects System
- THEN `data-theme` is removed from the open page and nothing is thrown

### Requirement: Shared control and placement (decision 26)

One `ThemeControl` component MUST render next to Sign out in the date column (Today) and on the sign-in card. `DateColumn` is shared with All notes, so it MUST show the control only when a prop enables it, which only Today sets. The control MUST NOT render anywhere else in this slice, including All notes.

#### Scenario: Today

- GIVEN a signed-in user on Today
- WHEN the date column renders
- THEN one theme control sits in the same column as Sign out

#### Scenario: Sign-in card

- GIVEN a signed-out visitor
- WHEN the card renders
- THEN one theme control is present

#### Scenario: Absent on All notes

- GIVEN a signed-in user on All notes, whose `DateColumn` is the shared one
- WHEN it renders without the theme prop
- THEN no theme control (no `radiogroup` named by the theme label) is present, while Sign out remains

#### Scenario: Nowhere else

- GIVEN the status card
- WHEN rendered
- THEN no theme control is present

### Requirement: Radio-group semantics and styling (decisions 27, 29)

The control MUST be a three-option radio group with an accessible name from the messages module. Each option MUST be at least `--size-target` in both dimensions with a visible `--focus-ring`. The selected option MUST be marked in ink and MUST NOT use `--color-date` (SG2, CLAUDE.md rule 9). Changing the theme MUST swap instantly, with no transition on theme-related properties, and MUST NOT replay the entrance.

#### Scenario: Semantics

- GIVEN the control is rendered
- WHEN queried by role
- THEN a `radiogroup` with the accessible name from messages holds three `radio` options (System, Light, Dark) and exactly one is checked

#### Scenario: Keyboard

- GIVEN focus is on the group
- WHEN the user uses arrow keys and Space
- THEN the selection moves per native radio behavior and the theme updates

#### Scenario: Targets and focus `[static]`

- GIVEN the `ThemeControl` CSS Module
- WHEN scanned
- THEN each option sets min width and height from `--size-target` and uses `--focus-ring` on focus-visible

#### Scenario: Selected never vermilion `[static]`

- GIVEN the `ThemeControl` CSS Module
- WHEN scanned
- THEN `--color-date` is not referenced and the selected state uses ink tokens

#### Scenario: Instant swap `[static]`

- GIVEN the CSS Modules and `tokens.css`
- WHEN scanned
- THEN no `transition` or animation applies to the control or to theme change

#### Scenario: Look on both viewports `[manual]`

- GIVEN System, Light and Dark on desktop and mobile
- WHEN each is selected
- THEN the swap is instant and the selected option is readable in both themes

### Requirement: No keyboard shortcut (decision 28)

No keyboard shortcut MUST toggle or cycle the theme. The SG10 keymap MUST NOT change.

#### Scenario: No global key handler

- GIVEN Today is rendered
- WHEN common keys (for example `t`, `d`, `Ctrl+Shift+L`) are pressed outside inputs
- THEN the theme does not change

### Requirement: Copy from messages (decision 30)

All labels ("Theme", "System", "Light", "Dark") MUST live in `apps/web/src/messages.ts`. No user-facing string MUST be hardcoded in the component. No internal IDs appear (CLAUDE.md rule 13).

#### Scenario: Labels come from messages

- GIVEN the rendered control
- WHEN its accessible name and option labels are compared to the messages module
- THEN they are equal

#### Scenario: No hardcoded strings `[static]`

- GIVEN the `ThemeControl` source
- WHEN scanned for string literals and JSX text
- THEN none is user-facing copy

### Requirement: Out of scope guard

Cross-device theme sync MUST NOT be implemented; it is backlog.

#### Scenario: Local only

- GIVEN the change
- WHEN network calls on theme change are observed
- THEN none are made
