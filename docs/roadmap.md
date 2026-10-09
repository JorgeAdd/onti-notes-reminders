# Roadmap

Vertical slices toward the v1 scope in `docs/product/brief.md` §5. Each slice
runs as one SDD change under `openspec/changes/`. Rule numbers (R1–R17) refer
to `docs/CONTRACT.md`.

Status legend: **Done**, **Named** (referenced in slice 1 artifacts, scope not
yet specified), **Proposed** (inferred from the v1 scope, not yet agreed).

| Slice | Theme                                   | Status |
| ----- | --------------------------------------- | ------ |
| 1     | Read-only Today page                    | Done   |
| 2     | Timezone, capture, snooze and done/undo | Done   |
| 3     | Day navigation and tag filter           | Done   |
| 4     | Note editing and markdown               | Done   |
| 5     | All notes and search                    | Done   |
| 6     | Web Push notifications                  | Done   |
| 7     | Merged into slice 2                     | —      |
| 8     | Page entrance and theme override        | Done   |
| 9     | How it works help                       | Named  |

## Slice 1 — Read-only Today page

Done 2026-10-08. `GET /today`, demo seed, Today page shell, items, statusline,
hour rail with a now line. Archived at
`openspec/changes/archive/2026-10-08-slice-1-today-page/`. Deferred items live
in `docs/backlog.md`.

## Slice 2 — Timezone, capture, snooze and done/undo

Done 2026-10-08. Archived at
`openspec/changes/archive/2026-10-08-slice-2-capture-snooze/`. Scope as
shipped:

- **First:** store the browser's IANA timezone in `profiles.timezone` on first
  login (R16), validated by the API. Capture (R11), snooze (R7) and the day
  window (R1) all compute in the profile timezone; with the `UTC` default a
  real user's `17:00` would land at the wrong instant.
- Quick capture in the command bar (R11): creates the note, its tags (created
  if missing) and its reminder. Italic preview until ↵, under 5 s.
- Keyboard shortcuts visible on screen.
- Snooze presets "+1 h" and "Tomorrow 9:00" (R7).
- Mark done / undo (R9).
- Optimistic mutations on the Today page (anticipated in slice 1 design,
  decision 6).
- DST transitions covered by tests.

## Slice 3 — Day navigation and tag filter

Done 2026-10-08. Day navigation keys (`[`, `]`, `t`) and tag filter (`#`) with URL state persistence. Archived at
`openspec/changes/archive/2026-10-08-slice-3-day-navigation-tag-filter/`. Deferred items in `docs/backlog.md`.

## Slice 4 — Note editing and markdown

Done 2026-10-09 (manual smoke pending). Read side (PR #19, c3462cb) and write
side (PR #21, 061ff8a). Note view in All notes with edit, reschedule, reminder
removal and delete; markdown body (R14); "Without a reminder" list (R19).
Archived at `openspec/changes/archive/2026-10-09-slice-4-note-editing/`.
Deferred items in `docs/backlog.md`.

## Slice 5 — All notes and search

Done 2026-10-08. All notes view with full-text word-prefix search (`/` key), excerpts, and tag filtering in All notes. Archived at
`openspec/changes/archive/2026-10-08-slice-5-all-notes-search/`. Deferred items in `docs/backlog.md`.

## Slice 6 — Web Push notifications

Done 2026-10-09 (push not live yet: VAPID setup and manual smoke pending).
Backend core (PR #20, 88f30ef), endpoints (PR #22, 9d83214) and web (PR #24,
ce314f2). Scheduler per `due_at` (R10); Done and "+1 h" from the notification
(C3, C15) authenticated by signed action tokens (ADR-004); subscribe and
unsubscribe; service worker; opt-in permission control; sign-out unsubscribes
this browser. Archived at `openspec/changes/archive/2026-10-09-slice-6-web-push/`.
Deferred items in `docs/backlog.md`.

- Human-only setup:
  - VAPID keys: `npx web-push generate-vapid-keys`.
  - Railway env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
    `PUSH_ACTION_SECRET`, `API_PUBLIC_URL`.
  - Railway runs a single, non-sleeping API instance.
  - Vercel env: `VITE_VAPID_PUBLIC_KEY`.

## Slice 7 — Merged into slice 2

Timezone-on-first-login was named slice 7 in slice 1's artifacts. It moved to
the start of slice 2 because capture and snooze depend on it.

## Slice 8 — Page entrance and theme override

Done 2026-10-08. Archived at `openspec/changes/archive/2026-10-08-slice-8-page-entrance-theme/`. Deferred items in `docs/backlog.md`.

## Slice 9 — How it works help

Implemented on `feat/slice-9-help`; pending the manual smoke and merge. SG10 is unchanged: `?` was already listed. One gap found: `↵` open/fold body, in `docs/backlog.md`.

Web only: no API, database or CONTRACT change.

- Opens with `?` (SG10's "all keys") and with a visible "?" button in the
  statusline (≥ 44 px). It never opens on its own. The Today empty state adds
  the hint "Press ? to see how it works" (mobile: "Tap ? to see how it
  works").
- Desktop: a modal dialog. Mobile (≤ 640 px): a bottom sheet inside the
  existing bottom dock.
- Sections:
  - **Capture:** `c`; `HH:MM` (today, or tomorrow if past); `today HH:MM`
    (accepted even if past, shown late); `tomorrow HH:MM`; `+Nm` / `+Nh`;
    `#tag`; no time is a note without a reminder; `esc` cancels.
  - **Days:** `[` `]` previous/next day; `t` back to today.
  - **On a note:** `j`/`k` move; `x` done; `z` undo; `s` then `h` (+1 h) or
    `t` (tomorrow); `e` edit; `d` delete (↵ confirms, `esc` cancels).
  - **Find:** `/` all notes and search; `#` filter by tag; `esc` clears the
    filter.
  - On mobile, the touch equivalents (presets, action sheet, Search and Tags
    buttons) replace the keys.
- One source of truth: the key rows come from the existing `KeyHint`
  definitions (`apps/web/src/features/today/keys.ts`) and the statusline hint
  copy in `messages.ts`. A test fails if a command key handled in `keys.ts`
  (or the `/` and `#` layers) has no entry in the help, and another runs
  every capture example through the shared R11 parser.
- A short, non-interactive note at the end of the help: "Customize keys and
  buttons — coming in v2" (the feature itself is v2, in `docs/backlog.md`).
- Accessibility: `role="dialog"`, `aria-modal`, a labelled title; focus moves
  in, is trapped, and returns to the trigger; `esc` and a 44 px close button
  close it; page keys don't fire while it is open.
- Motion: a fade of at most 150 ms with `--motion-*` and `--ease-paper`;
  reduced motion via the global token block. Tokens only; copy in the
  messages module.
