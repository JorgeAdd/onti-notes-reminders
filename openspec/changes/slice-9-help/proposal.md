# Proposal: Slice 9 — How it works help

## Intent

The app is keyboard-first, yet nothing on screen says how capture, days, note keys or find work. Serves `docs/roadmap.md` (Slice 9, binding), CONTRACT R11 (capture grammar), SG10 (`?` = all keys), SG13-SG16, SG20. Decisions are final and cited, not restated. Web only: no API, database or CONTRACT change.

## Scope

### In Scope

- Help opened by `?` (free in `keys.ts`) and a visible "?" Statusline button (>= 44 px). Never opens on its own.
- Today empty state hint, desktop and mobile wording (roadmap).
- Desktop modal dialog; mobile (<= 640 px) bottom sheet inside the existing dock (`DayPage.tsx`).
- Four sections (Capture, Days, On a note, Find); mobile shows touch equivalents (presets, action sheet, Search/Tags buttons).
- Key rows built from `KeyHint` in `keys.ts` and `messages.ts` `statusline.keys`; new copy in `messages.ts` (rule 12).
- Accessibility: `role="dialog"`, `aria-modal`, labelled title, focus in / trapped / returned to trigger, esc and a 44 px close button, page keys inert while open.
- Motion: <= 150 ms fade, `--motion-*` / `--ease-paper`; tokens only (rules 8, 10).
- Tests: every `keys.ts` command, the `/` and `#` layers and note-view `e`/`d` have a help entry; every capture example runs through the shared R11 parser and matches the help text.

### Out of Scope

First-run onboarding, auto-open, tours; a new dependency (no dialog library); API/DB/CONTRACT changes; new shortcuts; help on the All notes and note-view statuslines (design decides whether `?` also works there).

## Capabilities

### New Capabilities

- `help-dialog`: open/close triggers, sections, desktop dialog vs mobile sheet, accessibility, sync with key definitions.

### Modified Capabilities

- `today-page`: empty-state hint; "?" Statusline button; `?` key.

## Approach

A lazy-loadable `features/help/` module (container + presentational dialog and sheet, focus-trap hook written in-house). A pure `help-model` maps `KeyHint` ids to rows, so the coverage test iterates the `KeyHint` union and the handled keys. Mobile reuses `use-narrow` and the dock. The existing key layer is disabled while open (`useKeyboardLayer(enabled)`).

## Affected Areas

| Area                                                                                                       | Impact       |
| ---------------------------------------------------------------------------------------------------------- | ------------ |
| `apps/web/src/features/help/*` (+ CSS modules)                                                             | New          |
| `apps/web/src/features/today/{Statusline,DayPage,EmptyState,TodayContainer}.tsx`, `keys.ts` (exports only) | Modified     |
| `apps/web/src/messages.ts`                                                                                 | Modified     |
| `apps/web/test/*`                                                                                          | New/Modified |
| `docs/roadmap.md`, `docs/design/style-guide-decisions.md` (SG10/SG20 note if wording changes)              | Modified     |

## Risks

| Risk                                   | Likelihood | Mitigation                                                         |
| -------------------------------------- | ---------- | ------------------------------------------------------------------ |
| Focus trap without a library           | Med        | Small tested hook: Tab wrap, restore focus, esc                    |
| Help drifts from `keys.ts`             | Med        | Rows derive from `KeyHint`; coverage test fails on a missing entry |
| Mobile dock already holds several bars | Med        | Sheet replaces the bars while open; check on a 640 px viewport     |
| Bundle size                            | Low        | No dependency; lazy chunk; check build output                      |
| PR over budget                         | Med        | Forecast exceeds 800 lines: label `size:exception`, no chain       |

## Rollback Plan

Revert the single PR. Web only: no migration, no data, no API deploy.

## Dependencies

Slices 1-5 and 8 merged; slice 6 and slice 4 files touched only through exports.

## Success Criteria

- [ ] `?` and the button open help; nothing opens it automatically.
- [ ] Coverage and R11 example tests pass; `npm run verify` and "Verify and build" green.
- [ ] Dialog meets focus, aria, 44 px and reduced-motion rules.
- [ ] PR within 800 changed lines, or labelled `size:exception`.
