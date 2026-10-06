# 16 — Engram sync with Husky, nightly time log, Phase 4 approval

**Intent:** share AI memory (Engram) through the repo with git hooks, ask
for hours once per night, approve Phase 4 and ask for next steps.
**Outcome:** Husky hooks (pre-commit export with a secret scan,
post-merge/post-checkout import), scoped to this project because the repo
is public; nightly reminder at 21:47 (session) + CLAUDE.md rule 20.

## Prompt

> Perfect, for the time log, ask me in the night how much time I spent in
> this project.
> Also, we want to include Engram, we can use Husky to prebuild the syncs
> and to fetch the changes uploaded to the repo.
> I approve the phase 4, what are the next steps?
