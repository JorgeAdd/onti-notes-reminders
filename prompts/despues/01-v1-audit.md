# despues/01 — Final audit of v1

**Intent:** a read-only audit of `origin/main` against the brief (§3 key
moments, §5 v1 scope), every CONTRACT rule and matrix row, SG1–SG19 and
CLAUDE.md rules 8–19, the backlog, and production (web, API, push,
`CORS_ORIGINS`), written to `docs/audit-v1.md` with a "Must fix before the
demo" list.
**Outcome:** `docs/audit-v1.md` at `7f1ff1c`. Nothing missing; a few partial
items. Production is up and push is configured (backfill applied, Railway
variables set, key in the live bundle); `http://localhost:5173` is still in
`CORS_ORIGINS`.

## Prompt

> 26 is merged, archive slice 9 can be skipped,
>
> Final audit of v1. Read-only: change no code or docs; write only the report.
>
> Compare origin/main against:
>
> - docs/product/brief.md §5 "v1 scope" (every in-scope bullet) and §3 key moments 1–4 with their exact numbers.
> - docs/CONTRACT.md: every rule and matrix row must cite passing tests; list any marked todo or unproven.
> - docs/design/style-guide-decisions.md SG1–SG19 and CLAUDE.md rules 8–19, spot-checking the code.
> - docs/backlog.md: classify each item as blocker for v1, nice-to-have or v2.
>
> Also check production: the web and API are up, push is enabled, and CORS_ORIGINS on Railway (report whether http://localhost:5173 is still allowed).
>
> Output docs/audit-v1.md with a table: requirement · status (done / partial / missing) · evidence (file:line, test, or URL). Then add a short "Must fix before the demo" list. Commit it as docs:, show me the summary, and ask before pushing.
>
> Save as prompts/despues/01-v1-audit.md.
