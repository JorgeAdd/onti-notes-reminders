# Landing brief — Page entrance and theme override (Slice 8)

Decisions agreed in a grilling session on 2026-10-08 (prompt
`prompts/antes/18-landing-screen-grill.md`) and revised in a review the
same day (prompt `prompts/antes/19-landing-brief-review.md`). The theme
override section was added on 2026-10-08 (prompt
`prompts/antes/20-slice-8-theme-override.md`). Nothing here is implemented
yet. The source updates listed at the end come first
(CLAUDE.md rule 14).

## Context

- Slice 4 in `docs/roadmap.md` is note editing and markdown (R8, R14). This
  work is a new slice and does not replace it. The baseline is the roadmap
  on `origin/main`.
- The web app has no router. `App.tsx:86` renders nothing until
  `getSession()` resolves, then shows `AuthContainer` (signed out) or
  `TodayContainer` (signed in). Since slice 5, a second in-app view (All
  notes) is switched by state, not by a page load.
- Signed in, `TodayContainer.tsx:233` shows `TodayStatus` (a 420 px
  loading/error card) until `GET /today` returns; `DayPage` mounts only
  once the data exists.
- The two sheets differ in width: the sign-in card is `--size-card-max`
  (420 px), the Today page is `--size-page-max` (1040 px).
- Motion today: one easing (`--ease-paper`, SG15), semantic `--motion-*`
  durations, and one global reduced-motion block in `tokens.css`.
- No animation library. The main JS chunk is about 591 kB, above Vite's
  500 kB warning.
- Theme: `tokens.css:175-176` already honors `data-theme` on `<html>`
  (system dark unless `data-theme='light'`), and `tokens.css:194` forces
  dark. Only the toggle UI is missing (slice 1 design decision 14, SG18).

## Decisions

### Placement and purpose

1. **New slice: "Slice 8 — Page entrance and theme override"**, scheduled
   after Slices 2, 3 and 5 shipped. Slot 7 is not reused (it was merged
   into Slice 2). The "Unassigned: Welcome / onboarding" line in the roadmap
   is removed by the Slice 8 roadmap commit.
2. **Subtle, not a show.** The original "notebook opening" idea was
   replaced on purpose by a quiet sheet entrance of ≤ 500 ms. A 3D cover
   would travel over the content on every load and conflict with SG15,
   SG16 and the 5 s capture goal.
3. **Not a separate screen.** The entrance is the real page's own
   choreography: Today when signed in, the sign-in card when signed out.
   No branding screen sits between the user and the content.
4. **Plays on every full page load**: new tab, reload, notification click,
   signed in or out. Never on in-app transitions, refetches, token
   refreshes or optimistic updates.

### What shows before the sheet

5. **Desk only while pending.** While the session or Today's data is
   pending, only the desk background renders. It is full-bleed, so it
   cannot shift layout at any width. No sheet shell is drawn before the
   session resolves, because the two sheets have different widths.
6. **The entrance plays when the real sheet mounts**: `AuthForm` when
   signed out, `DayPage` when Today's data is in.
7. **`TodayStatus` appears only on error or after about 400 ms of
   loading.** A fast load goes from the desk straight to the entrance,
   with no card flashing in between.

### Choreography

8. Sequence (all values via tokens, see decision 15):
   1. The desk background is present from the first frame.
   2. The page sheet rises `--entrance-rise` (12 px desktop, 8 px mobile)
      and fades in over `--motion-entrance` (240 ms) with `--ease-paper`,
      with a top-to-bottom `clip-path` reveal from
      `--entrance-clip-start`, like a sheet drawn off the pad. The reveal
      uncovers the rows in order; the rows themselves do not animate.
   3. The date block (vermilion, `--color-date`) rises
      `--entrance-rise-detail` (4 px) over `--motion-entrance-detail`
      (150 ms), starting after `--entrance-delay-date` (80 ms).
   4. The header rule draws left to right, from `--entrance-rule-start`
      to `scaleX(1)`, over `--motion-entrance-detail` (150 ms), starting
      after `--entrance-delay-rule` (150 ms). The whole entrance ends at
      about 300 ms.
