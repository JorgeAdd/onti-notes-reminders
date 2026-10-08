# Tasks: Slice 2 — Timezone, capture, snooze and done/undo

## Review Workload Forecast

| Field                   | Value                                                                    |
| ----------------------- | ------------------------------------------------------------------------ |
| Estimated changed lines | ~2,460 (1a 10, 1b 130, 1c 200, 2 340, 3 340, 4 360, 5 400, 6 360, 7 320) |
| 400-line budget risk    | High (800 review budget also exceeded; commits 4 and 5 are the riskiest) |
| Chained PRs recommended | No (human chose one PR; commit-by-commit review replaces the chain)      |
| Suggested split         | Single PR, 9 ordered work-unit commits                                   |
| Delivery strategy       | exception-ok                                                             |
| Chain strategy          | size-exception                                                           |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

Reason for "No": `size:exception` is already accepted by the human. Re-forecast commits 4 and 5 at task time; if one passes ~450 lines, trim CSS and copy first, not a new decision unless the split changes.

Task-level assumption (unconfirmed, Open Question): the mobile "Today 17:00" preset is hidden once it is 17:00 or later (Decision 16). Build it that way in 7.2; if the human changes it, only 7.2 changes.

Global checks for every commit: `npm run verify` green (rule 22, never `--no-verify`); conventional message (rule 5); tests and docs in the same commit; tokens only, strings in `messages`, targets >= `--size-target`, reduced-motion via `--motion-*` tokens, no internal IDs in UI (rules 8-13). Save prompts in `prompts/durante/` (rule 7). No push without asking the human (rule 6).

### Suggested Work Units

| Unit | Goal                          | Focused test command                              | Runtime harness                                  | Rollback boundary                               |
| ---- | ----------------------------- | ------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------- |
| 1a   | SG9 copy fix                  | `npm run verify`                                  | N/A (docs only)                                  | `style-guide-decisions.md`                      |
| 1b   | CONTRACT R9/R11/R16 + DST     | `npm run test -w @onti/shared`                    | N/A (pure functions)                             | `CONTRACT.md`, shared tests, `time.ts` if fixed |
| 1c   | Timezone, errors, `PATCH /me` | `npm run test -w @onti/api` and `-w @onti/web`    | Fastify `inject`; manual tz update (checklist)   | tz use case/route, `api.ts` patch, tz sync      |
| 2    | Reminder actions API          | `npm run test -w @onti/api`                       | `inject`; manual row lock (checklist)            | snooze/done/undo files, routes                  |
| 3    | Capture API                   | `npm run test -w @onti/api`                       | `inject`; manual tag upsert (checklist)          | capture files, `POST /notes`                    |
| 4    | Mutation layer                | `npm run test -w @onti/shared` and `-w @onti/web` | `npm run dev -w @onti/web` vs API; bundle size   | `today-patch.ts`, `mutations/*`                 |
| 5    | Keyboard and row actions      | `npm run test -w @onti/web`                       | dev server, keys `s h`, `s t`, `x`, `z`, `j/k`   | focus/keys/WhichKey, row changes                |
| 6    | Command bar                   | `npm run test -w @onti/web`                       | dev server, `c`, preview, capture; bundle size   | CommandBar, preview, `c` key                    |
| 7    | Mobile + CONTRACT status      | `npm run test -w @onti/web`                       | dev server at mobile width; manual smoke; bundle | MobileBar, ActionSheet, status docs             |

## Commit 0: Branch

- [x] 0.1 Create `feat/slice-2-capture-snooze` from `main` (rule 6). PR targets `main`.

## Commit 1a: `docs:` SG9 (~10 lines)

- [x] 1a.1 `docs/design/style-guide-decisions.md`: SG9 "5h48m" -> "5h48" (rule 14, own commit). Run `npm run verify`.

## Commit 1b: `docs:`+`test:` CONTRACT first (~130 lines)

