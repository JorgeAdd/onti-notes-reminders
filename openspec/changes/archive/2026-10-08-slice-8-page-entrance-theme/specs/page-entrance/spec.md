# Page-entrance Specification

## Purpose

A quiet entrance of the real sheet on every full page load: Today (`DayPage`) when signed in, the sign-in card (`AuthForm`) when signed out. Decisions are cited from `docs/design/landing-brief.md` (1-21, binding), SG15, SG16, SG19; token values live in `apps/web/src/styles/tokens.css` and are not restated here. Tests are vitest + jsdom unless labeled `[static]` (reads `tokens.css` or CSS Modules as text, like the existing token tests), `[build]` (build output) or `[manual]`. jsdom does not run CSS animations; "plays" means the entrance is applied on mount and "does not replay" means it is not re-applied.

## Requirements

### Requirement: Entrance tokens (decision 15)

`tokens.css` MUST define the seven roles `--motion-entrance`, `--motion-entrance-detail`, `--entrance-rise`, `--entrance-rise-detail`, `--entrance-clip-start`, `--entrance-delay-date`, `--entrance-delay-bar`, mapped to existing semantic or core values with no new core value. The entrance MUST use `--ease-paper`; `--ease-enter`, `--ease-exit` and any overshoot curve MUST NOT be added.

#### Scenario: Roles present `[static]`

- GIVEN `tokens.css`
- WHEN it is parsed
- THEN all seven roles are defined at root, no new `--core-*` declaration exists for them, and `--entrance-rule-start` and `--entrance-delay-rule` are absent

#### Scenario: No extra easings `[static]`

- GIVEN `tokens.css`
- WHEN searched
- THEN `--ease-enter`, `--ease-exit` and any `cubic-bezier` with a value above 1 are absent

### Requirement: Choreography (decisions 8-10, 12, 13)

The sheet MUST rise by `--entrance-rise`, fade in and reveal top to bottom from `--entrance-clip-start` over `--motion-entrance` with `--ease-paper`. The date block MUST rise by `--entrance-rise-detail` over `--motion-entrance-detail` after `--entrance-delay-date`. There is no header rule animation, and no header rule is added. On mobile, the bottom capture bar MUST fade in last, opacity only, after `--entrance-delay-bar`. Rows and sign-in fields MUST NOT stagger or animate individually. No overshoot or bounce. The total MUST be <= 500 ms (about 240 ms on desktop, about 300 ms on mobile). The sign-in card MUST use the same sheet entrance.

#### Scenario: Tokens only `[static]`

- GIVEN the CSS Modules of `DayPage`, `DateColumn` and `AuthForm`
- WHEN scanned for animation declarations
- THEN durations, delays, easing, translate and clip-path start come only from `--motion-*`, `--ease-*`, `--entrance-*`, with no raw px, ms, s or `cubic-bezier`, and no `--core-*`

#### Scenario: Total within budget `[static]`

- GIVEN the resolved token values
- WHEN the longest `delay + duration` of sheet, date block and capture bar is computed
- THEN it is <= 500 ms on desktop and on mobile

#### Scenario: No stagger `[static]`

- GIVEN the same CSS Modules
- WHEN scanned
- THEN no `animation-delay` or entrance animation targets note rows or form fields

#### Scenario: Sign-in card is animated

- GIVEN a signed-out visitor
- WHEN `AuthForm` mounts
- THEN its card carries the sheet entrance class; no field carries one

#### Scenario: Look of the sequence `[manual]`

- GIVEN a full load at desktop and at mobile width
- WHEN the sheet appears
- THEN it rises, fades and is revealed top to bottom, then the date block settles and, on mobile, the capture bar fades in last; no header rule animation, no bounce

### Requirement: Mobile remap (decision 17)

At `max-width: 640px`, `--entrance-rise` MUST be remapped in `tokens.css` only, never in component CSS. The mobile capture bar MUST fade in last without sliding, timed by `--entrance-delay-bar`.

#### Scenario: Remap at token level `[static]`

- GIVEN `tokens.css` and the component CSS
- WHEN scanned
- THEN a `max-width: 640px` block remaps `--entrance-rise` and no component CSS contains an entrance media query

#### Scenario: Capture bar `[static]`

- GIVEN the capture bar entrance rule
- WHEN read
- THEN it animates opacity only, with no transform, after `--entrance-delay-bar`

### Requirement: Reduced motion (SG16, decision 18)

Only the global reduced-motion block of `tokens.css` MAY remap entrance behavior: `--entrance-rise` and `--entrance-rise-detail` to 0, `--entrance-clip-start` to `inset(0)`, `--motion-entrance` to the 150 ms duration, and `--motion-entrance-detail`, `--entrance-delay-date`, `--entrance-delay-bar` to the instant duration. Components MUST NOT add reduced-motion queries for the entrance.

#### Scenario: First frame equals final state `[static]`

