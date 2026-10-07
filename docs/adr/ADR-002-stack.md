# ADR-002 — Stack

- Status: Accepted
- Date: 2026-10-06

## Context

One developer, one week, AI-assisted. The product is an authenticated,
keyboard-first app (no SEO), with time-zone-sensitive business rules and a
background job (reminders). The architecture must make those rules easy to
test with an injected clock.

## Decision

| Concern          | Choice                                                                                                                              | Why                                                                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language         | **TypeScript** everywhere                                                                                                           | One language across web, API and the shared contract.                                                                                                                              |
| Monorepo         | **npm workspaces** (`apps/web`, `apps/api`, `packages/shared`)                                                                      | Built into npm; no extra tool for three packages.                                                                                                                                  |
| Shared contract  | **zod** schemas in `packages/shared`                                                                                                | One definition validates API input and types the web client. The package has no IO.                                                                                                |
| Web              | **React + Vite**, React Router, TanStack Query                                                                                      | A static SPA is enough behind a login; Vite is fast to build and deploy. TanStack Query handles cache, retries and optimistic done/snooze.                                         |
| Styling          | **Plain CSS (CSS Modules) + `tokens.css`**                                                                                          | The design system is already tokens; utility frameworks would hide the semantic layer.                                                                                             |
| Markdown         | **react-markdown** without raw HTML + **rehype-sanitize**                                                                           | Raw HTML is never rendered (CONTRACT R14); the sanitizer is a second lock.                                                                                                         |
| API              | **Fastify**                                                                                                                         | Small, fast, first-class TypeScript and schema hooks; less framework than NestJS so the hexagonal layers stay visible.                                                             |
| API architecture | **Hexagonal**: `domain` (pure rules) → `application` (use cases + ports) → `infrastructure` (Postgres, JWKS, Web Push, clock, HTTP) | Rules like "today", "late" and snooze are pure functions tested without IO.                                                                                                        |
| DB access        | **Kysely** (typed SQL builder)                                                                                                      | SQL stays visible; per-request transactions with `set local role` are straightforward (ADR-001).                                                                                   |
| Migrations       | **Supabase CLI SQL migrations** in `supabase/migrations/`                                                                           | Plain SQL is the documented schema; RLS, triggers and generated columns are native.                                                                                                |
| Time             | **date-fns + @date-fns/tz** (`TZDate`) behind a `Clock` port                                                                        | DST-correct local-day math. Node has no native `Temporal` (checked on Node 26). The rules are pure functions in `packages/shared/src/domain`, shared by web and API.               |
| Reminders        | **Scheduler loop inside the API process**, every 30 s, `select … for update skip locked`                                            | No extra service; safe if the API scales to more instances. Latency ≤ 30 s.                                                                                                        |
| Push             | **web-push** (VAPID) + a service worker in the web app                                                                              | Standard Web Push; no third-party push service.                                                                                                                                    |
| Tests            | **Vitest** (unit + integration), Testing Library, **Playwright** (e2e smoke)                                                        | One runner for all packages; integration tests against a real Postgres.                                                                                                            |
| Quality          | ESLint (type-aware, `typescript-eslint`) + Prettier, `npm run verify` in the pre-commit hook and in GitHub Actions                  | One command defines "green".                                                                                                                                                       |
| TypeScript       | **Pinned to `~6.0`**                                                                                                                | TypeScript 7 (native compiler) is out, but `typescript-eslint` supports `<6.1`; type-aware lint rules caught real bugs (floating promises) on day one. Revisit when it supports 7. |
| Hosting          | Web → **Vercel**; API → **Railway**; DB + Auth → **Supabase**                                                                       | Vercel was suggested by the test; Railway runs a long-lived Node process (needed for the scheduler).                                                                               |

## Consequences

- Two deploy targets plus Supabase. Environment variables are documented in
  each app's `.env.example`.
- The scheduler lives with the API: if the API sleeps, reminders are late.
  Railway's opt-in sleeping/serverless mode must stay disabled for the API
  service (to confirm during the Phase 5 deploy).
- Kysely types come from the database schema, so migrations stay the source
  of truth.

## Alternatives considered

- **Next.js** for the web: SSR and server actions add nothing behind a
  login and would tempt us to bypass our own API.
- **NestJS**: good structure, but its modules/decorators would hide the
  hexagonal layers we want to show.
- **Drizzle/Prisma**: schema defined in TypeScript duplicates the SQL
  migrations; RLS and triggers still need raw SQL.
- **pg_cron + Edge Function** for reminders: moves business rules into a
  second runtime that is harder to test with an injected clock.
