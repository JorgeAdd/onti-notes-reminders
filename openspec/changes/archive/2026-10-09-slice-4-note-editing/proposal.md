# Proposal: Slice 4 — Note editing and markdown

## Intent

Finish the note lifecycle: capture exists (slice 2), but a note cannot be opened, edited, rescheduled, cleared or deleted, and bodies are never rendered. Serves `docs/roadmap.md` (Slice 4), CONTRACT R8, R14, R15/C11, R19/C13/C14, R20, ADR-002, SG10, SG20. Decisions are final and cited, not restated: rescheduling a done note reopens it (R8 amended first, rule 23); last write wins, permanent delete, editable title, body (may be empty) and tags via `#slug` with server-derived names (all R20); no deep link (`?note=` goes to backlog); no migration.

## Scope

### In Scope

- **PR1 (read side):** `createdAt` on the shared note wire type; R19 undated list in `GET /today` with optimistic parity (capture without a time); `GET /notes/:id` with the C11 `404`; lazy markdown chunk (ADR-002) with http/https/mailto allowlist, no images, `rel="noopener noreferrer"`; excerpt marker stripper; read-only note view in All notes, opened from All notes rows and "Without a reminder" rows.
- **PR2 (write side):** `PATCH` and `DELETE /notes/:id` (R20); edit mode (`e` / Edit button); R8 reschedule and remove; inline delete confirm (`d` / Delete button); `e` on a focused Today row (opens in edit); query invalidation.

### Out of Scope

Deep link or URL state; soft delete; versioning or conflict detection; migrations; push notifications (slice 6); body-in-notification stripping beyond the shared stripper.

## Capabilities

### New Capabilities

- `note-view`: read-only note view in All notes, entry points, esc behavior, fetch by id.
- `note-editing`: edit title, body, tags; reschedule, remove reminder; delete confirm; `e`/`d` keys.
- `markdown-rendering`: sanitized lazy render, link rules.
- `undated-list`: "Without a reminder" list (desktop) and link (mobile).

### Modified Capabilities

- `today-page`: `/today` gains `undated`; `e` on a Today row.
- `notes-search`: excerpts strip markdown markers; rows open the note view.
- `reminder-actions`: R8 reschedule/remove, undated optimistic insert.

## Approach

Hexagonal as usual: pure helpers in `packages/shared/src/domain` (clear-reminder, undated selection), use cases in the API, thin routes. Undated is computed in JS from the already-loaded own notes (created desc, title, id). Note view is App state `{view:'notes', noteId}`, esc closes it first. Markdown loads via dynamic import in the note view.

## Delivery

Two PRs under this one change, both over the review budget and labelled `size:exception` (delivery_strategy `exception-ok`, decided by the human; no chain):

- **PR1, read side:** about 1,825 changed lines including tests (design slices 1a + 1b + 1c).
- **PR2, write side:** about 1,660 changed lines including tests (design slices 2a + 2b + 2c).

Each PR is a series of work-unit commits that each leave `npm run verify` green, read commit by commit (strict TDD). Sources first (rule 14): SG20 and its recorded deviation (no board) and CONTRACT R20 are already on the branch, in their own docs commits, before PR1. R20 is documented now and marked `todo`; PR2 adds its tests and moves it to proven (rule 23). Deploy the API (Railway) before the web (Vercel) for each PR. PR1 merges before slice 6 (shared wire type); slice 6 stays in new files and rebases.

Ownership vs slice 6: slice 4 owns `/notes/:id` routes, `NoteRecord`/`NoteResponse`, undated, markdown; slice 6 owns `/push/*`, scheduler (own port, repo, fake), service worker, VAPID config, any migration.

## Affected Areas

| Area                                                                           | Impact       |
| ------------------------------------------------------------------------------ | ------------ |
| `packages/shared` (notes, reminder, today-patch)                               | Modified     |
| `apps/api` server, ports, repo, fakes, `domain/excerpt.ts`                     | Modified/New |
| `apps/web` App, DateColumn, notes feature, `features/note/*`, messages, api    | Modified/New |
| `docs/CONTRACT.md` (R8, R20, verification status), SG10/SG20, roadmap, backlog | Modified     |

## Risks

| Risk                      | Likelihood | Mitigation                                                   |
| ------------------------- | ---------- | ------------------------------------------------------------ |
| `createdAt` fixture churn | High       | Update fixtures in one TDD step first                        |
| Undated optimistic parity | Med        | Extend `day-parity.test.ts`                                  |
| Markdown chunk size       | Med        | Lazy chunk; main chunk unchanged; check build output         |
| 204 in web request helper | Med        | Test and fix helper first                                    |
| PR over the review budget | High       | Accepted `size:exception`; work-unit commits read one by one |

## Rollback Plan

Revert PR2 alone (write side; no schema change), then PR1 if needed. No migration or data change; hard-deleted notes are not recoverable by design.

## Dependencies

Slices 1-3, 5 merged. R8 text, SG10 `e`/`d`, SG20 (recorded deviation) and R20 already landed.

## Success Criteria

- [ ] R19/C13/C14, C11, C10, R8 and R20 covered by tests; CONTRACT verification status updated.
- [ ] Main chunk size unchanged; markdown lazy.
- [ ] Both PRs labelled `size:exception`; every commit and "Verify and build" green; Railway deployed before Vercel.
