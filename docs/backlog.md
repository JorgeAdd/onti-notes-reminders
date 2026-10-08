# Backlog

Deferred items and future enhancements, sourced from slice 1 verification and design.

## Deferred from Slice 1

### Manual theme override UI

Design decision 14 noted; UI deferred to future slice. Now assigned to Slice 4 (`docs/roadmap.md`).
_Source: slice 1 verify report_

### Automated proof for themes and mobile layouts

Manual screenshots (boards 05/11) completed; Playwright e2e test suite is separate work unit.
_Source: slice 1 verify report_

### Automated proof for keyboard focus ring and 44px targets

Static CSS validation in place; e2e test coverage deferred to backlog.
_Source: slice 1 verify report_

### DB integration test for seed RLS scope and Postgres adapter

Unit tests and manual verification passed; automated database-level integration test is future work.
_Source: slice 1 verify report_

## Deferred from Slices 3 and 5

### Filtered page empty state copy

A filtered page with zero matches reuses the generic empty state ("No notes yet"). It needs filter-specific copy (e.g. naming the tag) in the messages module, with a test.
_Source: slice 3 verify report_

### Mobile statusline layout

Mobile statusline hides the mode label (pre-existing behavior). "Thu 8" wraps on 375px devices without causing horizontal scroll. Cosmetic; low priority.
_Source: slice 3 verify report_

### CI Postgres job for search

`apps/api/test/postgres/search.pg.test.ts` (21 tests) is skipped in CI without ONTI_TEST_DATABASE_URL. Add a dedicated throwaway Postgres database step to CI to enable real-database verification in the pipeline.
_Source: slice 5 verify report_

### Seed body write path integration test

`apps/api/scripts/seed-demo.ts` body write path (`INSERT … EXCLUDED.body` upsert) has unit test coverage but no end-to-end database test. Recommend adding to a future integration test suite.
_Source: slice 5 verify report_

### Statusline tag truncation on mobile

375px statusline truncates the tag to `#c…` when the tag name is long. Cosmetic; measured in real-browser smoke. May resolve with future CSS refinements.
_Source: slice 5 verify report_

### Note markdown in excerpts

Search excerpts include markdown markers (e.g. `**bold**`) until slice 4 (note editing) adds markdown rendering. Planned for future work.
_Source: slice 5 verify report_

### C11 `404` for another user's note (slice 4)

CONTRACT C11's `404` half (another user's note by id) is still `todo`: `GET /notes/:id` does not exist yet. It ships with note editing in slice 4 (R15).
_Source: slice 5 verify report_

## Suggestions

### Bundle size optimization

JS bundle approaching 500 kB (569.49 kB, 162.85 kB gzip). Consider `zod/mini` variant or code splitting in next slice.
_Source: slice 1 verify report_

### CSS token migration

Literal 1px/2px border and 640px media values. Migrate to token layer in future refactoring for consistency.
_Source: slice 1 verify report_

### Data validation assertion

Add Monday assertion for N1 done/tomorrow transition in demo-scenario test to strengthen dataset validation.
_Source: slice 1 verify report_
