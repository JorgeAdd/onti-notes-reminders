# durante/01 — Supabase project, link and migrate (Phase 5 start)

**Intent:** connect the repo to the real Supabase project and apply the
schema.
**Outcome:** JWKS confirmed (ES256 asymmetric key already active);
Supabase CLI installed and linked (by me, interactive); migration applied.
The AI verified the remote schema (RLS, policies, grants, triggers) and
ran the Supabase security advisor, which found `handle_new_user()`
executable via RPC. Fixed with a new migration; advisor back to 0.

## Prompts

> I have an account and a project, the project is onti-notes-reminders,
> the account is linked to the Github account JorgeAdd.
> NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co

> Done! the DB looks good on Supabase
