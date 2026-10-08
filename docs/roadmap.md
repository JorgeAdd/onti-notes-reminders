# Roadmap

Vertical slices toward the v1 scope in `docs/product/brief.md` §5. Each slice
runs as one SDD change under `openspec/changes/`. Rule numbers (R1–R17) refer
to `docs/CONTRACT.md`.

Status legend: **Done**, **Named** (referenced in slice 1 artifacts, scope not
yet specified), **Proposed** (inferred from the v1 scope, not yet agreed).

| Slice | Theme                                   | Status   |
| ----- | --------------------------------------- | -------- |
| 1     | Read-only Today page                    | Done     |
| 2     | Timezone, capture, snooze and done/undo | Done     |
| 3     | Day navigation and tag filter           | Named    |
| 4     | Note editing and markdown               | Proposed |
| 5     | All notes and search                    | Proposed |
| 6     | Web Push notifications                  | Proposed |
| 7     | Merged into slice 2                     | —        |
| 8     | Page entrance and theme override        | Named    |

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

- Move between days from the Today page.
- Tag filter on the day page (R12): timed items on the rail, the rest listed
  below; "{n} notes" header, "{total − n} notes hidden"; `esc` clears.

_Implemented on `feat/slice-3-day-navigation-tag-filter`; pending the manual
smoke and merge._

## Slice 4 — Note editing and markdown (proposed)

Creation ships with capture in slice 2; this slice covers the rest of the
note lifecycle.

- Edit and delete notes.
- Manual reschedule and reminder removal (R8).
- Basic markdown body, always sanitized; raw HTML is never rendered (R14).

## Slice 5 — All notes and search (proposed)

- All notes view.
- Case-insensitive full-text search on title + body over all notes (R13).

## Slice 6 — Web Push notifications (proposed)

- Service worker and backend scheduler, one push per `due_at` value (R10).
- Done from the notification (matrix C3) reuses slice 2's done mutation.
- Denied permission still leaves the item due in the Today view.

## Slice 7 — Merged into slice 2

Timezone-on-first-login was named slice 7 in slice 1's artifacts. It moved to
the start of slice 2 because capture and snooze depend on it.

## Slice 8 — Page entrance and theme override

Brief: `docs/design/landing-brief.md` (binding). Style guide: SG19, SG18.

- A quiet sheet entrance of about 300 ms on every full page load (Today
  and the sign-in card), CSS-only, with a reduced-motion fallback (SG16).
- Only the desk renders while the session or Today's data is pending;
  `TodayStatus` appears only on error or after about 400 ms.
- Manual theme override (moved from slice 4): System / Light / Dark,
  stored in `localStorage` and applied before first paint by an inline
  script in `index.html`.
- Budget: ≤ 3 kB gzipped of added CSS and JS, no new dependency.
