# Design: Slice 8 — Page entrance and theme override

## Technical Approach

Token-first and CSS-only. All motion values live in `tokens.css` (brief decision 15); one shared CSS module holds the keyframes and the three entrance classes; a one-bit module-level flag decides which sheet plays. Theme is one small module (`features/theme/theme.ts`), one control, and a ~230-byte inline `<head>` script that mirrors the module's key and parse rule, kept honest by a parity test. No new dependency, no lazy route (decisions 19-21). Serves the proposal and brief decisions 1-30 (cited, not restated). Threat matrix: N/A (no routing, shell, subprocess, VCS automation or process integration). The only security-adjacent surface is the inline script (no CSP exists today; a future CSP needs a hash, noted in Risks).

## Architecture Decisions

| #   | Decision               | Chosen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Rejected (why)                                                                                                                                                                                                                        |
| --- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Once per full load     | `lib/entrance.ts`: module variable `played = false`; `useEntrance(): 'play' \| undefined` = `useState(() => !played)[0] ? 'play' : undefined`, plus `useEffect(() => { played = true }, [])`. The sheet root (`DayPage` `.desk`, `AuthForm` `main`) gets `data-entrance={useEntrance()}`. CSS runs only under `[data-entrance]`. State survives re-renders, refetches, optimistic updates, day navigation, theme change and StrictMode's simulated remount (state is preserved; the flag flips in the effect, after the initializer). Any later mount sees `played` and renders no attribute. `resetEntranceForTests()` is exported for tests. | `useRef` per component (resets on Today <-> All notes remount, replays). `sessionStorage` (survives reload, so never plays twice in a tab, wrong). Removing the class on `animationend` (jsdom has no animation events; extra state). |
| 2   | Pending = desk only    | **Keep `return null`** in `App.tsx:86`. `global.css` already paints `body` with `--color-desk` and `#root` is `height: 100%`, so the desk is full-bleed from the first frame and nothing can shift. Adding a desk element would add DOM and a second source of the desk color. `Suspense fallback={null}` for All notes stays. A test pins the behavior.                                                                                                                                                                                                                                                                                       | A `<div class=desk>` placeholder (duplicate paint, no gain). A sheet shell (two sheet widths, decision 5).                                                                                                                            |
| 3   | Status delay           | `features/today/use-after-delay.ts`: `useAfterDelay(active, ms)` = `setTimeout` in an effect keyed on `active`, cleared on cleanup; `STATUS_DELAY_MS = 400`. `TodayContainer` renders `TodayStatus` only when `query.isError \|\| elapsed`, else `null`. While `data` is undefined the timer runs; a fast load never shows the card. `setTimeout` is not the clock (rule 16); tests use fake timers.                                                                                                                                                                                                                                           | `Date.now()` diff (rule 16). CSS `animation-delay` on the card (card still in the a11y tree, `role="status"` announces early).                                                                                                        |
| 4   | Keyframes and classes  | `styles/entrance.module.css` holds all keyframes and three classes: `.sheet`, `.date`, `.last` (the mobile capture bar). Each rule is `[data-entrance] .x { animation: … backwards }`. Components pull them with `composes` (pattern already used by `NotesPage`). `backwards`, not `both`: after the end no `transform`/`clip-path` remains, so no permanent stacking context and no permanent clip of the box shadow.                                                                                                                                                                                                                        | Per-component keyframe copies (the sheet keyframes would exist twice). Component-level media queries (rule 10).                                                                                                                       |
| 5   | Theme module           | `features/theme/theme.ts`: `THEME_KEY = 'onti.theme'`, `ThemeChoice`, `themeFromStored(raw)` (only `'light'`/`'dark'`, else `system`), `appliedTheme(root)`, `applyTheme(choice, root)` (system removes the attribute), `storeTheme(choice, storage?)` (system removes the key; every access in `try/catch`; a throw is swallowed).                                                                                                                                                                                                                                                                                                            | Context provider (two controls never co-mount). `matchMedia` in JS (CSS already follows the system).                                                                                                                                  |
| 6   | Control reads the page | `ThemeControl` initial state is `appliedTheme(document.documentElement)`, not storage: if a write failed, the open page stays on the choice after a Today <-> All notes remount (decision 25). Storage is read once, by the inline script.                                                                                                                                                                                                                                                                                                                                                                                                     | Reading storage on mount (a failed write would flip the control back to System while the page stays Dark).                                                                                                                            |
| 7   | Control markup         | `<div role="radiogroup" aria-label={messages.theme.label}>` with three `<label>` each holding a native `<input type="radio">` (shared `name` from `useId`) and a `<span>`. The input covers the label (`position:absolute; inset:0; opacity:0; margin:0`) so the whole `--size-target` box is the real control and arrow keys work natively. Selected: `input:checked + span` = `--color-ink` fill, `--color-ink-inverse` text. Focus: `input:focus-visible + span { outline: var(--focus-ring) }`. No `--color-date`.                                                                                                                         | Buttons with `aria-pressed` (not a radio group). A `<select>` (hides the three states).                                                                                                                                               |
| 8   | Placement              | `DateColumn` gets optional `showTheme?: boolean`; `DayPage` passes it, `NotesPage` does not (brief: not on All notes). `AuthForm` renders the control as the last child of the card. A wrapper is not needed: it sits above Sign out in the column's grid.                                                                                                                                                                                                                                                                                                                                                                                     | Always rendering in `DateColumn` (also shows on All notes, violates decision 26).                                                                                                                                                     |
| 9   | Instant swap           | Verified: no `transition` exists in `apps/web/src`; the only motion is mount `animation`, which theme changes do not restart (the animation properties do not change). A static test fails if any `transition` appears in `src/**/*.css`.                                                                                                                                                                                                                                                                                                                                                                                                      | A `* { transition: none }` reset (hides future bugs).                                                                                                                                                                                 |
| 10  | No header rule         | The page has no header rule (board 03) and the entrance adds none (brief decision 8.5, user decision 2026-10-08, commit 1381bec). No `.ruled`, `.rule`, `rule-in`, `--entrance-rule-start` or `--entrance-delay-rule`. `PageHeader` is not modified. The mobile capture bar fades in last through `--entrance-delay-bar`.                                                                                                                                                                                                                                                                                                                      | Adding a 1px rule only to animate it (a new visible element the boards do not show).                                                                                                                                                  |

