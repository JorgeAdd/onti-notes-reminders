# durante/03 — Deploy API (Railway) and web (Vercel)

**Intent:** ship the hello world to production.
**Outcome:** the AI stopped before deploying on the work Railway account
and asked which account to use (personal chosen). API on Railway after 4
attempts: Railpack ignored `railway.json` commands → `railpack.json` start
command + root `build` script. Web on Vercel from the workspace root
(needed for `@onti/shared`). The Vercel CLI added `.env*` to `.gitignore`,
which would hide future `.env.example` files; removed. Production checks:
`/health` 200, `/me` 401 without token, 200 with the demo token (timezone
read through RLS), CORS preflight 204 for the Vercel origin.

## Prompts

> It works, push and continue with the deploy

> Logged in with my personal, continue

> Project created, can you link it up

> create it from the CLI
