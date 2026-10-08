# Proposal: Slice 2 — Timezone, capture, snooze and done/undo

## Intent

Make the Today page actionable. Serves `docs/product/brief.md` §5 and `docs/roadmap.md` slice 2. Slice 1 is read-only; the user cannot add a note, finish an item or defer one. All time math already exists and is tested in `packages/shared`, so this slice is plumbing: API write endpoints, web mutations, command bar, keyboard layer. Timezone comes first because a `UTC` default puts a real user's `17:00` at the wrong instant.

## Scope

### In Scope

1. **Timezone (R16):** web sends the browser IANA zone; API validates and stores it in `profiles.timezone` only while it is still the `UTC` default.
2. **Capture (R11):** `c` opens a command bar with an italic preview until ↵. Structured payload `{title, tags[], dueAt|null}` to `POST /notes`. Server validates, derives tag names, upserts tags, inserts note and `note_tags` in one transaction.
3. **Reminder actions (R7, R9):** dedicated snooze (+1 h, Tomorrow 9:00), done and undo endpoints, computed server-side with Clock and profile timezone, under a row lock.
4. **Errors:** API maps 400/404/409 (only 401 exists). Another user's note is 404 (R15).
5. **Web mutations:** optimistic patch of `['today']` through a shared pure helper reusing `buildDayPage`; rollback and invalidate on failure; mutation 401 reaches the session-expired flow.
6. **Keyboard and row UI:** visible shortcuts, row actions, "{time} · was {original} · {count}×" for snoozed items, strike animation with reduced-motion fallback.
7. **Mobile:** bottom bar, per-item action sheet, capture presets (no "Pick…").
8. **DST first:** tests for the R16 gap and the fall-back overlap before any fix.
9. **Docs:** SG9 "5h48m" corrected to "5h48" (CONTRACT wins, rule 14) in its own commit.

### Out of Scope

Note edit/delete, manual reschedule (R8), markdown (R14): slice 4. Day navigation, tag filter (R12): slice 3. All notes, search (R13): slice 5. Web Push, notification-click done: slice 6. Theme override UI, onboarding, `?` help.

## Capabilities

### New Capabilities

- `profile-timezone`: first-login zone sync, IANA validation, never auto-changed.
- `quick-capture`: command bar, preview, structured create, tag upsert, presets.
- `reminder-actions`: snooze, done, undo, errors, optimistic behavior, keyboard and row display.

### Modified Capabilities

- `today-page`: done items gain actions; statusline shows working key hints; out-of-scope list updated.

## Decisions (human-approved)

| #   | Decision                                                                                          |
| --- | ------------------------------------------------------------------------------------------------- |
| Q1  | Capture without a time creates a plain note, no reminder (in "other notes"; unseen until slice 5) |
| Q2  | `z` reopens the focused done item any time on the page (R9); snooze is not undoable               |
| Q3  | Mobile bar, sheet and presets ship now, without "Pick…"                                           |
| Q4  | Timezone set only while `UTC`; never auto-changed; no picker                                      |
| Q5  | Explicit past time (`today 09:00` after 09:00) accepted, shows late; bare `HH:MM` rolls (R11)     |
| Q6  | Keys: `c`, `j`/`k`, `x`, `z`, `s h`/`s t`, `esc`; statusline shows only working keys              |
| Q7  | "+1 h" on a later item may move it earlier (R7)                                                   |
| Q8  | `#client-a` reuses existing "Client A"                                                            |
| Q9  | Failed mutation: item restored plus one-line message from `messages.ts`                           |

## Approach

Dedicated action endpoints (no generic PATCH, which would trust client time and collide with R8). Structured capture payload so preview equals saved note. Timezone read from `/today.timezone`, no extra request, no migration (RLS and grants already allow owner update). Domain functions are reused, not rewritten.

## Affected Areas

| Area                                                             | Impact       | Description                                                                                          |
| ---------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| `packages/shared/src` and `test`                                 | Modified     | request schemas, zone validator, cache helper, DST tests; fix `domain/time.ts` if the gap test fails |
| `apps/api/src` and `test`                                        | Modified     | use cases, ports, adapters, routes, error mapping                                                    |
| `apps/web/src/features/today`, `api.ts`, `messages.ts`, `styles` | Modified     | mutations, command bar, keys, row, mobile                                                            |
| `docs/design/style-guide-decisions.md`, `docs/CONTRACT.md`       | Modified     | SG9 fix; verification status                                                                         |
| `openspec/specs`                                                 | New/Modified | three new specs, one delta                                                                           |

## Risks

| Risk                                                                   | Likelihood | Mitigation                                                                        |
| ---------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------- |
| **Size: ~2,000–2,300 authored lines vs the 800-line single-pr budget** | High       | Split or `size:exception` decision is required at the tasks gate; not chosen here |
| DST gap yields 03:30 instead of 03:00 (R16)                            | Med        | Test first, fix `localTimeOn`                                                     |
| Lost update on `snooze_count` from two tabs                            | Med        | `select … for update` in one transaction                                          |
| Plain notes invisible until slice 5 (Q1)                               | Med        | Accepted; state in spec                                                           |
| Bundle already large                                                   | Low        | Lazy-load command bar if needed                                                   |
| No CONTRACT rule change found; if apply finds one, flag it (rule 23)   | Low        | Same-commit tests and `docs/CONTRACT.md`                                          |

## Rollback Plan

Revert the PR(s); no migration, so no data rollback. Notes created by capture stay valid under existing constraints. A stored timezone remains valid and harmless.

## Dependencies

Slice 1 archived; shared domain tested; schema, RLS and grants unchanged.

## Success Criteria

- [ ] CONTRACT rows C1, C3 (done mutation only), C5, C6 and the R16 gap and overlap cases pass with an injected clock.
- [ ] Timezone is stored once, only from `UTC`, and never overwritten.
- [ ] Capture, snooze, done, undo work by keyboard and on mobile; errors map to 400/404/409/401.
- [ ] Failed mutations roll back with a message; reduced motion honored.
- [ ] `npm run verify` and "Verify and build" green on each PR.

## Open Questions

- Delivery split versus `size:exception` (human decision at the tasks gate).
