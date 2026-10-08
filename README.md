# Notes & Reminders

[![CI](https://github.com/JorgeAdd/onti-notes-reminders/actions/workflows/ci.yml/badge.svg)](https://github.com/JorgeAdd/onti-notes-reminders/actions/workflows/ci.yml)

A notes app where a note and its reminder are one object. Built for people
who capture follow-ups mid-call and need to see only what matters today.

> Status: Phase 6 — quality gates in place (lint, format, typecheck,
> CONTRACT tests, CI, auto-deploy). Next: features (Phase 7).

## Repository structure

```
apps/
  web/            Frontend (deployed to Vercel)
  api/            Backend API (deployed to Railway)
packages/
  shared/         Shared types and validation. No IO.
docs/
  product/        Product brief (source of truth for scenarios and data)
  design/         Chosen design boards, style guide decisions
  adr/            Architecture Decision Records (ADR-001..003)
  db/schema.md    Database schema (ERD + table notes)
  CONTRACT.md     Behavior rules + event matrix (source of truth for tests)
  time-log.md     Time spent per stage
prompts/
  antes/          Prompts used before implementation
  durante/        Prompts used during implementation
  despues/        Prompts used after implementation
supabase/
  migrations/     SQL migrations (source of truth for the schema)
scripts/          Repo scripts (Engram sync)
.husky/           Git hooks (Engram export/import)
.engram/          Shared AI memory chunks (this project only)
CLAUDE.md         Rules for working with AI on this project, and why
```

## Design

"Day page, keyboard-driven": a tear-off desk calendar page you read, and a
terminal-style command layer you act with. One accent (vermilion) marks
the date and nothing else.

- Boards: `docs/design/chosen/`
- Decisions: `docs/design/style-guide-decisions.md`
- Tokens: `apps/web/src/styles/tokens.css` (core + semantic layers)

## AI memory (Engram)

Decisions and discoveries from AI sessions are stored with
[Engram](https://github.com/Gentleman-Programming/engram) and shared
through `.engram/` (compressed chunks, this project only):

- `pre-commit` → `npm run engram:export`: exports new memories, scans them
  for secrets, and stages them.
- `post-merge` / `post-checkout` → `npm run engram:import`: loads chunks
  pulled from the remote.

Hooks are installed by Husky on `npm install` and skip silently when
Engram is not installed or in CI (`HUSKY=0`).

## Running locally

To be documented once the stack is set up (Phase 5).

## Seeding demo data

`npm run seed:demo -w @onti/api -- --email <email>` loads the 15-note scenario
of `docs/product/scenario-dataset.md` into one existing account, anchored so
that the account's current local day plays Wed 7 (2 carried, 2 due today,
1 due tomorrow, 11 other notes).

- Prerequisite: `DATABASE_URL` in the environment or `apps/api/.env`. The
  account must already exist (sign up first); the script never creates users.
- Target: exactly one of `--email <email>` or `--user-id <uuid>`. It refuses,
  writing nothing, unless exactly one user matches.
- Dry run by default: prints the plan (created / updated / unchanged, anchor
  date, timezone, target). Add `--yes` to write.
- `--timezone <IANA>` also sets the account's timezone (for example
  `America/Mexico_City`). Without it the profile timezone is used, and a `UTC`
  profile makes "today" the UTC day, so the page can look shifted. Pass it on
  the first run.
- Re-running is safe: ids are deterministic, so a repeat the same day changes
  nothing and a later day re-anchors the dates.
- `--remove --yes` deletes exactly the seeded notes (and seeded tags nothing
  else uses). Other rows are never touched; every write runs as that user, so
  row level security applies.

## Key decisions

- **Supabase Auth issues the JWT; our own API does everything else**
  (ADR-001). The API verifies tokens via JWKS and runs each request as
  `authenticated`, so Postgres RLS is a second lock.
- **Stack** (ADR-002): TypeScript, React + Vite (Vercel), Fastify with
  hexagonal layers (Railway), Supabase Postgres, Kysely, SQL migrations.
- **A note and its reminder are one row** (ADR-003). UTC instants plus the
  user's IANA timezone; "today" is computed per local day (DST-safe).
- **Behavior is a contract** (`docs/CONTRACT.md`): general rules proven by
  the brief's scenario with exact numbers, asserted by tests.

## Quality

`npm run verify` = Prettier check → ESLint (type-aware) → typecheck → tests.
It runs in the pre-commit hook and in GitHub Actions (plus the production
build) on every push and pull request.

- **CONTRACT tests** (`packages/shared/test/contract.test.ts`): one block per
  row of `docs/CONTRACT.md`, on the scenario dataset with an injected clock,
  including DST cases.
- **API tests** (`apps/api/test`): JWT verification (issuer, audience,
  expiry, foreign key, tampering) and HTTP contract (`401`, CORS, no leaked
  errors).
- **Deploys:** Railway deploys `main` only after the GitHub checks pass;
  Vercel deploys `main` on push.

## Deployment

| Part            | Where                                                             | URL                                         |
| --------------- | ----------------------------------------------------------------- | ------------------------------------------- |
| Frontend        | Vercel (`vercel.json`, built from the workspace root)             | https://onti-notes-reminders.vercel.app     |
| API             | Railway (`railpack.json` + `railway.json`, healthcheck `/health`) | https://api-production-810ca.up.railway.app |
| Database + Auth | Supabase (`supabase/migrations/`)                                 | project `onti-notes-reminders`              |

### Demo account

Public on purpose, for reviewers:

- Email: `demo.jorge@onti-notes.dev`
- Password: `Demo-Notes-2026!`

Sign-up is open and needs no email confirmation (see ADR-001).
