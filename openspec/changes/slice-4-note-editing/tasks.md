# Tasks: Slice 4 — Note editing and markdown

## Review Workload Forecast

| Field                   | Value                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Estimated changed lines | PR1 ~1,825 (design slices 1a + 1b + 1c); PR2 ~1,660 (2a + 2b + 2c); incl. tests          |
| 400-line budget risk    | High (both PRs, also over 800)                                                           |
| Chained PRs recommended | No (human chose two PRs, Engram #1141; commit-by-commit reading replaces a chain)        |
| Suggested split         | PR1 read side → merge → PR2 write side from fresh `main`; each labelled `size:exception` |
| Delivery strategy       | exception-ok                                                                             |
| Chain strategy          | size-exception                                                                           |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

No chaining: PR2 branches from `main` after PR1 merges (`feat/slice-4-note-writing`). Sources already landed on this branch: SG20 and its recorded deviation, R20 (`todo`).

Global checks for every commit:

- RED test first, record the failure, then GREEN, then refactor. Tests and docs in the same commit.
- `npx prettier --write` on touched files; `npm run verify` green via the pre-commit hook (rule 22), never `--no-verify`. Conventional message, no AI attribution (rule 5). Stage by explicit path.
- CONTRACT verification status changes in the commit whose tests prove the row (rule 23).
- Web: tokens only, copy in `messages.ts`, 44 px targets, ink focus, no vermilion, no internal IDs (rules 8-13; SG20).
- Never push without asking (rule 6). Save prompts in `prompts/durante/` (rule 7).

### Suggested Work Units

| Unit | Goal                                      | PR  | Focused test command                        | Runtime harness                                        | Rollback boundary                                |
| ---- | ----------------------------------------- | --- | ------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| 1a   | Plain text, `createdAt`, `GET /notes/:id` | PR1 | `npm run test -w @onti/shared -w @onti/api` | `curl` local API `GET /notes/:id` (own 200, Ana 404)   | `plain-text.ts`, `excerpt.ts`, wire field, route |
| 1b   | Markdown chunk, read-only note view       | PR1 | `npm run test -w @onti/web`                 | `npm run dev`: open a note from All notes, `esc` twice | `features/note/*`, `AppView`, row buttons, deps  |
| 1c   | R19 undated list                          | PR1 | `npm run test` (all workspaces)             | `npm run dev`: C13 list, capture C14 without a time    | `undated.ts`, `/today.undated`, `UndatedList`    |
| 2a   | `PATCH`/`DELETE` API (R20, R8)            | PR2 | `npm run test -w @onti/shared -w @onti/api` | `curl` PATCH/DELETE (200, 204, 404, 401)               | use cases, repo methods, routes                  |
| 2b   | Web client and edit mode                  | PR2 | `npm run test -w @onti/web`                 | `npm run dev`: `e`, edit, save, `esc` discards         | `NoteEditForm`, `use-note-actions`, `api.ts` 204 |
| 2c   | Delete confirm, `e` on Today              | PR2 | `npm run test -w @onti/web`                 | `npm run dev`: `d ↵`, `d esc`, `e` on a Today row      | `StatuslineConfirm`, `keys.ts` edit command      |

## PR1 — read side (`size:exception`, ~1,825)

### Commit 1.1 `feat(api): strip markdown markers from excerpts` (1a)

- [x] 1.1.1 RED `packages/shared/test/plain-text.test.ts`: design Testing PR1 row 1 cases, 20000-char hostile input returns.
- [x] 1.1.2 GREEN `packages/shared/src/domain/plain-text.ts` (`markdownToPlainText`), export in `index.ts`.
- [x] 1.1.3 RED `apps/api/test/excerpt.test.ts` markers stripped; `search-notes.test.ts` `stag` finds `**staging**` (R13).
- [x] 1.1.4 GREEN `apps/api/src/domain/excerpt.ts` uses the helper.

### Commit 1.2 `feat(shared): createdAt on the note wire type` (1a)

- [x] 1.2.1 RED `packages/shared/test/notes.test.ts`: note without `createdAt` rejected; detail schemas, `NOTE_LIMITS.bodyMax` 20000.
- [x] 1.2.2 GREEN `shared/src/notes.ts`; `NoteRecord.createdAt`; repo selects `created_at`; `InMemoryNotes`; fixtures (`day-parity`, `server.test`, `today-fixture`, `api.test`, `capture-flow`, `search-*`); temp note `createdAt` in `use-reminder-actions.ts`.

### Commit 1.3 `feat(api): GET /notes/:id with the C11 404` (1a)

- [ ] 1.3.1 RED `apps/api/test/get-note.test.ts` and `note-route.test.ts`: 200 shape, Ana 404, non-UUID 404, 401 without and forged token.
- [ ] 1.3.2 GREEN `findOwn` (port, fake, Postgres with `tagsFor`), `application/get-note.ts`, route in `server.ts`, `main.ts` wiring.
- [ ] 1.3.3 `apps/api/test/postgres/note-detail.pg.test.ts` (RLS, tags; `ONTI_TEST_DATABASE_URL`, not in CI).
- [ ] 1.3.4 `docs/CONTRACT.md` Verification status: C11 `404` proven; drop it from "Still `todo`".

### Commit 1.4 `feat(web): lazy markdown body with the R14 allowlist` (1b)

- [ ] 1.4.1 Add `react-markdown`, `rehype-sanitize` to `apps/web/package.json` (check React 19 peers).
- [ ] 1.4.2 RED `apps/web/test/markdown-body.test.tsx`: C10 layers (a)-(c), hostile link table, rel and target, no images, plain fallback pending and on import failure; `bundle-split.test.ts`.
- [ ] 1.4.3 GREEN `features/note/{MarkdownBody,NoteBody}.tsx` (boundary, `PlainBody`).
- [ ] 1.4.4 `docs/CONTRACT.md`: C10 proven; drop it from "Still `todo`".

### Commit 1.5 `feat(web): read-only note view in All notes` (1b)

- [ ] 1.5.1 RED `api.test.ts` `fetchNote`; `query-client.test.ts` no retry on 404.
- [ ] 1.5.2 GREEN `lib/api.ts`, `lib/query-client.ts`.
- [ ] 1.5.3 RED `note-view.test.tsx` (loading, 404 + Back, 5xx retry, 401, content, `h1` focus, `esc` hint only), `note-open-flow.test.tsx` (row opens, `esc` keeps search, second `esc` Today, sign-out resets), `notes-row.test.tsx` button rows.
- [ ] 1.5.4 GREEN `features/note/{NoteContainer,NotePage,NoteStatusline}.tsx` + CSS, `query-keys.ts`, `AppView` in `App.tsx`, `NotesContainer`, `NoteList`, `NoteRow`, `messages.ts`.

### Commit 1.6 `feat(api): undated set in GET /today` (1c)

- [ ] 1.6.1 RED `packages/shared/test/undated.test.ts` (`selectUndated` C13 order, 9 with 8 rows, tiebreaks; `insertUndated`); `today.test.ts` `undated` required.
- [ ] 1.6.2 GREEN `shared/src/domain/undated.ts`, `todayResponseSchema`, `buildDayResponse(…, undated)`.
- [ ] 1.6.3 RED `apps/api/test/today.test.ts`: C13, C14, same set for `date`/`tag`, Ana isolated. GREEN `get-today.ts`.

### Commit 1.7 `feat(web): optimistic undated parity` (1c)

- [ ] 1.7.1 RED `today-patch.test.ts` and `apps/api/test/day-parity.test.ts`: capture without a time (C14), timed capture, filtered/other day, settle with `replacesId`, snooze/done/undo unchanged.
- [ ] 1.7.2 GREEN `applyReminderChange` insert branch via `insertUndated`.

### Commit 1.8 `feat(web): Without a reminder list and mobile link` (1c)

- [ ] 1.8.1 RED `undated-list.test.tsx` (C13 rows, "+ 1 more", empty, row opens note, more opens All notes, mobile link, 44 px/focus CSS); `capture-flow.test.tsx` C14 and rollback.
- [ ] 1.8.2 GREEN `features/today/UndatedList.tsx` + CSS, `DateColumn` slot and scroll, `DayPage`, `TodayContainer.onOpenNote`, `messages.undated`.
- [ ] 1.8.3 `docs/CONTRACT.md`: R19, C13, C14 proven (rows and test paths); drop from "Still `todo`" (R20 stays). `docs/roadmap.md`, `docs/backlog.md`.

### PR1 verify and smoke

- [ ] 1.9.1 `npm run verify` and `npm run build`; main-chunk gzip table vs `origin/main` (markdown only in the lazy chunk).
- [ ] 1.9.2 Manual smoke 1280x720 and 375x667, light/dark, reduced motion: C13 list, open/`esc`, C10 body, no horizontal scroll; screenshots in the PR (recorded deviation).
- [ ] 1.9.3 Open PR1 (after asking), label `size:exception`. Deploy order: Railway before Vercel. Vercel deploys `main` on push and Railway after checks, so ask the human how to sequence before merging.

## PR2 — write side (`size:exception`, ~1,660)

### Commit 2.1 `feat(shared): note update request and clearReminder` (2a)

- [ ] 2.1.1 RED `notes.test.ts`: `{}` rejected, blank title 400, `''` body ok, body 20001 rejected, U+0000, `dueAt` three states; `rules.test.ts` `clearReminder`, R8 reopen.
- [ ] 2.1.2 GREEN `noteUpdateRequestSchema`, `clearReminder` in `domain/reminder.ts`.

### Commit 2.2 `feat(api): update and delete note use cases` (2a)

- [ ] 2.2.1 RED `update-note.test.ts` (title/body, tags replaced with derived names, R8 reschedule, null clears, foreign 404, throw rolls back), `delete-note.test.ts`.
- [ ] 2.2.2 GREEN `NotePatch`, fake `updateOwn`/`deleteOwn`, `application/{update-note,delete-note}.ts`.

### Commit 2.3 `feat(api): PATCH and DELETE /notes/:id` (2a)

- [ ] 2.3.1 RED `note-write-route.test.ts`: 200, 400 cases, 404 (Ana, unknown, non-UUID), 401, DELETE 204 then 404, last write wins.
- [ ] 2.3.2 GREEN Postgres `updateOwn`/`deleteOwn`, routes, `main.ts`; `postgres/note-update.pg.test.ts` (orphan tags not listed, cascade, RLS).
- [ ] 2.3.3 `docs/CONTRACT.md`: R20 from `todo` to proven with these test paths (rule 23).

### Commit 2.4 `refactor(shared): readDue and parseTagList` (2b)

- [ ] 2.4.1 RED `tag.test.ts` `parseTagList`; capture tests `readDue` parity. GREEN `domain/{tag,capture}.ts`.

### Commit 2.5 `feat(web): DELETE and 204 in the api client` (2b)

- [ ] 2.5.1 RED `api.test.ts` (204 → `undefined`, 404, 401, no `Content-Type`). GREEN `request`, `updateNote`, `deleteNote`.

### Commit 2.6 `feat(web): edit mode in the note view` (2b)

- [ ] 2.6.1 RED `note-edit.test.tsx` (design Testing PR2 row 7, cache invalidation spies).
- [ ] 2.6.2 GREEN `NoteEditForm.tsx` + CSS, `use-note-actions.ts`, `NoteContainer` modes, `messages.ts`.

### Commit 2.7 `feat(web): inline delete confirm` (2c)

- [ ] 2.7.1 RED `note-delete.test.tsx` (`d`, `↵`, `esc` stays, 404 gone, no double fire, `d` elsewhere inert). GREEN `StatuslineConfirm.tsx`.

### Commit 2.8 `feat(web): e on a focused Today row opens edit` (2c)

- [ ] 2.8.1 RED `keys.test.ts`, `keyboard.test.tsx`, `today-edit-key.test.tsx`. GREEN `keys.ts`, `use-today-rows.ts`, `TodayContainer`, `App.tsx`; `docs/roadmap.md`, `docs/backlog.md`.

### PR2 verify and smoke

- [ ] 2.9.1 `npm run verify` and `npm run build`.
- [ ] 2.9.2 Manual smoke both viewports, light/dark: edit, empty body save, reschedule onto today (counts), remove reminder (back in list), delete confirm/cancel, `e` from Today.
- [ ] 2.9.3 Open PR2 (after asking), label `size:exception`; same Railway-before-Vercel sequencing question.
