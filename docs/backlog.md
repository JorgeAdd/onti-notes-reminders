# Backlog

Deferred items and future enhancements, sourced from slice 1 verification and design.

## Deferred from Slice 1

### Manual theme override UI

Design decision 14 noted; UI deferred to future slice.
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