- [x] 1b.1 RED: `packages/shared/test/dst.test.ts` per Decision 18: gap `02:30`, `today 02:30`, `tomorrow 02:30` on Sun 2026-03-08 America/New_York -> 07:00Z; Tomorrow 9:00 across spring and fall; overlap `01:30` on 2026-11-01 -> 05:30Z (first occurrence, EDT). Record red or green before touching `time.ts`.
- [x] 1b.2 RED: tests for R9 (done-on-done keeps first `done_at`; done without reminder is an error), R11 (`today HH:MM` accepted when past; `+Nm`) in `packages/shared/test/`.
- [x] 1b.3 `docs/CONTRACT.md`: update R9, R11, R16 text first (rule 23).
- [x] 1b.4 GREEN: fix `packages/shared/src/domain/time.ts` `localTimeOn` (offsets at day start/end, earliest round-trip, bisect gap) only if 1b.1 is red; adjust `parseCapture`/`markDone` only if 1b.2 is red.

## Commit 1c: Timezone, errors, PATCH /me (~200 lines)

- [x] 1c.1 RED: `packages/shared/test/timezone.test.ts` (`isValidTimeZone`, `CAPTURE_LIMITS`); GREEN `packages/shared/src/timezone.ts`, export in `index.ts`.
- [x] 1c.2 RED: `apps/api/test/set-timezone.test.ts` (UTC -> zone; non-UTC no-op returns stored; bad zone 400; missing profile 404) with fakes in `test/fakes.ts`.
- [x] 1c.3 GREEN: `application/errors.ts` (`ValidationError`, `NotFoundError`, `ConflictError(reason)`), `ports.ts` `setTimezoneIfDefault`, `set-timezone.ts`.
- [x] 1c.4 RED: `server.test.ts` for `PATCH /me` (200/400/401/404, preflight allows PATCH, malformed JSON 400, 500 hides internals); GREEN error handler and route in `http/server.ts`.
- [x] 1c.5 GREEN: `postgres-profile-repository.ts` single-statement conditional update; wire `main.ts`.
- [x] 1c.6 RED then GREEN: `apps/web/src/lib/api.ts` `request/patch` (401 typed, `Content-Type` only with body); `lib/browser-timezone.ts`.
- [x] 1c.7 RED then GREEN: `TodayContainer` tz sync (only from UTC, once per mount, silent failure, 401 -> `onSessionExpired`, invalidate `['today']`).
- [ ] 1c.8 Manual checklist (record in PR): conditional timezone update on local Supabase (UTC -> zone; second call is a no-op).

## Commit 2: Reminder actions API (~340 lines)

- [ ] 2.1 RED then GREEN: shared `instant.ts` (codec moved from `today.ts`), `notes.ts` `noteResponseSchema`, `snoozeRequestSchema`; tests in `notes.test.ts`.
- [ ] 2.2 RED: `apps/api/test/reminder-actions.test.ts`: +1 h from 09:05 -> 10:05 count 1 (C5); Tomorrow 9:00 across DST (C6); done sets `done_at`; done-on-done and undo-on-open no-ops; snooze on done/no-reminder and done on no-reminder -> `ConflictError`; unknown/other-user id -> `NotFoundError`.
- [ ] 2.3 GREEN: `ports.ts` `mutateReminder`; `snooze-note.ts`, `mark-done.ts`, `undo-done.ts` (state checks before domain calls).
- [ ] 2.4 RED then GREEN: `server.test.ts` routes `POST /notes/:id/{snooze,done,undo}`: 401, 400, 404 (incl. non-UUID), 409, 200 round-trips schema.
- [ ] 2.5 GREEN: `postgres-note-repository.ts` `mutateReminder` (`for update`, update only if changed); `database.ts` update shapes; wire `main.ts`.
- [ ] 2.6 Manual checklist (record in PR): two parallel snoozes end at `snooze_count = 2`; other user's id -> 404.

## Commit 3: Capture API (~340 lines)

- [ ] 3.1 RED: `notes.test.ts` `captureRequestSchema` (title 200/201, slug 40/41, 11 tags, duplicate slugs, seconds truncated, past `dueAt`); GREEN schema.
- [ ] 3.2 RED: `apps/api/test/capture-note.test.ts` (names via `tagNameFromSlug`, dedupe, `due_at = original_due_at`, null due, C1 preview equals save); GREEN `capture-note.ts`, `ports.ts` `createOwn`.
- [ ] 3.3 RED then GREEN: `server.test.ts` `POST /notes`: 401, 400 (bad slug, empty/oversize title), 201 shape; route.
- [ ] 3.4 GREEN: `createOwn` adapter (one `asUser` transaction: tag upsert `do update set slug = tags.slug`, note, `note_tags`); `Database` insert shapes (`ColumnType`); wire `main.ts`.
- [ ] 3.5 Manual checklist (record in PR): `#client-a` reuses existing tag and keeps "Client A"; failed insert leaves no tag.

