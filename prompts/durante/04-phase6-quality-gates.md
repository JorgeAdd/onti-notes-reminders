# durante/04 — Phase 6: quality gates

**Intent:** lint, format, tests, `npm run verify`, CI, and CONTRACT tests
before any feature.
**Outcome:** the AI hit a real conflict (TypeScript 7 unsupported by
typescript-eslint) and pinned TS 6.0 with the reason in ADR-002. Type-aware
lint found real bugs (unhandled promises, `FormData` values that can be
`File`). Time rules moved to `packages/shared` as pure functions so web and
API share them. CONTRACT tests: one per matrix row + DST; a deliberate-bug
check (duration padding, `+24 h` day) made 6 tests fail before restoring.
`verify` runs in the pre-commit hook and in GitHub Actions.

## Prompt

> yes, start phase 6
