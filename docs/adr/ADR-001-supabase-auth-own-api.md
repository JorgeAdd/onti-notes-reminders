# ADR-001 — Supabase Auth for identity, our own API for everything else

- Status: Accepted
- Date: 2026-10-06

## Context

The test requires JWT authentication, a deployed backend that the frontend
talks to in production, and a deployed relational database. Supabase can
provide auth and Postgres. If the frontend talked to Supabase directly,
there would be no backend of our own, which puts requirement 5 at risk and
leaves business rules (snooze, "today", notifications) in the browser.

## Decision

1. **Supabase Auth issues the JWT.** The web app signs users up and in with
   `supabase-js` (email + password). We never handle passwords.
2. **The web app talks only to our API** (`apps/api`) for data, sending
   `Authorization: Bearer <access token>`.
3. **The API verifies every token** with `jose` against the project's JWKS
   (`https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`), checking
   signature, `iss` (`https://<ref>.supabase.co/auth/v1`), `aud`
   (`authenticated`) and expiry. This requires **asymmetric JWT signing
   keys** to be enabled in the Supabase project (the JWKS endpoint is empty
   otherwise). Any failure → `401`.
4. **Supabase Postgres is the database**, accessed by the API over a direct
   Postgres connection.
5. **Defense in depth with RLS.** Every table has RLS policies scoped to
   `auth.uid()`. The API runs each user request in a transaction with
   `set local role authenticated` and `request.jwt.claims` set to the
   verified claims, so a missing `where user_id = …` in a query still
   cannot read or write another user's rows. Only the reminder scheduler
   runs with the owner role, because it works across users.
6. **The Data API is closed to the browser:** the `public` schema is
   removed from Supabase's exposed schemas, and `anon` has no table
   privileges.

## Consequences

- One extra service to deploy (Railway), in exchange for a real backend,
  testable business rules and a clean hexagonal boundary.
- Token verification needs no shared secret; keys rotate through JWKS.
- Each user request costs one transaction plus two `set` statements.
- Verified locally against the migration: another user sees 0 notes,
  updates 0 rows, and a spoofed insert is rejected by RLS.
- **Email confirmation is off** (2026-10-07). Supabase's built-in email
  service only delivers to project team members and a few emails per hour,
  so reviewers could not confirm sign-ups. Trade-off: anyone can sign up
  with an address they do not own. Re-enabling it needs a custom SMTP
  provider (e.g. Resend).
- A public demo account exists for reviewers (credentials in README.md).
- Verified on the real project (2026-10-07): sign-up → ES256 token →
  local API `GET /me` → profile read as `authenticated` through RLS.

## Alternatives considered

- **Own JWT auth** (argon2 + access/refresh tokens): shows more backend
  work, but costs time and adds security surface (password storage,
  resets, email verification) with no product value for this test.
- **Frontend → Supabase directly (PostgREST + RLS):** fastest, but no
  backend of our own and business rules in the client.