## Commit 4: Mutation layer (~360 lines, High)

- [ ] 4.1 Add `@testing-library/user-event` ^14 to `apps/web/package.json`.
- [ ] 4.2 RED: `packages/shared/test/today-patch.test.ts`: each change type, `otherCount` math, parity with `getToday` over `jorge-week`; GREEN `today-patch.ts` `applyReminderChange`.
- [ ] 4.3 RED: web tests for `post`, hooks (optimistic, `onSuccess` patch, rollback + message + refetch on 500/409/404, two queued writes where the first fails, mutation 401 -> `onSessionExpired` once without error line, invalidate only when last in flight).
- [ ] 4.4 GREEN: `lib/api.ts` `post`; `features/today/mutations/*` (`scope: {id:'today'}`, `retry: 0`); `ActionMessage.tsx`; `messages.errors`.
- [ ] 4.5 Run `npm run build -w @onti/web`; record bundle size in the PR.

## Commit 5: Keyboard and row actions (~400 lines, High)

- [ ] 5.1 RED then GREEN: `focus.ts` (`orderedIds`, `step`, `afterRemoval`); `keys.ts` reducer (`s`, `s h`, `s t`, `s x`, `esc`, typing ignored) and `availableKeys`.
- [ ] 5.2 RED then GREEN: `use-keyboard-layer.ts` with `user-event` (ignored in inputs, with modifiers, or while bar/sheet open).
- [ ] 5.3 RED then GREEN: `format.originalLabel`; `ItemRow` "{time} · was {original} · {count}×", row `aria-label` from `messages.today.rowLabel`, roving tabindex.
- [ ] 5.4 RED then GREEN: `WhichKey` (resulting times, `--motion-whichkey-delay`); `Statusline` `hints` for working keys only.
- [ ] 5.5 CSS: strike/fade only for `justChanged` id, tokens only; focus ring; messages. Run `npm run build -w @onti/web`; record bundle size.

## Commit 6: Command bar (~360 lines)

- [ ] 6.1 RED then GREEN: `capture-preview.ts` `previewCapture` (C1 text "→ Client A · today 17:00 · in 5h48"; "→ note, no reminder"; invalid cases).
- [ ] 6.2 RED: `CommandBar` tests: ↵ blocked when invalid; empty/201-char title keeps bar open with hint; esc closes; fade uses `--motion-fade` only; lazy chunk renders.
- [ ] 6.3 GREEN: `CommandBar` (`React.lazy`), `messages.capture.*`, CSS.
- [ ] 6.4 RED then GREEN: optimistic insert with temp id, `data-pending`/`aria-busy` dashed rail then solid via `replacesId`, rollback removes row, failed capture reopens typed text; `c` key.
- [ ] 6.5 `npm run build -w @onti/web`; record main and lazy chunk sizes in the PR.

## Commit 7: Mobile + CONTRACT status (~320 lines)

- [ ] 7.1 RED then GREEN: `MobileBar` with only "+ Capture" (>= `--size-target`, CSS breakpoint, no Search/Tags).
- [ ] 7.2 RED then GREEN: preset row inserting tokens (`today 17:00` hidden at or after 17:00 [assumption], `+1h`, `tomorrow 9:00`, `#slug` chips from visible tags).
- [ ] 7.3 RED then GREEN: `ActionSheet` on row tap, same callbacks as keys, resulting times equal `WhichKey`.
- [ ] 7.4 Docs: `docs/CONTRACT.md` verification status for C1, C3, C5, C6.
- [ ] 7.5 Manual smoke (record in PR): capture `#client-a 17:00 Call back`, `s h`, `x`, `z`, mobile action sheet, reduced motion, light/dark, no horizontal scroll. Record final bundle size.

## PR task

- [ ] P.1 Ask the human before pushing (rule 6). Open PR to `main` with label `size:exception`, commit-by-commit reading guide, manual checklists, bundle sizes (baseline 569 kB), and the unconfirmed 17:00 preset default.
- [ ] P.2 Merge only with green "Verify and build".
