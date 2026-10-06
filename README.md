# Notes & Reminders

A notes app where a note and its reminder are one object. Built for people
who capture follow-ups mid-call and need to see only what matters today.

> Status: Phase 2 — repository skeleton. The stack is decided in
> `docs/adr/` (Phase 4).

## Repository structure

```
apps/
  web/            Frontend (deployed to Vercel)
  api/            Backend API (deployed to Railway)
packages/
  shared/         Shared types and validation. No IO.
docs/
  product/        Product brief (source of truth for scenarios and data)
  design/         Design exploration, style guide, tokens
  adr/            Architecture Decision Records
  time-log.md     Time spent per stage
prompts/
  antes/          Prompts used before implementation
  durante/        Prompts used during implementation
  despues/        Prompts used after implementation
CLAUDE.md         Rules for working with AI on this project, and why
```

## Running locally

To be documented once the stack is set up (Phase 5).

## Key decisions

To be documented as ADRs are written (Phase 4).

## Deployment

| Part     | URL |
|----------|-----|
| Frontend | TBD |
| API      | TBD |
| Database | Supabase (TBD) |
