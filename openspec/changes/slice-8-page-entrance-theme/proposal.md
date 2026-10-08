# Proposal: Slice 8 — Page entrance and theme override

## Intent

Give the app a quiet first impression and finish the manual theme override. Serves `docs/design/landing-brief.md` (decisions 1-30, binding), SG15, SG16, SG18 and new SG19. Today `App.tsx:86` renders nothing until the session resolves, then the sheet pops in; the theme tokens honor `data-theme` but no control or persistence exists. Both share the first paint, so they ship together. Brief decisions are cited by number, not restated.

## Scope

### In Scope

1. **Entrance tokens** (decision 15) in `tokens.css`: eight `--entrance-*` / `--motion-entrance*` roles, mobile remap (17), reduced-motion remap (18).
2. **Entrance on the real sheets** (6, 8, 10, 14): `DayPage` and the sign-in card; date block and header rule detail. CSS-only (19).
3. **Pending states** (5, 7): desk only while session or Today data is pending; `TodayStatus` only on error or after ~400 ms.
4. **Once per full load** (4): no replay on in-app switches, refetch, token refresh, optimistic updates or theme change (29).
5. **Theme override** (22-30): inline `<head>` script, one storage module, shared `ThemeControl` in the date column and on the sign-in card, labels in `messages.ts`.
6. **Docs** (brief "Source updates"): SG19, SG15 note, SG18 three-state note.

### Out of Scope

SG15 tear-off (11); row or field stagger (9, 10); animation library or lazy route (20, 21); theme shortcut (28); cross-device theme sync (backlog); any other `ThemeControl` placement.

## Capabilities

### New Capabilities

- `page-entrance`: sheet, date block and rule choreography, pending states, once-per-load rule, mobile and reduced-motion token remaps.
- `theme-override`: three-state control, shared storage key, pre-paint inline script, failure fallbacks, accessibility.

### Modified Capabilities

None. Existing `today-page` behavior is unchanged apart from added placement of the control.

## Approach

Token-first: all motion lives in `tokens.css` and components animate from tokens to the resting state, so reduced motion is a token remap only. Entrance is a CSS keyframe applied on mount of the sheet, so in-app switches and refetches (which do not remount the sheet) do not replay it. Theme logic is one small module shared by the React control; the inline script mirrors the same key and values, and a test executes it from `index.html`. Strict TDD.

## Affected Areas

| Area                                                         | Impact   | Description                            |
| ------------------------------------------------------------ | -------- | -------------------------------------- |
| `apps/web/src/styles/tokens.css`                             | Modified | entrance roles, mobile and RM remaps   |
| `apps/web/index.html`                                        | Modified | inline theme script                    |
| `apps/web/src/App.tsx`, `features/today/TodayContainer.tsx`  | Modified | desk-only pending, 400 ms status delay |
| `apps/web/src/features/today/DayPage*`, `DateColumn.tsx`     | Modified | entrance, control placement            |
| `apps/web/src/features/auth/AuthForm*`                       | Modified | card entrance, control                 |
| `apps/web/src/features/theme/*`                              | New      | `ThemeControl`, storage module         |
| `apps/web/src/messages.ts`                                   | Modified | theme labels                           |
| `apps/web/test`                                              | New/Mod  | static CSS, script, component tests    |
| `docs/design/style-guide-decisions.md`, `roadmap`, `backlog` | Modified | SG19, SG15, SG18, Slice 8              |

## Risks

| Risk                                                | Likelihood | Mitigation                                                 |
| --------------------------------------------------- | ---------- | ---------------------------------------------------------- |
| Size near the 800-line budget with strict TDD tests | Med        | Single PR; forecast at tasks; `size:exception` if exceeded |
| `clip-path` reveal misbehaves (Safari)              | Med        | Variant B (lift, no clip) per decision 20                  |
| Inline script drifts from the React module          | Med        | Shared key and values; test runs the real script           |
| Entrance replays on remount or flashes status card  | Med        | Mount-based trigger; tests for refetch, optimistic, 400 ms |
| Added CSS+JS over 3 kB gzip                         | Low        | Build-output check; no dependencies                        |

## Rollback Plan

Revert the single commit/PR. The change is CSS tokens, one inline script and one small component with its storage key; no migration or data. A stored `light`/`dark` key left in browsers is inert (the existing token rules still honor `data-theme`; absent script, System applies). If only the reveal fails, switch to Variant B by dropping the `clip-path` token usage (decision 20) without reverting the theme work.

## Dependencies

Slices 1, 2, 3, 5 merged (base `9403f16`). Brief and SG docs updated in their own commits first (CLAUDE.md rule 14).

## Budgets

- Review: 800 changed lines including tests (doubled from the default 400; single-pr).
- Bundle: <= 3 kB gzipped of added CSS and JS together (decision 21).

## Success Criteria

- [ ] Entrance plays once per full load, <= 500 ms, never on in-app transitions (4, 13).
- [ ] Reduced motion: first frame equals resting state; delays resolve to 0 ms (18).
- [ ] Stored theme applied before first paint; storage failures fall back to System (24, 25).
- [ ] Targets >= 44 px, visible focus, copy from `messages.ts` (27, 30).
- [ ] Added CSS+JS <= 3 kB gzipped; `npm run verify` and "Verify and build" green.