- GIVEN the resolved reduced-motion token values
- WHEN the `from` keyframes of sheet and date block are resolved
- THEN transform and clip-path equal the resting values (`translateY(0)`, `inset(0)`); only opacity differs

#### Scenario: Delays resolve to zero `[static]`

- GIVEN the reduced-motion block
- WHEN resolved
- THEN the date delay, bar delay and detail duration are 0 ms and the sheet duration is <= 150 ms

#### Scenario: No component queries `[static]`

- GIVEN all component CSS Modules touched by this change
- WHEN scanned
- THEN none contains `prefers-reduced-motion` for entrance rules

### Requirement: Pending states (decisions 5-7)

While the session or Today's data is pending, only the desk MUST render: no sheet, card or shell. `TodayStatus` MUST appear only on error, or after about 400 ms of loading. Time for the 400 ms threshold MUST NOT use `new Date()` or `Date.now()` directly (CLAUDE.md rule 16); tests use fake timers.

#### Scenario: Session pending

- GIVEN `getSession()` has not resolved
- WHEN `App` renders
- THEN no sheet, card or `TodayStatus` is in the document

#### Scenario: Fast load

- GIVEN signed in and `GET /today` resolves before 400 ms
- WHEN timers advance
- THEN `TodayStatus` never rendered and `DayPage` mounts straight from the desk

#### Scenario: Slow load

- GIVEN `GET /today` is still pending
- WHEN 400 ms elapse
- THEN `TodayStatus` shows its loading state

#### Scenario: Error

- GIVEN `GET /today` fails before 400 ms
- WHEN the error arrives
- THEN `TodayStatus` shows the error state immediately, with its retry action

#### Scenario: No layout shift `[manual]`

- GIVEN desktop and mobile, light and dark
- WHEN the desk gives way to the sheet
- THEN nothing shifts

### Requirement: Once per full load (decisions 4, 29)

The entrance MUST play when the first sheet mounts on a full page load and MUST NOT replay on sign-in, Today <-> All notes switches, day navigation, refetches, token refreshes, optimistic updates or theme changes. "Plays once" is tracked by a module-level flag: only the first sheet mounted in a page load carries `data-entrance`; later sheets in the same page load do not.

#### Scenario: Plays on mount

- GIVEN signed in with Today's data in, on a full page load
- WHEN `DayPage` mounts as the first sheet
- THEN it carries `data-entrance` once

#### Scenario: Sign-in is not a full load

- GIVEN a signed-out visitor whose `AuthForm` card carried `data-entrance`
- WHEN they sign in and `DayPage` mounts in the same page load
- THEN `DayPage` does not carry `data-entrance`

#### Scenario: Flag resets on full load

- GIVEN the module is freshly loaded (new page load, simulated by resetting modules)
- WHEN the first sheet mounts
- THEN it carries `data-entrance`

#### Scenario: Switch Today <-> All notes

- GIVEN `DayPage` has played
- WHEN the user opens All notes and returns to Today
- THEN the entrance is not re-applied

#### Scenario: Day navigation

- GIVEN `DayPage` has played
- WHEN the user moves to another day
- THEN the sheet element is not remounted and the entrance is not re-applied

#### Scenario: Refetch and token refresh

- GIVEN `DayPage` has played
- WHEN the Today query refetches or the session token refreshes
- THEN the entrance is not re-applied

#### Scenario: Optimistic update

- GIVEN `DayPage` has played
- WHEN a note is marked done or created optimistically
- THEN the entrance is not re-applied

#### Scenario: Theme change

- GIVEN a sheet has played
- WHEN the theme changes
- THEN the entrance is not re-applied

### Requirement: Interactive from the first frame (decision 14)

The page MUST accept keyboard, command bar and tap input while the entrance plays. There MUST NOT be a skip control, and the sheet MUST NOT set `pointer-events: none` or `inert` during the entrance.

#### Scenario: Input during entrance

- GIVEN `DayPage` just mounted
- WHEN the user types in the command bar and presses Tab immediately
- THEN the text is entered and focus moves, with no waiting for animation end

#### Scenario: No skip control

- GIVEN either sheet
- WHEN queried
- THEN no skip control exists and no blocking style is applied

### Requirement: Technology and budget (decisions 19-21)

The entrance MUST be CSS-only: no new dependency, no lazy route. Added CSS and JS (entrance, theme control, inline theme script) MUST be <= 3 kB gzipped together.

#### Scenario: No new dependency `[static]`

- GIVEN the `package.json` files
- WHEN diffed against base
- THEN no dependency is added

#### Scenario: Size `[build]`

- GIVEN `npm run build` on base and on the change
- WHEN gzipped CSS and JS sizes are compared
- THEN the added total is <= 3 kB

#### Scenario: Sheet is not lazy

- GIVEN the Today and sign-in sheets
- WHEN `App` renders them
- THEN neither sheet is behind `React.lazy` for the entrance
