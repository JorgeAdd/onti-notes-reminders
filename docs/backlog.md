# Backlog

Deferred items and future enhancements, sourced from slice 1 verification and design.

## Deferred from Slice 1

### Manual theme override UI

Design decision 14 noted; UI deferred to future slice. Moved from Slice 4 to Slice 8 (page entrance and theme override), because the stored theme must apply before the entrance's first paint (`docs/design/landing-brief.md`, decisions 22–30).
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

## Deferred from Slice 8

### Theme sync across devices

The theme override is stored per device in `localStorage`. Syncing it through the profile (a new column, an API field and a merge rule against the local value) is future work.
_Source: `docs/design/landing-brief.md`, decision 23_

### Real-action tests for the entrance no-replay scenarios

The optimistic-update and theme-change scenarios re-render the sheet instead of running the real action on a mounted `DayPage`. Add a real-action test for each.
_Source: slice 8 verify report_

### Entrance clearing without `getAnimations`

The entrance attribute clears on `animationend` through `getAnimations({ subtree: true })`, which is stubbed in jsdom only. Browsers without `getAnimations` clear on the first `animationend`. Confirm in a real browser.
_Source: slice 8 verify report_

### Keyboard focus ring on the segmented theme control: browser check

The headless screenshots at 1280 and 375 px did not show the keyboard focus ring on the segmented theme control. Check Tab focus in a real browser, light and dark.
_Source: slice 8 archive report_

## Deferred from Slice 9

### SG10 lists `↵` open/fold body, but no Today key does it

SG10 includes `↵` open/fold body. No key handler on Today implements it (Enter only works on a native button), so this is drift that predates slice 9. The help follows the code and omits it. Either implement the key or drop it from SG10.
_Source: slice 9 design, risks and contradictions_

## Deferred from Slice 4

### Manual smoke of PR1 and PR2 (pending)

The maintainer has not run the manual smoke yet (2026-10-09). PR1: 1280x720 and 375x667, light and dark, reduced motion, C13 list, open and `esc`, C10 body, no horizontal scroll. PR2: both viewports, edit, empty-body save, reschedule onto today (counts), remove reminder, delete confirm and cancel, `e` from Today.
_Source: slice 4 verify reports PR1 and PR2 (tasks 1.9.2 and 2.9.2)_

### App-level test for Today after a write

No test renders Today after a write and checks the counts and the undated list. Add one App-level test: reschedule an undated note, Today shows it on the rail with the undated count minus one and the header count plus one; then remove the reminder and see it back in the list. It also closes the three PARTIAL PR2 scenarios.
_Source: slice 4 verify report PR2, WARNING 1_

### App-level test for an old undated note from Today and refresh

The PR1 scenarios "Old undated note" (opened from Today) and "Refresh" (a fresh render lands on Today) are tested in halves only. Add one App-level test that drives a Today row to the note view and one that asserts the landing page after a fresh render.
_Source: slice 4 verify report PR1, WARNING 3_

### Capture-flow and note-open-flow timing flake

`note-open-flow` tests carry a 20 s timeout because they flake at 5 s under load. The `capture-flow` tests have no such override and carry the same risk. Align the timeouts or find the slow step.
_Source: slice 4 verify reports PR1 and PR2, item 7_

### Deep link to a note (`?note=` URL state)

Deferred, not in slice 4. The note view opens from All notes, the "Without a reminder" list and `e` on Today, but its state is not in the URL: there is still no router, so a refresh returns to Today.
_Source: product decision, 2026-10-08 (prompt `prompts/durante/16-slices-4-and-6-in-parallel.md`)_

### Note view: check reach of the header buttons on phones

SG20 places Edit, Delete and Back in the view header at every width (one layout). If the manual smoke at 375x667 shows the header buttons are hard to reach one-handed, consider a touch bottom bar (it would need an SG20 change first).
_Source: slice 4 PR2 apply and verify_

### `esc` after `e` from Today lands in the All notes list

`e` on a Today row opens the note in edit mode; leaving it goes to the All notes list, not back to Today (the view state has no `from` field). A cheap follow-up if it feels wrong.
_Source: slice 4 design, accepted UX costs_

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
