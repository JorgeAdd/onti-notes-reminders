# Notes & Reminders

A notes app where a note and its reminder are one object. Built for people
who capture follow-ups mid-call and need to see only what matters today.

> Status: Phase 5 — hello world deployed end to end (sign in → API verifies
> the JWT → Postgres through RLS). Next: quality gates (Phase 6).

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

## Deployment

| Part     | Where | URL |
|----------|-------|-----|
| Frontend | Vercel (`vercel.json`, built from the workspace root) | https://onti-notes-reminders.vercel.app |
| API      | Railway (`railpack.json` + `railway.json`, healthcheck `/health`) | https://api-production-810ca.up.railway.app |
| Database + Auth | Supabase (`supabase/migrations/`) | project `onti-notes-reminders` |

### Demo account

Public on purpose, for reviewers:

- Email: `demo.jorge@onti-notes.dev`
- Password: `Demo-Notes-2026!`

Sign-up is open and needs no email confirmation (see ADR-001).