## Tokens (exact)

Added after the motion roles in `tokens.css`: `--motion-entrance: var(--core-duration-240)`, `--motion-entrance-detail: var(--core-duration-150)`, `--entrance-rise: var(--space-md)`, `--entrance-rise-detail: var(--space-xs)`, `--entrance-clip-start: inset(0 0 100% 0)`, `--entrance-delay-date: var(--core-duration-80)`, `--entrance-delay-bar: var(--core-duration-150)` (seven roles). Then, **before** the reduced-motion block (so reduced motion wins on mobile): `@media (max-width: 640px) { :root { --entrance-rise: var(--space-sm) } }`. The existing reduced-motion block gets the remaps of decision 18 verbatim: `--entrance-rise: 0`, `--entrance-rise-detail: 0`, `--entrance-clip-start: inset(0)`, `--motion-entrance: var(--core-duration-150)`, and `--motion-entrance-detail`, `--entrance-delay-date`, `--entrance-delay-bar` as `var(--core-duration-instant)`.

```css
/* entrance.module.css (shape) */
@keyframes sheet-in {
  from {
    opacity: 0;
    transform: translateY(var(--entrance-rise));
    clip-path: var(--entrance-clip-start);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    clip-path: inset(0);
  }
}
@keyframes date-in {
  from {
    transform: translateY(var(--entrance-rise-detail));
  }
  to {
    transform: translateY(0);
  }
}
@keyframes last-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
[data-entrance] .sheet {
  animation: sheet-in var(--motion-entrance) var(--ease-paper) backwards;
}
[data-entrance] .date {
  animation: date-in var(--motion-entrance-detail) var(--ease-paper) var(--entrance-delay-date)
    backwards;
}
[data-entrance] .last {
  animation: last-in var(--motion-entrance-detail) var(--ease-paper) var(--entrance-delay-bar)
    backwards;
}
```

Timeline: sheet 0-240 ms, date 80-230, mobile bar 150-300 (opacity only, no slide). Total about 240 ms desktop and 300 ms mobile, both <= 500. Resting literals (`translateY(0)`, `inset(0)`) are the only raw values, as decision 15 states.

## Data Flow

    full load ─▶ <head> inline script ─▶ data-theme set/removed ─▶ first paint (desk via body bg)
    App null (pending) ─▶ AuthForm mounts      ─▶ useEntrance(): played=false ─▶ data-entrance=play ─▶ CSS runs
                      └▶ TodayContainer: no data ─▶ useAfterDelay(400) ─▶ TodayStatus only on error or elapsed
                                        data   ─▶ DayPage mounts ─▶ useEntrance() ─▶ play (first sheet only)
    later mounts (sign-in, All notes round trip) ─▶ played=true ─▶ no attribute ─▶ no animation
    ThemeControl click ─▶ applyTheme (DOM, instant) ─▶ storeTheme (try/catch) ; sheet node and attribute untouched

