# Notes & Reminders

[![CI](https://github.com/JorgeAdd/onti-notes-reminders/actions/workflows/ci.yml/badge.svg)](https://github.com/JorgeAdd/onti-notes-reminders/actions/workflows/ci.yml)

A notes app where a note and its reminder are **one object**. It is built for a
developer juggling several projects who captures follow-ups mid-call or
mid-review: in separate apps the note has no due time and the reminder has no
context, so things get buried (the brief's real example: a permissions change
that happened three days late). Here you type one line, get the note, its tags
and its reminder, and every morning see only what matters today.

## Live demo

- App: https://onti-notes-reminders.vercel.app
- API health: https://api-production-810ca.up.railway.app/health
- Demo account (public on purpose, for reviewers):
  - Email: `demo.jorge@onti-notes.dev`
  - Password: `Demo-Notes-2026!`

Sign-up is open and needs no email confirmation (ADR-001). The demo account is
seeded with the 15-note scenario from `docs/product/scenario-dataset.md`, so
today plays "Wed 7": 2 carried, 2 due today, 11 other notes.

## Features

| Area          | What you get                                                                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Today         | A day page: overdue items carried at the top ("Still open from Tue 6"), today's items on an hour rail with a now line, "{n} other notes" count, relative times ("late 15h05", "in 25 min")                          |
| Capture       | One-line command bar (`c`): `#tag` and a time (`17:00`, `today 08:00`, `tomorrow 9:00`, `+30m`, `+2h`) parsed inline, with an italic preview before ↵; on phones, presets and tag chips                             |
| Reminders     | Done / undo, snooze `+1 h` or `Tomorrow 9:00`, optimistic updates, DST-safe "today" in the profile timezone                                                                                                         |
| Days and tags | Previous / next day, back to today, a tag filter with "{n} notes" and "{n} notes hidden"                                                                                                                            |
| All notes     | Word-prefix full-text search on title and body, excerpts, tag filter, newest first                                                                                                                                  |
| Notes         | A note view with a sanitized markdown body (raw HTML is shown as text), edit title, body and tags, reschedule or remove the reminder, delete with an inline confirm; a "Without a reminder" list in the date column |
| Notifications | Opt-in Web Push: one notification per due time, with Done and +1 h actions that work with the app closed                                                                                                            |
| Look and feel | Light, dark or system theme; a quiet page entrance; reduced motion respected; 44 px targets; keyboard-first on desktop, touch-first on phones                                                                       |
| Help          | Press `?` (or tap the "?" button) for "How it works"                                                                                                                                                                |

## Keyboard shortcuts

The in-app help (`?` on Today) is the full reference; it is built from the same
definitions as the key handlers (`apps/web/src/features/today/keys.ts`).

| Key                | Action                                             |
| ------------------ | -------------------------------------------------- |
| `c`                | Capture a note (esc cancels)                       |
| `j` / `k`          | Move focus between items                           |
| `x` / `z`          | Done / undo                                        |
| `s` then `h` / `t` | Snooze +1 h / tomorrow 9:00                        |
| `e`                | Edit the focused note                              |
| `[` / `]`          | Previous / next day                                |
| `t`                | Back to today (from another day)                   |
| `#`                | Filter by tag (esc clears)                         |
| `/`                | All notes and search                               |
| `d`                | Delete, in the note view (↵ confirms, esc cancels) |
| `?`                | How it works                                       |

## Architecture

```
  Browser (React + Vite, Vercel)            Supabase
  ┌──────────────────────────────┐          ┌─────────────────────┐
  │ apps/web                     │── login ─▶│ Auth (issues JWT)   │
  │  Today, All notes, note view │          └─────────────────────┘
  │  service worker (Web Push) ◀─┼── push ──┐
  └──────────────┬───────────────┘          │
                 │ HTTPS + JWT               │
  ┌──────────────▼───────────────────────┐  │  ┌─────────────────────┐
  │ apps/api (Fastify, Railway)           │  │  │ Postgres            │
  │  infrastructure → application → domain├──┼─▶│ RLS as user         │
  │  JWKS verify · Kysely · 30 s scheduler│──┘  │ supabase/migrations │
  └──────────────────────────────────────┘     └─────────────────────┘
            ▲                    ▲
            └── packages/shared ─┘   zod schemas + pure CONTRACT rules (no IO)
```

- **Supabase Auth issues the JWT; our own API does everything else** (ADR-001).
  The API verifies every token via JWKS and runs queries as `authenticated`, so
  row level security is a second lock.
- **Hexagonal API** (ADR-002): `domain` (pure rules) ← `application` (use cases,
  ports) ← `infrastructure` (Fastify, Postgres, JWKS, Web Push, clock). Time
  only comes from a `Clock` port, so tests stand at Wed 09:05.
- **`packages/shared`**: zod schemas and the CONTRACT time rules, used by both
  apps, so the capture preview and the API compute the same thing.
- **A note and its reminder are one row** (ADR-003): UTC instants plus the
  user's IANA timezone; "today" is computed from local midnights (DST-safe).
- **Web Push** (ADR-002, ADR-004): an in-process 30 s scheduler claims due
  reminders once per due time (`FOR UPDATE SKIP LOCKED`) and sends them with
  `web-push`. Notification actions use a short-lived signed token, so Done and
  +1 h work with the app closed.

## Running locally

Requires Node 22+ and a Supabase project (the hosted one, or your own with the
migrations in `supabase/migrations/` applied).

1. Install:

   ```sh
   npm ci
   ```

2. Create `apps/api/.env` and `apps/web/.env` from their `.env.example` files.
   The variables each app reads:

   | App | Variable                                                                                         | Notes                                                   |
   | --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
   | API | `SUPABASE_URL`, `DATABASE_URL`                                                                   | Required                                                |
   | API | `CORS_ORIGINS`                                                                                   | Comma-separated, e.g. `http://localhost:5173`           |
   | API | `PORT`                                                                                           | Optional, default `3000`                                |
   | API | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_ACTION_SECRET`, `API_PUBLIC_URL` | Optional, all or none; without them push stays off      |
   | Web | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_URL`                             | Required                                                |
   | Web | `VITE_VAPID_PUBLIC_KEY`                                                                          | Optional; without it the notification control is hidden |

3. Start the API and the web app (two terminals):

   ```sh
   npm run dev -w @onti/api
   npm run dev -w @onti/web
   ```

   The API listens on `PORT` (default 3000; check it with `/health`); Vite
   serves the web app on http://localhost:5173, or the next free port.

4. Seed the demo scenario into an existing account (sign up first). It is a dry
   run by default and prints the plan; add `--yes` to write:

   ```sh
   npm run seed:demo -w @onti/api -- --email demo.jorge@onti-notes.dev
   ```

   Options: exactly one of `--email` or `--user-id <uuid>` (it refuses unless
   exactly one user matches); `--timezone <IANA>` also sets the account's
   timezone (pass it on the first run, or a `UTC` profile shifts "today");
   `--remove --yes` deletes exactly the seeded notes. Re-running is safe: ids are
   deterministic, and a later day re-anchors the dates so today plays Wed 7.

## Quality

```sh
npm run verify
```

Prettier check → ESLint (type-aware) → typecheck → tests, in every workspace.
It runs in the pre-commit hook and again in GitHub Actions (plus the
production build, `npm run build`) on every push and pull request. Railway
deploys `main` only after the checks pass; Vercel deploys `main` on push.

- **CONTRACT tests**: every rule and matrix row of `docs/CONTRACT.md` is
  asserted, mostly on the scenario dataset with an injected clock (one block
  per row in `packages/shared/test/contract.test.ts`, plus the files listed in
  the CONTRACT's "Verification status"), including DST cases.
- About 1,700 tests across `apps/api`, `apps/web` and `packages/shared`.
  Real-Postgres suites (`*.pg.test.ts`) run when `ONTI_TEST_DATABASE_URL`
  points at a throwaway database.

## How it was built

- **Sources of truth first.** `docs/CONTRACT.md` (behavior, with exact numbers
  from the scenario), `supabase/migrations/`, `docs/adr/` and `docs/design/` come
  before code; when code and a source disagree, the source is fixed first, in
  its own commit.
- **Vertical slices with SDD.** Each slice in `docs/roadmap.md` ran as one
  spec-driven change (proposal → specs → design → tasks → apply → verify →
  archive) under `openspec/`; finished changes are in
  `openspec/changes/archive/` and the merged specs in `openspec/specs/`.
- **Strict TDD.** Every task wrote a failing test first; `npm run verify` passed
  on every commit.
- **AI-assisted, human-owned.** `CLAUDE.md` lists the rules for working with AI
  (and why). The prompts are a deliverable: every prompt is saved in
  `prompts/antes/` (before), `prompts/durante/` (during) and
  `prompts/despues/` (after). AI memory is shared through `.engram/` (Engram,
  this project only, scanned for secrets on commit).
- **Time** per day and stage is logged in `docs/time-log.md`.

## Documentation

| Doc                                                                            | What it holds                                                                          |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| [`docs/product/brief.md`](docs/product/brief.md)                               | Problem, persona, key moments, v1 scope                                                |
| [`docs/product/scenario-dataset.md`](docs/product/scenario-dataset.md)         | The 15-note scenario behind every number                                               |
| [`docs/CONTRACT.md`](docs/CONTRACT.md)                                         | Behavior rules R1–R20 and the event matrix, with test evidence                         |
| [`docs/adr/`](docs/adr/)                                                       | ADR-001 auth, ADR-002 stack, ADR-003 data model and time, ADR-004 signed action tokens |
| [`docs/db/schema.md`](docs/db/schema.md)                                       | Database schema                                                                        |
| [`docs/design/style-guide-decisions.md`](docs/design/style-guide-decisions.md) | SG1–SG20, with boards in `docs/design/chosen/`                                         |
| [`docs/roadmap.md`](docs/roadmap.md)                                           | Slices and their status                                                                |
| [`docs/backlog.md`](docs/backlog.md)                                           | Deferred items and v2                                                                  |
| [`docs/audit-v1.md`](docs/audit-v1.md)                                         | Final v1 audit                                                                         |
| [`docs/time-log.md`](docs/time-log.md)                                         | Hours per day and stage                                                                |
| [`CLAUDE.md`](CLAUDE.md)                                                       | Rules for working with AI on this project                                              |
