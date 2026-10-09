# despues/02 — Final README

**Intent:** rewrite `README.md` for a reviewer seeing the project for the
first time: what it is, live demo, features, keys, architecture with a
diagram, running locally, quality, how it was built, links to `docs/`.
Every command must be one actually run in this repo.
**Outcome:** README rewritten. Commands run before writing them: `npm ci`,
`npm run dev -w @onti/api` (answered `/health` on port 3100, since 3000 was
taken by another process), `npm run dev -w @onti/web`, the demo seed in its
default dry run (nothing written), `npm run verify`, `npm run build`. The
`.env.example` files could not be read (local deny rule), so the variables are
listed from `apps/web/src/lib/env.ts`, `apps/api/src/config.ts` and
`apps/api/src/push-config.ts`.

## Prompt

> Rewrite README.md for a reviewer seeing the project for the first time. Keep it scannable.
>
> Sections: what it is (one paragraph from the brief) · live demo (URL and the public demo account) · features by area · keyboard shortcuts (the ones in keys.ts, or a link to the in-app ? help) · architecture (hexagonal API, shared package, web, Supabase, Railway, Vercel, Web Push) with a small diagram · running locally (replace "To be documented": install, env files from .env.example including VITE_VAPID_PUBLIC_KEY, the two dev commands, the seed) · quality (verify, CI, CONTRACT tests) · how it was built (SDD slices, CONTRACT as source of truth, strict TDD, prompts/ as a deliverable) · links to docs/.
> Every command must be one you actually ran in this repo. Copy is in English. Commit as docs:, and ask before pushing.
>
> Save as prompts/despues/02-readme-final.md.
