# durante/05 — Auto-deploy, branch protection, PR workflow

**Intent:** close Phase 6: CI visible, auto-deploy from GitHub, only green
code in production.
**Outcome:** Railway connected to `main` with "wait for checks" (applied via
GraphQL after the CLI silently failed); Vercel connected; first CI run
green. The AI flagged that Vercel deploys without waiting for CI → `main`
protected (PR + required "Verify and build", enforced for admins); PR #1
merged. Then the vertical slices were listed and SDD was set up (hybrid
storage, interactive).

## Prompts

> 1. Is there a PR open or where should we see the CI green?
> 2. Railway installed on github

> Done

> yes, set up branch protection and push through a PR

> That's ok, we can always keep seeding or creating more notes.
> Give me all the verticals existing, and a brief explanation of what are
> they doing

> Perfect, is it a good time to start working with sdd?

> What artifacts do we want to store in openspec?

> Oh, you meant the context files, the result from the SDD execution?

> yes, set it up in hybrid and start slice 1