## File Changes

| File                                                                                                                                                             | Action | Description                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------- |
| `apps/web/src/styles/tokens.css`                                                                                                                                 | Modify | Seven roles, mobile remap, reduced-motion remap     |
| `apps/web/src/styles/entrance.module.css`                                                                                                                        | Create | Keyframes and three classes                         |
| `apps/web/src/lib/entrance.ts`                                                                                                                                   | Create | `useEntrance`, `resetEntranceForTests`              |
| `apps/web/src/features/today/use-after-delay.ts`                                                                                                                 | Create | `useAfterDelay`, `STATUS_DELAY_MS`                  |
| `apps/web/src/features/today/TodayContainer.tsx`                                                                                                                 | Modify | Gate `TodayStatus` (line 233)                       |
| `apps/web/src/features/today/{DayPage,DateColumn}.tsx` + `.css`                                                                                                  | Modify | `data-entrance`, composed classes, `showTheme`      |
| `apps/web/src/features/today/MobileBar.module.css`                                                                                                               | Modify | `.bar` composes `last`                              |
| `apps/web/src/features/auth/AuthForm.tsx` + `.module.css`                                                                                                        | Modify | `data-entrance`, `.page` composes `sheet`, control  |
| `apps/web/src/features/theme/{theme.ts,ThemeControl.tsx,ThemeControl.module.css}`                                                                                | Create | Decisions 5-7                                       |
| `apps/web/index.html`                                                                                                                                            | Modify | Inline script                                       |
| `apps/web/src/messages.ts`                                                                                                                                       | Modify | `theme: {label, system, light, dark}`               |
| `apps/web/test/{css-tokens.ts,entrance-tokens.test.ts,entrance-once.test.tsx,pending-states.test.tsx,theme.test.ts,theme-script.test.ts,theme-control.test.tsx}` | Create | See below                                           |
| `apps/web/test/today-container.test.tsx`                                                                                                                         | Modify | First test (lines 56-61) awaits the delayed status  |
| `docs/design/style-guide-decisions.md`, `docs/roadmap.md`, `docs/backlog.md`                                                                                     | Modify | Brief "Source updates", own commits first (rule 14) |

## Interfaces / Contracts

```ts
export type ThemeChoice = 'system' | 'light' | 'dark'
export const THEME_KEY = 'onti.theme'
export function themeFromStored(raw: string | null): ThemeChoice
export function appliedTheme(root: HTMLElement): ThemeChoice
export function applyTheme(choice: ThemeChoice, root: HTMLElement): void
export function storeTheme(
  choice: ThemeChoice,
  storage?: Pick<Storage, 'setItem' | 'removeItem'> | null,
): void
export function useEntrance(): 'play' | undefined
export function useAfterDelay(active: boolean, ms: number): boolean
```

Inline script (exact shape, no Vite transform): `var d=document.documentElement,t;try{t=localStorage.getItem('onti.theme')}catch(e){}t==='light'||t==='dark'?d.setAttribute('data-theme',t):d.removeAttribute('data-theme')`.

## Testing Strategy (strict TDD; each step RED first)

