# 03 — Phased workflow

**Intent:** define the whole working method up front: strict phases,
explicit approval between them, one question at a time, and what each
phase produces.
**Outcome:** Phase 1 (product brief interview) started.

## Prompt

```
You are helping me build a solo project with full AI assistance. We will work
in strict phases. After EACH phase, stop and wait for my explicit approval.
Never assume approval. Ask me at most one question at a time.

## Current phase: Product brief (no code)

Interview me ONE question at a time to write docs/product/brief.md with:
1. Problem — who suffers it and why current tools fail.
2. Persona — one named primary user with context and goals.
3. Key moments — 3 to 5 story moments with EXACT data
   (e.g. "Ana has 12 notes and 2 overdue reminders at 9:05").
   These numbers become the source of truth for design, schema and tests.
4. Anti-references — what this must NOT look or feel like (generic SaaS/AI
   look, specific competitors) and real-world references it SHOULD evoke.
5. v1 scope — in scope / explicitly out of scope.

When done, show me the full brief and stop.

## Next phases (do not start until I approve the previous one)

Phase 2 — Repo skeleton
- Monorepo: apps/web, apps/api, packages/shared, prompts/, docs/.
- Create a minimal CLAUDE.md with ONLY workflow rules:
  stop after each phase and wait for approval; verify any sub-agent claim by
  reading the file; forward concrete data explicitly to every phase;
  conventional commits; never push without asking; save prompts in prompts/.

Phase 3 — Design exploration (no app code)
- Propose 3 VERY different visual directions based on the brief (name,
  concept, palette, typography, one memorable visual signature, motion rules).
- Build one static HTML reference sheet per direction in docs/design/reference/
  using the brief's moments and exact data.
- After I pick one, write docs/design/style-guide-decisions.md with IDs
  SG1..SGn: decision | recommendation | alternative | where to see it.
- Produce tokens.css in two layers: core + brand.
- Then add UI rules to CLAUDE.md (tokens only, accent rules, motion,
  reduced motion, 44px targets, no hardcoded copy).

Phase 4 — Architecture decisions
- ADR-001 (Supabase Auth + own API), ADR-002 (stack).
- Schema (notes, reminders, maybe tags, tied to auth.users) + first migration.
- docs/CONTRACT.md: EVENT → STATE BEFORE → CHANGE → STATE AFTER matrix using
  the brief's exact numbers.
- Then add architecture rules to CLAUDE.md (sources of truth, layer
  boundaries, shared package has no IO, API validates JWT).

Phase 5 — End-to-end hello world
- Supabase project with email auth.
- Vercel page logs in → calls GET /me on Railway API → API verifies JWT.

Phase 6 — Quality gates
- Lint, format, tests, `npm run verify`, CI running it on every push.
- Write tests that assert the CONTRACT numbers before any feature.
- Add the commands rule to CLAUDE.md: verify must pass before every commit.

Phase 7 — Features
- One small vertical slice at a time, each verified against CONTRACT.md.
- Only add a CLAUDE.md rule when it prevents an error we actually hit.

Start Phase 1 now with your first question.
```
