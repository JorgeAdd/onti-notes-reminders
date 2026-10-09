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
| 3     | Day navigation and tag filter           | Done     |
| 4     | Note editing and markdown               | Done     |
| 5     | All notes and search                    | Done     |
| 6     | Web Push notifications                  | Proposed |
| 7     | Merged into slice 2                     | —        |
| 8     | Page entrance and theme override        | Done     |

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

## Slice 6 — Web Push notifications (proposed)

- Service worker and backend scheduler, one push per `due_at` value (R10).
- Done from the notification (matrix C3) reuses slice 2's done mutation.
- "+1 h" from the notification (R7, matrix C15). The notification has two
  actions, Done and "+1 h" (SG17).
- Actions authenticate with a signed action token (ADR-004): HMAC-SHA-256
  over the note, user, `due_at`, allowed actions and a 24 h expiry, carried
  in the encrypted push payload and sent to
  `POST /push-actions/{done|snooze}`. On any failure the click opens the
  app (`/?action=...` with the note id and `due_at`), where the normal JWT
  path runs the action only if Today still shows that note open with the
  same `due_at`.
- A one-time backfill migration marks the currently overdue open reminders
  as notified, so the first scheduler tick sends no burst.
- Opt-in permission control in the date column, under the theme control,
  and in the mobile bar; added after slice 4 merges. Permission is never
  requested on page load.
- Sign-out unsubscribes this browser. Pushes go to every subscribed device.
- Body: the first 2 non-empty lines of the note, markdown stripped, up to
  120 chars, plus the tag display name.
- iOS is best effort, with placeholder icons and a web app manifest.
- Denied permission still leaves the item due in the Today view.
- Ships as three PRs after slice 4's first PR: backend scheduler and
  sender; subscription and action endpoints; web (service worker,
  manifest, permission control).
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