| Order | Layer     | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Approach                                                                                                                                                                                                                                                                      |
| ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Static    | Tokens exist with exact values; mobile query precedes the reduced-motion block; reduced block holds the seven remaps (`--entrance-delay-bar` included). No `--entrance-rule-*` token exists. First frame under reduced motion (alone and combined with mobile) equals the resting state; delays resolve to `0ms`. Entrance CSS uses only `--motion-*`, `--ease-*`, `--entrance-*`, no `--core-*`, raw durations, px (except `1px`), or `pointer-events`. No `transition` in `src/**/*.css`. | `test/css-tokens.ts`: parse `:root` declarations, overlay the reduced (and mobile) block, resolve `var()` recursively; read `from` keyframes and the `animation` shorthand order (duration, easing, delay). Existing `readFileSync` pattern.                                  |
| 2     | Component | Attribute present on first `DayPage`/`AuthForm` mount, absent on the next mount; not replayed on re-render, refetch (`invalidateQueries`), optimistic done/snooze, day navigation; same DOM node survives a theme click; `TodayStatus` does not consume the flag; sign-in after the sign-in card gets no entrance; All notes round trip in `App` gets none. Input works while the attribute is set (click Sign out, type in the capture bar).                                               | `resetEntranceForTests()` in `beforeEach`; assert `data-entrance` and node identity (jsdom has no animation engine). One `StrictMode` render. `app.test.tsx` mocks reused.                                                                                                    |
| 3     | Component | `App` renders an empty container while `getSession` is pending. `TodayStatus` absent at 399 ms, present at 400 ms, absent for a fast load, immediate on error; timer cleared on unmount.                                                                                                                                                                                                                                                                                                    | Fake timers (`setTimeout`/`clearTimeout` only), as `today-container.test.tsx` already restores real timers in `afterEach`.                                                                                                                                                    |
| 4     | Unit      | `themeFromStored` (light, dark, null, `''`, `'sepia'`, `'LIGHT'`); `applyTheme` set/remove; `storeTheme` writes, removes, swallows a throwing `setItem`/`removeItem`/null storage.                                                                                                                                                                                                                                                                                                          | Plain functions on `document.documentElement` and fake storages.                                                                                                                                                                                                              |
| 5     | Script    | Extract the first non-module `<script>` from `index.html` and run it for light, dark, none, invalid, throwing `getItem`, throwing `localStorage` getter, undefined storage: attribute set or removed, never throws. Parity: for each stored value the script result equals `themeFromStored`; the script text contains `THEME_KEY`.                                                                                                                                                         | `readFileSync('index.html')`, regex, `new Function(source)()` against jsdom globals with `vi.stubGlobal('localStorage', …)` / `Object.defineProperty` for the throwing getter.                                                                                                |
| 6     | Component | `ThemeControl`: radiogroup named from `messages.theme.label`, three radios, initial state from the DOM, click applies instantly and stores, arrow keys move, failing write keeps the page choice, remount shows the applied choice. Placement: in `DayPage`'s column, in the sign-in card, not in `NotesPage`. No hardcoded copy: source has no label literals. CSS: `--size-target`, `--focus-ring`, ink checked state, no `--color-date`.                                                 | `userEvent`, `getByRole('radio')`; `readFileSync` of the component source and CSS (pattern of `mobile-tags.test.tsx`).                                                                                                                                                        |
| 7     | Build     | Budget: added CSS+JS (+ `index.html`) <= 3 kB gzipped.                                                                                                                                                                                                                                                                                                                                                                                                                                      | `npm run build -w @onti/web` on `origin/main` and on the branch; for each of `dist/assets/*.css`, `dist/assets/*.js`, `dist/index.html`, `gzip -c f \| wc -c`; compare sums by name; delta <= 3072 B. Record both tables in the PR. Manual: theme x motion x width, no flash. |

Size forecast: about 330 source lines + 420 test lines = about 750, plus about 50 docs lines, near the 800 budget; if the total exceeds 800 the PR records `size:exception`.

## Migration / Rollout

No migration. A stored `light`/`dark` key is inert without the script (tokens already honor `data-theme`). Rollback per the proposal.

## Risks and CONTRADICTIONS

- **CONTRADICTION 1 (RESOLVED by dropping):** the earlier brief animated a "header rule" that `PageHeader` never rendered. The user dropped the animation (commit 1381bec, brief decision 8.5); nothing is added and `PageHeader` stays untouched (Decision 10).
- **CONTRADICTION 2: `DateColumn` is shared with All notes.** Decision 26 says "Today" and "nowhere else"; rendering inside `DateColumn` would also show it on All notes. Resolved with `showTheme` (Decision 8); the control is absent on All notes.
- **Interpretation, not contradiction:** decision 5 says the desk "renders"; it already does through `body`, so `null` is correct (Decision 2). Decision 24 says the control "reads" the key; here the inline script reads storage and the control reads the applied DOM state (Decision 6), the key and parse rule stay shared and parity-tested.
- **Interpretation:** "full page load" means one flag per load, so signing in from the sign-in card does not play the Today entrance. Specs must state it.
- **Shadow pop (Safari-adjacent):** `clip-path: inset(0)` also clips `--shadow-page`, so the shadow appears when the animation ends (about 10% alpha). Manual check; fallback is Variant B (drop `clip-path`, decision 20).
- **Reduced motion, mobile bar:** `--motion-entrance-detail` and `--entrance-delay-bar` both collapse to 0, so the bar has no fade of its own while the sheet fades 150 ms (brief decision 18). Accepted; the sheet fade carries the page.
- **Existing test churn:** `today-container.test.tsx:56-61` expected the immediate status; updated to await it.
- **Future CSP:** the inline script would need a hash or nonce.
- **Budget:** estimated CSS about 0.7 kB and JS about 1 kB gzipped; verified by task 7, not assumed.

## Open Questions

- [ ] None blocking. CONTRADICTION 1 is resolved by dropping the rule; CONTRADICTION 2 by `showTheme`.
