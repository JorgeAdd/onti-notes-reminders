# CLAUDE.md — Rules for working with AI on this project

Every rule has a reason. Rules are added only when they prevent a real
problem; new sections (UI, architecture, commands) are added in later
phases.

## Workflow rules

1. **Work in phases. Stop after each phase and wait for explicit approval.
   Never assume approval.**
   Why: the human owns the decisions. Small, approved steps keep the AI
   from building on top of an unreviewed assumption.

2. **Ask at most one question at a time, then stop.**
   Why: batched questions get partial answers, and partial answers become
   silent assumptions.

3. **Verify every sub-agent claim by reading the file.**
   Why: a sub-agent's summary is not evidence. "Done" means the file
   exists and contains what was claimed.

4. **Forward concrete data explicitly to every phase and sub-agent.**
   Why: sub-agents do not share this conversation. Exact numbers from
   `docs/product/brief.md` (15 notes, 4 items in Today, 09:05, ...) must be
   passed in the prompt, not paraphrased or assumed.

5. **Use conventional commits** (`feat:`, `fix:`, `docs:`, `chore:`,
   `test:`, `refactor:`, `ci:`).
   Why: a readable history shows how the project evolved, phase by phase.

6. **Ask before every push. Each approval covers only that specific
   push.** Local commits do not need approval. `main` is protected: work
   happens on a branch (`<type>/<short-name>`), reaches `main` through a
   pull request, and is merged only when the "Verify and build" check is
   green.
   Why: the repository is public and part of the evaluation, and Vercel
   deploys `main` on push. The PR + required check is what guarantees that
   only green code reaches production.

7. **Save every prompt in `prompts/`** under `antes/` (before
   implementation), `durante/` (during) or `despues/` (after), numbered
   and with a short intent header.
   Why: the prompts are a deliverable, as important as the code. They
   show how the work was thought through, not just what was produced.

## UI rules

Sources of truth: `docs/design/style-guide-decisions.md` (SG1–SG19),
`apps/web/src/styles/tokens.css` and the boards in `docs/design/chosen/`.

8. **Use tokens only.** Components use the semantic layer (`--color-*`,
   `--text-*`, `--space-*`, `--motion-*`), never `--core-*` and never raw
   hex, px font sizes or durations.
   Why: light and dark mode only remap the semantic layer. A hardcoded
   value breaks one of the two themes silently.

9. **Vermilion (`--color-date`) is for the date block only.** Overdue is
   ink plus "late …", done is an ink strike, focus is an ink outline.
   Why: one accent with one meaning (SG2, SG3). The moment it marks a
   second thing, it stops meaning "today".

10. **Every animation has a reduced-motion fallback** that uses the
    `--motion-*` tokens: nothing travels, only opacity, ≤ 150 ms.
    Why: motion is part of the design (SG15), and so is the fallback
    (SG16). Animating with raw durations skips the fallback.

11. **Interactive targets are at least 44 × 44 px** (`--size-target`), and
    focus is always visible (`--focus-ring`).
    Why: the app is keyboard-first on desktop and touch-first on mobile;
    both need it (SG13).

12. **No hardcoded copy.** User-facing strings live in one messages module,
    including counts and relative times ("11 other notes", "late 15h05").
    Why: the copy is product logic. "Undated" vs "other" was a real bug
    caught in the design review; one place makes copy reviewable and
    testable.

13. **No internal IDs in the UI.** Seed IDs (N1…N15) exist only in the
    dataset, the seed and the tests.
    Why: they leaked into the design boards once (SG17).

## Architecture rules

14. **Sources of truth, in order:** `docs/CONTRACT.md` (behavior),
    `supabase/migrations/` (data), `docs/adr/` (decisions),
    `docs/design/` (UI), `docs/product/scenario-dataset.md` (scenario
    data). Code follows them; if code and a source disagree, fix the
    source first, in its own commit.
    Why: AI-generated code drifts quietly. Named sources make the drift
    visible and reviewable.

15. **Hexagonal layers in the API:** `domain` (pure rules, no IO, no
    framework imports) → `application` (use cases and ports) →
    `infrastructure` (Fastify, Postgres, JWKS, Web Push, clock). Imports
    only point inward. The CONTRACT time rules live in
    `packages/shared/src/domain` so the web (capture preview, live "late"
    labels) and the API run the same code.
    Why: the CONTRACT rules ("today", "late", snooze) must be testable
    with an injected clock and no database.

16. **Time comes from the `Clock` port.** No `new Date()` or `Date.now()`
    outside the clock adapter.
    Why: every CONTRACT row is a moment in time; tests must be able to
    stand at Wed 09:05.

17. **`packages/shared` has no IO.** Only zod schemas, types and pure
    helpers; no network, database, storage or environment access.
    Why: both apps import it; IO there leaks infrastructure into the web
    bundle and breaks the layer boundaries.

18. **The API verifies the JWT on every request** (signature via Supabase
    JWKS, `iss`, `aud`, expiry) and runs user queries as `authenticated`
    with the verified claims. Another user's resource is `404`; a missing
    or invalid token is `401`. The only exception: `POST /push-actions/*`
    accepts a signed action token instead of a JWT (ADR-004).
    Why: identity is the only thing the API trusts from the client
    (ADR-001); RLS is the second lock if a query forgets its `where`.

19. **Schema changes only through a new migration.** Never edit an applied
    migration; update `docs/db/schema.md` in the same commit.
    Why: the schema document is a deliverable and must match what is
    deployed.

## Tracking and memory rules

20. **Ask for the day's hours every night** (one question), then update
    `docs/time-log.md`: hours as reported, a summary from the day's commits
    and prompts, and the stage totals. Never estimate hours.
    Why: the time log is a deliverable and only the human knows the real
    time; logging per day is how it is actually tracked.

21. **Engram memories are shared through `.engram/`, for this project only.**
    The pre-commit hook exports with `--project onti-notes-reminders` and
    blocks chunks that look like secrets; post-merge and post-checkout
    import them. Never run `engram sync --all` here, and never commit a
    chunk the scan blocked.
    Why: the repo is public, and Engram also stores prompts and memories
    from other projects.

## Command rules

22. **`npm run verify` must pass before every commit** (format check, lint,
    typecheck, tests). The pre-commit hook runs it; CI runs it again plus
    the production build on every push. Never skip it with `--no-verify`
    unless the human asks.
    Why: the CONTRACT tests are the definition of done; a red commit means
    the product no longer does what the brief says.

23. **Change a CONTRACT rule only together with its tests**, in the same
    commit, and update `docs/CONTRACT.md` first.
    Why: the matrix numbers are the source of truth for design, schema and
    tests; drifting one of them silently breaks the other two.