9. **No row stagger.** SG15 rejects animated lists, and the reveal already
   gives the sense of order. SG15 is not amended.
10. The sign-in card uses the same sheet entrance and reveal. Its fields
    do not stagger, for the same reason as decision 9.
11. The SG15 tear-off (yesterday's page dropping on the first open of the
    day) is out of scope. It stays a separate, deferred item, so two
    first-load animations never compete.
12. No overshoot or bounce anywhere (SG15 rejects bouncing motion; SG2
    leaves no second accent to emphasize).

### Timing and interactivity

13. The whole entrance finishes within **≤ 500 ms** (about 300 ms with
    the chosen variant).

### Chosen prototype

- **Variant A — Drawn off the pad** was chosen on 2026-10-08 over
  B (lift, no `clip-path`) and C (32 px slide with a settling shadow).
  Prototypes: https://claude.ai/artifact/F7mBFiTcDrTYPEzbFV8YTZ (private
  canvas). Variant B stays the fallback if the `clip-path` reveal
  misbehaves (decision 20).

14. The page is **interactive from the first frame of the entrance**:
    keyboard focus, the command bar and taps work while it plays. There
    is no skip control, because nothing blocks input.

### Tokens and style guide

15. New decision **SG19 — Page entrance** adds semantic roles that reuse
    existing core values, and no new core values:
    - `--motion-entrance: var(--core-duration-240)` (the sheet)
    - `--motion-entrance-detail: var(--core-duration-150)` (the date block
      and the header rule)
    - `--entrance-rise: var(--space-md)` (12 px; the sheet's travel)
    - `--entrance-rise-detail: var(--space-xs)` (4 px; the date block's
      travel. There is no 6 px space token, so the earlier 6 px became
      4 px instead of adding a core value)
    - `--entrance-clip-start: inset(0 0 100% 0)` (the sheet starts fully
      clipped from the bottom)
    - `--entrance-rule-start: scaleX(0)` (the header rule starts with no
      width)
    - `--entrance-delay-date: var(--core-duration-80)` (when the date
      block starts)
    - `--entrance-delay-rule: var(--core-duration-150)` (when the header
      rule starts)

    Components animate _from_ these tokens _to_ the resting state
    (`translateY(0)`, `inset(0)`, `scaleX(1)`), so the tokens fully
    describe the travel.

    The entrance uses the existing **`--ease-paper`**. `--ease-enter` and
    `--ease-exit` are **not added**: one curve keeps one meaning, and
    nothing exits (the desk stays; the status card is replaced, not
    animated out). The overshoot curve is not added.

16. Components use only semantic tokens (`--motion-*`, `--ease-*`), never
    `--core-*` or raw durations (CLAUDE.md rule 8).

### Mobile and reduced motion

17. Mobile uses the same sequence with a smaller sheet rise:
    `--entrance-rise` is remapped to `var(--space-sm)` (8 px) by a
    `max-width: 640px` query in `tokens.css`, the same breakpoint
    `DayPage.module.css` uses. The query sits at the token level, not in
    components. The bottom capture bar fades in last and does not slide.
    Desktop gets no extra flourishes.
18. **Reduced motion (SG16):** the whole entrance collapses to one opacity
    fade of the page, ≤ 150 ms. Nothing travels. It is done only by
    remapping tokens in the global reduced-motion block of `tokens.css`,
    with no component-level media queries (CLAUDE.md rule 10):
    - travel: `--entrance-rise: 0`, `--entrance-rise-detail: 0`,
      `--entrance-clip-start: inset(0)`, `--entrance-rule-start: scaleX(1)`,
      so the first frame equals the resting state;
    - timing: `--motion-entrance: var(--core-duration-150)` (the page
      fade), and `--motion-entrance-detail`, `--entrance-delay-date` and
      `--entrance-delay-rule` all `var(--core-duration-instant)`, so the
      date block and the rule have no animation of their own;
    - easing: `--ease-paper` is already linear there.

### Technology and budget

19. **CSS-only**: keyframes and `clip-path`/`mask` reveals. No new
    dependency.
20. If an effect cannot be done reliably in CSS (for example, a Safari
    mask issue), simplify or drop that effect. Adding an animation library
    requires a new grilling session and an ADR.
21. **Budget:** ≤ 3 kB gzipped of added CSS and JS together (entrance,
    theme control and the inline theme script), 0 kB of added JS
    libraries, no lazy route (it must be present when the sheet mounts).

## Theme override

The manual theme override (SG18) moves from Slice 4 to this slice. It
shares the first paint with the entrance: the stored theme must be in
place before the entrance's first frame.

### Decisions

22. **Three states: System, Light, Dark.** System is the default and
    removes `data-theme` from `<html>`; Light and Dark set
    `data-theme="light"` or `data-theme="dark"`. The existing token rules
    do the rest; no new color tokens.
23. **Persisted in `localStorage`**, one key, per device. Only `light` and
    `dark` are stored; System removes the key. Any other stored value is
    read as System. Cross-device sync goes to the backlog.
24. **Applied before first paint** by a tiny inline script in the `<head>`
    of `index.html`. It reads the key and sets `data-theme` synchronously,
    before the body paints, so the desk and the entrance never flash the
    wrong theme. The React control reads and writes the same key through
    one small module; it does not re-implement the inline logic in a
    second way.
25. **Storage failures never crash.** If `localStorage` is unavailable or
    any read throws, the page follows the system. If a write throws, the
    choice still applies to the open page, and the next load follows the
    system. The inline script wraps its access in `try/catch`.
26. **One shared component** (`ThemeControl`), placed next to Sign out in
    the date column (Today) and on the sign-in card. No other placement in
    this slice.
27. **Control shape:** a three-option radio group with the accessible name
    from the messages module. Each option is a target of at least
    `--size-target` (44 × 44 px) with a visible `--focus-ring`. The
    selected option is marked in ink, never with the accent (SG2).
28. **No keyboard shortcut.** SG10's keymap does not change.
29. **Instant swap.** Changing the theme has no transition animation, and
    it does not replay the entrance (decision 4).
30. **No hardcoded copy.** The labels ("Theme", "System", "Light", "Dark")
    live in the messages module (CLAUDE.md rule 12).

### Definition of done (theme)

- **No flash:** with each stored value (`light`, `dark`, none), the inline
  script sets or removes `data-theme` before the first paint; an
  automated test runs the script from `index.html` against stubbed storage.
- **Falls back to system:** automated tests cover unavailable storage, a
  read that throws, a write that throws and an invalid stored value; none
  crash, and each resolves to System (or, for a failed write, applies the
  choice to the open page only).
- **44 px targets and visible focus:** each option uses `--size-target`
  and `--focus-ring`, checked like the existing static CSS tests.
- **Copy in messages:** every label comes from the messages module; a test
  fails on hardcoded strings in the component.
- **Manual check:** System, Light and Dark on desktop and mobile; reload
  with each stored theme shows no flash; switching is instant.

## Definition of done

- **Automated tests:** the entrance plays once per full load; it does not
  replay on refetch or optimistic updates; only the desk renders while
  the session or data is pending; `TodayStatus` appears only on error or
  after the ~400 ms threshold; input works during the entrance; the
  reduced-motion path is applied; under reduced motion, the computed
  `transform` and `clip-path` of the sheet, the date block and the header
  rule at the first frame equal their final state (only opacity changes),
  and the entrance delays resolve to 0 ms; components use only semantic
  tokens (`--motion-*`, `--ease-*`, `--entrance-*`) and no raw px,
  durations, delays or transforms.
- **Build-output check:** added CSS and JS stay within ≤ 3 kB gzipped.
- **Manual check:** light, dark and reduced motion, on desktop and mobile,
  with no layout shift from desk to sheet.

## Source updates, in order

1. This brief, with the roadmap and backlog: `docs/roadmap.md` adds
   Slice 8, removes the theme override from Slice 4 and the unassigned
   welcome line; `docs/backlog.md` records the move and adds theme sync.
   One commit.
2. Then `docs/design/style-guide-decisions.md` adds SG19, a note on SG15
   that the entrance is separate from the tear-off, and the three-state
   override on SG18, in its own commit.
3. `apps/web/src/styles/tokens.css` changes only when implementation
   starts.
