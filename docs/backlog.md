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
